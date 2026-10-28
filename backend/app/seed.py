"""Demo seeding. LOCAL/DEMO ONLY.   python -m app.seed [--reset]

Everything created here is flagged is_demo=True. Prices, stock, orders and finances are FICTIONAL.
No product approvals, label claims, doses, testimonials or verified diagnoses are fabricated.
"""
import argparse
import random
import secrets
from datetime import timedelta

from sqlalchemy import delete, select, update

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base, utcnow
from app.db.session import SessionLocal, engine
from app.models import *  # noqa
from app.permissions.rbac import PERMISSIONS, ROLE_BUNDLES
from app.services import checkout as co

CATEGORIES = [("fertilizers", "Fertilizers"), ("crop-protection", "Crop Protection"), ("seeds", "Seeds"),
              ("micronutrients", "Micronutrients"), ("equipment", "Equipment & Accessories")]

# sku, name, cat, type, pack, qty, unit, price_paise, cost_paise, gst_bp, crops, tags, safety, stock, threshold
PRODUCTS = [
    ("DEMO-UREA-45", "Urea 45 kg (sample)", "fertilizers", "FERTILIZER", "45 kg", 45, "kg", 26600, 22000, 500, "", "nitrogen,basal,top-dressing", "Store dry. Keep away from children.", 220, 30),
    ("DEMO-DAP-50", "DAP 50 kg (sample)", "fertilizers", "FERTILIZER", "50 kg", 50, "kg", 135000, 118000, 500, "", "phosphorus,nitrogen,basal", "Store dry. Wash hands after handling.", 120, 20),
    ("DEMO-NPK-19", "NPK 19:19:19 water-soluble 1 kg (sample)", "fertilizers", "FERTILIZER", "1 kg", 1, "kg", 28000, 21000, 500, "", "npk,water-soluble,fertigation", "Follow label. Avoid inhalation of dust.", 300, 40),
    ("DEMO-NPK-50", "NPK complex 50 kg (sample)", "fertilizers", "FERTILIZER", "50 kg", 50, "kg", 142000, 124000, 500, "", "npk,basal", "Store dry.", 80, 15),
    ("DEMO-ZN-1", "Zinc sulphate 1 kg (sample)", "micronutrients", "MICRONUTRIENT", "1 kg", 1, "kg", 14500, 10000, 1200, "", "zinc,micronutrient", "Avoid contact with eyes.", 150, 20),
    ("DEMO-FE-1", "Ferrous sulphate 1 kg (sample)", "micronutrients", "MICRONUTRIENT", "1 kg", 1, "kg", 9500, 6500, 1200, "", "iron,micronutrient", "Avoid contact with eyes.", 140, 20),
    ("DEMO-B-250", "Boron micronutrient 250 g (sample)", "micronutrients", "MICRONUTRIENT", "250 g", 0.25, "kg", 12000, 8200, 1200, "", "boron,micronutrient", "Keep out of reach of children.", 6, 10),
    ("DEMO-FUNG-A", "Demo fungicide A 250 ml (sample)", "crop-protection", "FUNGICIDE", "250 ml", 0.25, "l", 42000, 30000, 1800, "", "fungicide,demo", "Pesticide: read the registered label before use. Use protective gear.", 90, 15),
    ("DEMO-FUNG-B", "Demo fungicide B 100 g (sample)", "crop-protection", "FUNGICIDE", "100 g", 0.1, "kg", 31000, 22000, 1800, "", "fungicide,demo", "Pesticide: read the registered label before use. Use protective gear.", 75, 15),
    ("DEMO-INSECT-A", "Demo insecticide A 250 ml (sample)", "crop-protection", "INSECTICIDE", "250 ml", 0.25, "l", 38000, 27000, 1800, "", "insecticide,demo", "Pesticide: read the registered label before use. Use protective gear.", 85, 15),
    ("DEMO-INSECT-B", "Demo insecticide B 500 ml (sample)", "crop-protection", "INSECTICIDE", "500 ml", 0.5, "l", 69000, 50000, 1800, "", "insecticide,demo", "Pesticide: read the registered label before use. Use protective gear.", 60, 10),
    ("DEMO-SEED-1", "Open-pollinated vegetable seed 100 g (sample)", "seeds", "SEED", "100 g", 0.1, "kg", 18000, 12000, 0, "", "seed,vegetable", "Treated seed must not be eaten.", 110, 20),
    ("DEMO-SPRAY-16", "Knapsack sprayer 16 L (sample)", "equipment", "ACCESSORY", "1 unit", 1, "unit", 189900, 150000, 1800, "", "sprayer,accessory", "Rinse after use; do not reuse for drinking water.", 25, 5),
]

DEMO_USERS = [("farmer@demo.local", "Demo Farmer", "FARMER"), ("admin@demo.local", "Demo Admin", "ADMIN"),
              ("finance@demo.local", "Demo Finance Head", "FINANCE"), ("developer@demo.local", "Demo Developer", "DEVELOPER"),
              ("founder@demo.local", "Demo Founder", "FOUNDER")]
