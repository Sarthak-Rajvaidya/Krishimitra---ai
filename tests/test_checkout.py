import threading

from sqlalchemy import select

from app.models import (Address, Cart, CartItem, FinancialTransaction, InventoryBalance, Order, PaymentMode, Product, User)
from app.services import checkout as co
from app.services.pricing import Line, compute_totals, included_tax


def _pid(db, sku):
    return db.scalar(select(Product).where(Product.sku == sku)).id


def _stock(db, pid):
    db.expire_all()
    b = db.scalar(select(InventoryBalance).where(InventoryBalance.product_id == pid))
    return b.on_hand


def _addr(c):
    r = c.get("/api/v1/addresses").json()
    return r[0]["id"]


def test_gst_math():
    assert included_tax(10500, 500) == 500
    assert included_tax(11800, 1800) == 1800
    assert included_tax(10000, 0) == 0


def test_browse_search_filter(login):
    c = login("farmer@demo.local")
    r = c.get("/api/v1/products?size=50").json()
    assert r["total"] >= 12 and all("data_note" in p for p in r["items"])
    assert all(p["price_paise"] > 0 for p in r["items"])
    assert c.get("/api/v1/products?q=zinc").json()["total"] == 1
    assert all(p["category"] == "crop-protection" for p in c.get("/api/v1/products?category=crop-protection").json()["items"])
    asc = [p["price_paise"] for p in c.get("/api/v1/products?sort=price_asc&size=50").json()["items"]]
    assert asc == sorted(asc)


def test_full_checkout_updates_stock_and_ledger(login, db):
    c = login("farmer1@demo.local")
    pid = _pid(db, "DEMO-ZN-1")
    before = _stock(db, pid)
    assert c.post("/api/v1/cart/items", json={"product_id": pid, "quantity": 2}).status_code == 200
    cart = c.get("/api/v1/cart?pincode=411001").json()
    assert cart["subtotal_paise"] == 2 * 14500 and cart["delivery_fee_paise"] == 4900
    r = c.post("/api/v1/checkout", json={"address_id": _addr(c), "payment_mode": "COD"}, headers={"Idempotency-Key": "k-test-1"})
    assert r.status_code == 201, r.text
    o = r.json()
    assert o["total_paise"] == 2 * 14500 + 4900 and o["status"] == "PLACED" and o["order_number"].startswith("KS-")
    assert _stock(db, pid) == before - 2
    # idempotent replay returns same order, no extra stock decrement
    c.post("/api/v1/cart/items", json={"product_id": pid, "quantity": 1})
    r2 = c.post("/api/v1/checkout", json={"address_id": _addr(c), "payment_mode": "COD"}, headers={"Idempotency-Key": "k-test-1"})
    assert r2.json()["order_number"] == o["order_number"] and _stock(db, pid) == before - 2
    types = {t.txn_type.value for t in db.scalars(select(FinancialTransaction).where(FinancialTransaction.reference == o["order_number"]))}
    assert {"SALE", "GST_COLLECTED", "COGS", "DELIVERY_FEE"} <= types


def test_server_ignores_client_prices(login, db):
    c = login("farmer2@demo.local")
    pid = _pid(db, "DEMO-FE-1")
    r = c.post("/api/v1/cart/items", json={"product_id": pid, "quantity": 1, "price_paise": 1})
    assert r.json()["items"][0]["unit_price_paise"] == 9500


def test_insufficient_stock_rejected(login, db):
    c = login("farmer3@demo.local")
    pid = _pid(db, "DEMO-B-250")  # low stock product
    stock = _stock(db, pid)
    c.post("/api/v1/cart/items", json={"product_id": pid, "quantity": 100})
    r = c.post("/api/v1/checkout", json={"address_id": _addr(c), "payment_mode": "COD"})
    assert r.status_code == 409 and _stock(db, pid) == stock
    for it in c.get("/api/v1/cart").json()["items"]:
        c.delete(f"/api/v1/cart/items/{it['id']}")


def test_unserviceable_pincode_blocked(login, db):
    c = login("farmer4@demo.local")
    a = c.post("/api/v1/addresses", json={"line1": "Somewhere 1", "district": "Nowhere", "state": "X", "pincode": "999999"}).json()
    c.post("/api/v1/cart/items", json={"product_id": _pid(db, "DEMO-FE-1"), "quantity": 1})
    r = c.post("/api/v1/checkout", json={"address_id": a["id"], "payment_mode": "COD"})
    assert r.status_code == 422
    for it in c.get("/api/v1/cart").json()["items"]:
        c.delete(f"/api/v1/cart/items/{it['id']}")


