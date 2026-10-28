import secrets
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.audit import audit
from app.db.base import utcnow
from app.models import (Address, Cart, FinancialTransaction, FinTxnType, InventoryBalance, InventoryLocation,
                        InventoryTransaction, InvTxnType, Order, OrderItem, OrderStatus, OrderStatusHistory,
                        PaymentMode, PaymentRecord, PaymentStatus, Product, Promotion, RefundRecord,
                        Recommendation, ServiceablePincode, User)
from app.services.pricing import Line, Totals, compute_totals, included_tax

CANCELLABLE = {OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PACKED}
NEXT_STATUS = {
    OrderStatus.PLACED: OrderStatus.CONFIRMED,
    OrderStatus.CONFIRMED: OrderStatus.PACKED,
    OrderStatus.PACKED: OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.OUT_FOR_DELIVERY: OrderStatus.DELIVERED,
}


def default_location(db: Session) -> InventoryLocation:
    loc = db.scalar(select(InventoryLocation).where(InventoryLocation.is_active == True).order_by(InventoryLocation.id))  # noqa: E712
    if not loc:
        raise HTTPException(503, "No active warehouse configured")
    return loc


def serviceability(db: Session, pincode: str) -> ServiceablePincode:
    sp = db.scalar(select(ServiceablePincode).where(ServiceablePincode.pincode == pincode))
    if not sp:
        raise HTTPException(422, f"Delivery is not available to pincode {pincode} yet")
    return sp


def price_cart(db: Session, cart: Cart, promo_code: str | None, delivery_fee: int) -> Totals:
    lines = []
    for it in cart.items:
        p = it.product
        if not p.is_active or p.deleted_at:
            raise HTTPException(409, f"'{p.name}' is no longer available")
        lines.append(Line(p, it.quantity))
    promo = None
    if promo_code:
        promo = db.scalar(select(Promotion).where(Promotion.code == promo_code.upper()))
    return compute_totals(lines, promo, delivery_fee)


def _new_order_number() -> str:
    return f"KS-{utcnow():%Y%m%d}-{secrets.token_hex(3).upper()}"


def place_order(db: Session, user: User, address_id: int, payment_mode: PaymentMode,
                promo_code: str | None, idempotency_key: str | None,
                share_advisory: bool = False) -> Order:
    if idempotency_key:
        existing = db.scalar(select(Order).where(Order.user_id == user.id, Order.idempotency_key == idempotency_key))
        if existing:
            return existing

    addr = db.get(Address, address_id)
    if not addr or addr.user_id != user.id:
        raise HTTPException(404, "Address not found")
    sp = serviceability(db, addr.pincode)
    loc = db.get(InventoryLocation, sp.location_id) or default_location(db)

    cart = db.scalar(select(Cart).where(Cart.user_id == user.id))
    if not cart or not cart.items:
        raise HTTPException(400, "Cart is empty")

    totals = price_cart(db, cart, promo_code, sp.delivery_fee_paise)
    now = utcnow()

    try:
        # Atomic conditional stock decrement; ordered by product_id to avoid deadlocks.
        for ln in sorted(totals.lines, key=lambda l: l.product.id):
            res = db.execute(
                update(InventoryBalance)
                .where(InventoryBalance.product_id == ln.product.id,
                       InventoryBalance.location_id == loc.id,
                       InventoryBalance.on_hand - InventoryBalance.reserved >= ln.qty)
                .values(on_hand=InventoryBalance.on_hand - ln.qty))
            if res.rowcount != 1:
                db.rollback()
                raise HTTPException(409, f"Insufficient stock for '{ln.product.name}'")

        order = Order(
            order_number=_new_order_number(), user_id=user.id, idempotency_key=idempotency_key,
            status=OrderStatus.PLACED, payment_mode=payment_mode,
            subtotal_paise=totals.subtotal, discount_paise=totals.discount,
            delivery_fee_paise=totals.delivery_fee, total_paise=totals.total, tax_paise=totals.tax,
            promo_code=totals.promo_code, ship_name=user.full_name, ship_phone=user.phone,
            ship_line1=addr.line1, ship_district=addr.district, ship_state=addr.state,
            ship_pincode=addr.pincode, location_id=loc.id, placed_at=now, is_demo=user.is_demo)
        for ln in totals.lines:
            order.items.append(OrderItem(
                product_id=ln.product.id, name_snapshot=ln.product.name, sku_snapshot=ln.product.sku,
                quantity=ln.qty, unit_price_paise=ln.product.price_paise, unit_cost_paise=ln.product.cost_paise,
                gst_rate_bp=ln.product.gst_rate_bp, line_total_paise=ln.line_total))
        order.history.append(OrderStatusHistory(status=OrderStatus.PLACED, note="Order placed",
                                                actor_user_id=user.id, created_at=now))

        rec_ids = [it.recommendation_id for it in cart.items if it.recommendation_id]
        recs = db.scalars(select(Recommendation).where(Recommendation.id.in_(rec_ids),
                                                       Recommendation.user_id == user.id)).all() if rec_ids else []
        if share_advisory and recs:  # advisory linkage stored only with consent
            order.advisory_ref = {"recommendation_ids": [r.id for r in recs],
                                  "diagnosis_ids": sorted({r.diagnosis_id for r in recs if r.diagnosis_id})}
        db.add(order)
        db.flush()
        if share_advisory:
            for r in recs:
                r.order_id = order.id

        pay_status = PaymentStatus.PENDING if payment_mode == PaymentMode.COD else PaymentStatus.SIMULATED_PAID
        db.add(PaymentRecord(order_id=order.id, mode=payment_mode, status=pay_status,
                             amount_paise=totals.total, is_simulated=True))
        for ln in totals.lines:
            db.add(InventoryTransaction(product_id=ln.product.id, location_id=loc.id, txn_type=InvTxnType.SALE,
                                        quantity_delta=-ln.qty, reference=order.order_number,
                                        actor_user_id=user.id, created_at=now))
        _post_sale_ledger(db, order, totals, now)
        for it in list(cart.items):
            db.delete(it)
        audit(db, user.id, "order.place", "order", order.id, {"total_paise": order.total_paise})
        db.commit()
    except IntegrityError:
        db.rollback()
        if idempotency_key:
            existing = db.scalar(select(Order).where(Order.user_id == user.id, Order.idempotency_key == idempotency_key))
            if existing:
                return existing
        raise HTTPException(409, "Could not place order; please retry")
    return order