EXTRA_FARMERS = [("Ramesh Patil", "Pune", "411001"), ("Sunita Jadhav", "Nashik", "422001"), ("Anil Shinde", "Solapur", "413001"),
                 ("Kavita More", "Ahmednagar", "414001"), ("Vijay Kale", "Pune", "411001"), ("Meena Pawar", "Nashik", "422001")]


def reset(db) -> None:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def seed_rbac(db) -> dict[str, Role]:
    perms = {}
    for code, desc in PERMISSIONS.items():
        p = db.scalar(select(Permission).where(Permission.code == code)) or Permission(code=code, description=desc)
        db.add(p); perms[code] = p
    db.flush()
    roles = {}
    for name, codes in ROLE_BUNDLES.items():
        r = db.scalar(select(Role).where(Role.name == RoleName(name))) or Role(name=RoleName(name))
        r.permissions = [perms[c] for c in codes]
        db.add(r); roles[name] = r
    db.flush()
    return roles


def seed(db) -> dict:
    s = get_settings()
    rnd = random.Random(42)
    roles = seed_rbac(db)
    password = s.demo_password or secrets.token_urlsafe(9)
    pw_hash = hash_password(password)

    loc = db.scalar(select(InventoryLocation).where(InventoryLocation.code == "MAIN")) or InventoryLocation(code="MAIN", name="Central Warehouse (Demo)")
    db.add(loc); db.flush()
    for pc in ("411001", "413001", "422001", "414001"):
        if not db.scalar(select(ServiceablePincode).where(ServiceablePincode.pincode == pc)):
            db.add(ServiceablePincode(pincode=pc, location_id=loc.id, delivery_fee_paise=4900))

    cats = {}
    for slug, name in CATEGORIES:
        c = db.scalar(select(ProductCategory).where(ProductCategory.slug == slug)) or ProductCategory(slug=slug, name=name, description=f"{name} (demo catalogue)")
        db.add(c); cats[slug] = c
    db.flush()
    for sku, name, cat, ptype, pack, qty, unit, price, cost, gst, crops, tags, safety, stock, thr in PRODUCTS:
        if db.scalar(select(Product).where(Product.sku == sku)):
            continue
        p = Product(sku=sku, name=name, category_id=cats[cat].id, product_type=ProductType(ptype), pack_size=pack, unit_qty=qty,
                    unit=unit, price_paise=price, cost_paise=cost, gst_rate_bp=gst, crops=crops, use_tags=tags,
                    safety_info=safety, description=f"{name}. SAMPLE demo listing: fictional price and stock.", is_demo=True)
        db.add(p); db.flush()
        db.add(ProductLabel(product_id=p.id, verified=False))
        db.add(InventoryBalance(product_id=p.id, location_id=loc.id, on_hand=stock, reorder_threshold=thr))
        db.add(InventoryTransaction(product_id=p.id, location_id=loc.id, txn_type=InvTxnType.RECEIPT, quantity_delta=stock,
                                    reference="DEMO-SEED", note="Initial demo stock", created_at=utcnow() - timedelta(days=70)))
    if not db.scalar(select(Promotion).where(Promotion.code == "WELCOME5")):
        db.add(Promotion(code="WELCOME5", description="Demo promo: 5% off orders above Rs 500", percent_off_bp=500,
                         max_discount_paise=10000, min_order_paise=50000))
    db.flush()

    users = {}
    for email, name, role in DEMO_USERS:
        u = db.scalar(select(User).where(User.email == email))
        if not u:
            u = User(email=email, full_name=name, password_hash=pw_hash, role_id=roles[role].id, is_demo=True, phone="9000000000")
            db.add(u); db.flush()
            if role == "FARMER":
                u.profile = FarmerProfile(district="Pune", state="Maharashtra", primary_crops="tomato,onion")
        users[email] = u
    farmers = [users["farmer@demo.local"]]
    addr_pin = {users["farmer@demo.local"].id: ("Pune", "411001")}
    for i, (name, dist, pin) in enumerate(EXTRA_FARMERS):
        email = f"farmer{i + 1}@demo.local"
        u = db.scalar(select(User).where(User.email == email)) or User(email=email, full_name=name, password_hash=pw_hash,
                                                                          role_id=roles["FARMER"].id, is_demo=True)
        db.add(u); db.flush()
        farmers.append(u); addr_pin[u.id] = (dist, pin)
    for f in farmers:
        if not db.scalar(select(Address).where(Address.user_id == f.id)):
            d, pin = addr_pin[f.id]
            db.add(Address(user_id=f.id, line1="Demo Village Road", village="Demo Village", district=d, state="Maharashtra", pincode=pin, is_default=True))
    db.commit()

    if not db.scalar(select(Order).where(Order.is_demo == True).limit(1)):  # noqa: E712
        _seed_orders(db, rnd, farmers, loc)

    if not db.scalar(select(ModelVersion).limit(1)):
        db.add(ModelVersion(name="crop-doctor", version="untrained-0", architecture="mobilenet_v3_small", is_active=False, is_trained=False,
                            classes=[], dataset_note="No model trained yet. Run ml/training/train.py (PlantVillage; check licence/attribution first)."))
    for key, desc, en in [("crop_doctor.enabled", "Show Crop Doctor to farmers", True), ("advisory.marathi_ui", "Marathi interface", True),
                          ("storefront.promotions", "Promo codes at checkout", True)]:
        if not db.scalar(select(FeatureFlag).where(FeatureFlag.key == key)):
            db.add(FeatureFlag(key=key, description=desc, enabled=en))

    f0 = farmers[0]
    if not db.scalar(select(CropDiagnosis).where(CropDiagnosis.user_id == f0.id)):
        d = CropDiagnosis(user_id=f0.id, image_key="demo-none", crop="tomato", crop_stage="flowering", plant_part="leaf",
                          symptoms="Brown spots on lower leaves (DEMO record)", status=DiagnosisStatus.MODEL_UNAVAILABLE, is_demo=True)
        db.add(d); db.flush()
        c = AdvisoryConversation(user_id=f0.id, title="Demo: spots on tomato leaves", diagnosis_id=d.id, is_demo=True)
        c.messages = [AdvisoryMessage(role="user", content="What could cause brown spots on tomato leaves?", created_at=utcnow()),
                      AdvisoryMessage(role="assistant", grounded=False, created_at=utcnow(),
                                      content="Verified evidence for this question was not found in the current knowledge base. Upload authorised documents in the developer console to enable grounded answers.")]
        db.add(c)
    db.commit()
    return {"password": password}


