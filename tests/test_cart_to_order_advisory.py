from sqlalchemy import select

from app.models import Order, Product, Recommendation


def test_recommendation_to_cart_tracks_and_consent_controls_order_metadata(login, db):
    import io
    from PIL import Image
    c = login("farmer@demo.local")
    b = io.BytesIO(); Image.new("RGB", (32, 32)).save(b, "JPEG")
    did = c.post("/api/v1/crop/diagnose", files={"image": ("a.jpg", b.getvalue(), "image/jpeg")}, data={"crop": "maize", "symptoms": "yellowing between veins"}).json()["id"]
    cands = c.post(f"/api/v1/recommendations/diagnosis/{did}").json()["candidates"]
    assert cands
    pick = next(x for x in cands if "Ferrous" in x["name"])   # well-stocked demo SKU
    rid, pid = pick["recommendation_id"], pick["product_id"]
    assert c.post(f"/api/v1/recommendations/{rid}/viewed").status_code == 200
    assert c.post("/api/v1/cart/items", json={"product_id": pid, "quantity": 1, "recommendation_id": rid}).status_code == 200
    addr = c.get("/api/v1/addresses").json()[0]["id"]
    o = c.post("/api/v1/checkout", json={"address_id": addr, "payment_mode": "COD", "share_advisory": False}).json()
    row = db.get(Order, o["id"])
    assert row.advisory_ref is None                               # no consent -> no linkage stored
    rec = db.get(Recommendation, rid); db.refresh(rec)
    assert rec.viewed_at and rec.added_to_cart_at and rec.order_id is None
    assert c.post(f"/api/v1/recommendations/{rid}/feedback", json={"helpful": True, "outcome": "improved"}).status_code == 201


def test_other_farmer_cannot_use_my_recommendation(login, db):
    rid = db.scalar(select(Recommendation.id).limit(1))
    pid = db.scalar(select(Product.id).limit(1))
    assert login("farmer2@demo.local").post("/api/v1/cart/items", json={"product_id": pid, "quantity": 1, "recommendation_id": rid}).status_code == 404


def test_developer_flag_change_is_audited(login):
    d = login("developer@demo.local")
    assert d.put("/api/v1/system/flags", json={"key": "crop_doctor.enabled", "enabled": False}).status_code == 200
    d.put("/api/v1/system/flags", json={"key": "crop_doctor.enabled", "enabled": True})
    logs = d.get("/api/v1/admin/audit-logs?action=flag.set").json()
    assert logs["total"] >= 2 and logs["items"][0]["actor"] is not None


def test_cannot_activate_untrained_model(login):
    d = login("developer@demo.local")
    mid = d.get("/api/v1/system/models").json()[0]["id"]
    assert d.post(f"/api/v1/system/models/{mid}/activate").status_code == 409


def test_health_and_ready_are_public_and_leak_nothing(anon):
    assert anon.get("/api/v1/health").json()["status"] == "ok"
    r = anon.get("/api/v1/ready").json()
    assert r["ready"] is True and "url" not in str(r).lower()