def test_farmer_cannot_read_other_farmers_order(login, db):
    a, b = login("farmer@demo.local"), login("farmer1@demo.local")
    oid = db.scalar(select(Order.id).where(Order.user_id == db.scalar(select(User.id).where(User.email == "farmer@demo.local"))))
    if oid is None:  # ensure farmer has at least one order
        a.post("/api/v1/cart/items", json={"product_id": _pid(db, "DEMO-FE-1"), "quantity": 1})
        oid = a.post("/api/v1/checkout", json={"address_id": _addr(a), "payment_mode": "COD"}).json()["id"]
    assert a.get(f"/api/v1/orders/{oid}").status_code == 200
    assert b.get(f"/api/v1/orders/{oid}").status_code == 404
    assert b.post(f"/api/v1/orders/{oid}/cancel").status_code == 404


def test_concurrent_checkout_never_oversells(db):
    from app.core.security import hash_password
    from app.db.session import SessionLocal
    from app.models import Role, RoleName
    pid = _pid(db, "DEMO-SPRAY-16")
    bal = db.scalar(select(InventoryBalance).where(InventoryBalance.product_id == pid))
    bal.on_hand = 3
    db.commit()
    role = db.scalar(select(Role).where(Role.name == RoleName.FARMER))
    ids = []
    for i in range(8):
        u = User(email=f"race{i}@demo.local", full_name=f"Race {i}", password_hash=hash_password("x" * 10), role_id=role.id, is_demo=True)
        db.add(u); db.flush()
        db.add(Address(user_id=u.id, line1="Road", district="Pune", state="MH", pincode="411001"))
        cart = Cart(user_id=u.id); db.add(cart); db.flush()
        db.add(CartItem(cart_id=cart.id, product_id=pid, quantity=1))
        ids.append(u.id)
    db.commit()
    results = []

    def worker(uid):
        with SessionLocal() as s:
            u = s.get(User, uid)
            a = s.scalar(select(Address).where(Address.user_id == uid))
            try:
                co.place_order(s, u, a.id, PaymentMode.COD, None, None)
                results.append("ok")
            except Exception as ex:
                results.append(type(ex).__name__)
    ts = [threading.Thread(target=worker, args=(i,)) for i in ids]
    [t.start() for t in ts]; [t.join() for t in ts]
    ok = results.count("ok")
    # Core invariant: never oversell. On PostgreSQL exactly 3 succeed; SQLite may reject some writers with "database is locked".
    assert ok >= 1 and ok <= 3 and _stock(db, pid) == 3 - ok, results
    assert _stock(db, pid) >= 0


def test_admin_processes_and_cancels_order_with_restock(login, db):
    f, a = login("farmer5@demo.local"), login("admin@demo.local")
    pid = _pid(db, "DEMO-UREA-45")
    before = _stock(db, pid)
    f.post("/api/v1/cart/items", json={"product_id": pid, "quantity": 1})
    o = f.post("/api/v1/checkout", json={"address_id": _addr(f), "payment_mode": "SIMULATED_ONLINE"}).json()
    assert "Simulated" in o["payment_note"]
    assert a.post(f"/api/v1/admin/orders/{o['id']}/status", json={"status": "DELIVERED"}).status_code == 409  # cannot skip
    assert a.post(f"/api/v1/admin/orders/{o['id']}/status", json={"status": "CONFIRMED"}).status_code == 200
    r = a.post(f"/api/v1/admin/orders/{o['id']}/status", json={"status": "CANCELLED", "note": "test"})
    assert r.json()["status"] == "CANCELLED" and _stock(db, pid) == before
    net = {}
    for t in db.scalars(select(FinancialTransaction).where(FinancialTransaction.order_id == o["id"])):
        net[t.txn_type.value] = net.get(t.txn_type.value, 0) + t.amount_paise
    assert net["SALE"] - net.get("DISCOUNT", 0) - net["REFUND"] == 0     # revenue fully reversed
    assert net["COGS"] - net["COGS_REVERSAL"] == 0


def test_admin_updates_product(login, db):
    a = login("admin@demo.local")
    items = a.get("/api/v1/admin/products").json()["items"]
    p = next(i for i in items if i["sku"] == "DEMO-FE-1")
    body = {"sku": p["sku"], "name": p["name"], "category_slug": p["category"], "product_type": p["product_type"], "pack_size": p["pack_size"],
            "price_paise": 9900, "cost_paise": 6500, "gst_rate_bp": 1200, "unit_qty": 1, "unit": "kg"}
    assert a.put(f"/api/v1/admin/products/{p['id']}", json=body).status_code == 200
    assert login("farmer@demo.local").get(f"/api/v1/products/{p['id']}").json()["price_paise"] == 9900
    body["price_paise"] = 9500
    a.put(f"/api/v1/admin/products/{p['id']}", json=body)
    assert a.post("/api/v1/admin/inventory/adjust", json={"product_id": p["id"], "delta": -10**6, "reason": "too much"}).status_code == 409