def _seed_orders(db, rnd, farmers, loc) -> None:
    products = db.scalars(select(Product).where(Product.is_demo == True)).unique().all()  # noqa: E712
    today = utcnow()
    for day in range(60, 0, -1):
        for _ in range(rnd.choice([0, 1, 1, 2, 3])):
            f = rnd.choice(farmers)
            cart = db.scalar(select(Cart).where(Cart.user_id == f.id)) or Cart(user_id=f.id)
            db.add(cart); db.flush()
            for p in rnd.sample(products, rnd.randint(1, 3)):
                db.add(CartItem(cart_id=cart.id, product_id=p.id, quantity=rnd.randint(1, 3)))
            db.commit(); db.refresh(cart)
            addr = db.scalar(select(Address).where(Address.user_id == f.id))
            mode = rnd.choice([PaymentMode.COD, PaymentMode.COD, PaymentMode.SIMULATED_ONLINE])
            try:
                o = co.place_order(db, f, addr.id, mode, "WELCOME5" if rnd.random() < 0.25 else None, None)
            except Exception:
                db.rollback()
                db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))  # e.g. out of stock: don't leave stale items
                db.commit()
                continue
            when = today - timedelta(days=day, hours=rnd.randint(0, 10))
            _backdate(db, o.id, when)
            admin = db.scalar(select(User).where(User.email == "admin@demo.local"))
            o = db.get(Order, o.id)
            roll = rnd.random()
            if day < 3:
                continue  # leave recent ones pending
            if roll < 0.08:
                co.cancel_order(db, o, admin, "Demo cancellation")
            else:
                for st in (OrderStatus.CONFIRMED, OrderStatus.PACKED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED):
                    co.change_status(db, o, st, admin)
            _backdate(db, o.id, when, include_status_tail=True)
    # monthly demo expenses
    for m in range(3):
        for cat, amt in (("Warehouse rent", 4500000), ("Salaries", 12000000), ("Logistics", 2500000), ("Marketing", 1500000)):
            db.add(Expense(category=cat, description="DEMO expense", amount_paise=amt, incurred_on=today - timedelta(days=30 * m + 2), is_demo=True))
    db.commit()


def _backdate(db, order_id: int, when, include_status_tail: bool = False) -> None:
    db.execute(update(Order).where(Order.id == order_id).values(placed_at=when))
    db.execute(update(FinancialTransaction).where(FinancialTransaction.order_id == order_id).values(occurred_at=when))
    db.execute(update(OrderStatusHistory).where(OrderStatusHistory.order_id == order_id).values(created_at=when))
    ref = db.scalar(select(Order.order_number).where(Order.id == order_id))
    db.execute(update(InventoryTransaction).where(InventoryTransaction.reference == ref).values(created_at=when))
    db.execute(update(RefundRecord).where(RefundRecord.order_id == order_id).values(created_at=when))
    db.commit()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset", action="store_true", help="DROP ALL TABLES then reseed (demo databases only!)")
    a = ap.parse_args()
    if get_settings().app_env == "production":
        raise SystemExit("Refusing to seed in production.")
    with SessionLocal() as db:
        if a.reset:
            reset(db)
        else:
            Base.metadata.create_all(engine)
        info = seed(db)
    print("\nDemo accounts (LOCAL ONLY): farmer@demo.local, admin@demo.local, finance@demo.local, developer@demo.local, founder@demo.local")
    print(f"Password for all demo accounts: {info['password']}")
    print("Set DEMO_PASSWORD in .env for a fixed value. All demo data is fictional.\n")


if __name__ == "__main__":
    main()