def _post_sale_ledger(db: Session, order: Order, totals: Totals, now: datetime) -> None:
    def add(t: FinTxnType, amt: int):
        if amt:
            db.add(FinancialTransaction(txn_type=t, amount_paise=amt, order_id=order.id,
                                        reference=order.order_number, is_demo=order.is_demo, occurred_at=now))
    add(FinTxnType.SALE, totals.subtotal - totals.tax_gross)
    add(FinTxnType.DISCOUNT, totals.discount - (totals.tax_gross - totals.tax))
    add(FinTxnType.GST_COLLECTED, totals.tax)
    add(FinTxnType.DELIVERY_FEE, totals.delivery_fee)
    add(FinTxnType.COGS, sum(l.product.cost_paise * l.qty for l in totals.lines))


def change_status(db: Session, order: Order, new_status: OrderStatus, actor: User, note: str | None = None) -> Order:
    if new_status == OrderStatus.CANCELLED:
        return cancel_order(db, order, actor, note)
    if NEXT_STATUS.get(order.status) != new_status:
        raise HTTPException(409, f"Cannot move order from {order.status.value} to {new_status.value}")
    now = utcnow()
    order.status = new_status
    order.history.append(OrderStatusHistory(status=new_status, note=note, actor_user_id=actor.id, created_at=now))
    if new_status == OrderStatus.DELIVERED:
        for p in db.scalars(select(PaymentRecord).where(PaymentRecord.order_id == order.id)):
            if p.status == PaymentStatus.PENDING:
                p.status = PaymentStatus.COLLECTED
    audit(db, actor.id, "order.status", "order", order.id, {"to": new_status.value})
    db.commit()
    return order


def cancel_order(db: Session, order: Order, actor: User, note: str | None = None) -> Order:
    if order.status not in CANCELLABLE:
        raise HTTPException(409, f"Order in status {order.status.value} cannot be cancelled")
    now = utcnow()
    tax_gross = sum(included_tax(i.line_total_paise, i.gst_rate_bp) for i in order.items)
    disc_tax = tax_gross - order.tax_paise
    for it in order.items:
        db.execute(update(InventoryBalance)
                   .where(InventoryBalance.product_id == it.product_id, InventoryBalance.location_id == order.location_id)
                   .values(on_hand=InventoryBalance.on_hand + it.quantity))
        db.add(InventoryTransaction(product_id=it.product_id, location_id=order.location_id,
                                    txn_type=InvTxnType.CANCEL_RESTOCK, quantity_delta=it.quantity,
                                    reference=order.order_number, actor_user_id=actor.id, created_at=now))

    def add(t: FinTxnType, amt: int):
        if amt:
            db.add(FinancialTransaction(txn_type=t, amount_paise=amt, order_id=order.id,
                                        reference=order.order_number, is_demo=order.is_demo, occurred_at=now))
    # Reverse revenue recognised at placement (net of discount), GST, delivery fee and COGS.
    add(FinTxnType.REFUND, (order.subtotal_paise - tax_gross) - (order.discount_paise - disc_tax))
    add(FinTxnType.GST_REFUNDED, order.tax_paise)
    add(FinTxnType.DELIVERY_FEE_REFUNDED, order.delivery_fee_paise)
    add(FinTxnType.COGS_REVERSAL, sum(i.unit_cost_paise * i.quantity for i in order.items))

    pays = db.scalars(select(PaymentRecord).where(PaymentRecord.order_id == order.id)).all()
    if any(p.status in (PaymentStatus.SIMULATED_PAID, PaymentStatus.COLLECTED) for p in pays):
        db.add(RefundRecord(order_id=order.id, amount_paise=order.total_paise,
                            reason=note or "Order cancelled", actor_user_id=actor.id))
    order.status = OrderStatus.CANCELLED
    order.history.append(OrderStatusHistory(status=OrderStatus.CANCELLED, note=note, actor_user_id=actor.id, created_at=now))
    audit(db, actor.id, "order.cancel", "order", order.id)
    db.commit()
    return order
