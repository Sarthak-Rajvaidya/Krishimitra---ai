import pytest

# (method, path) -> roles that must succeed (2xx). All other roles must receive 403; anonymous 401.
MATRIX = {
    ("GET", "/api/v1/cart"): {"FARMER"},
    ("GET", "/api/v1/orders"): {"FARMER"},
    ("GET", "/api/v1/crop/diagnoses"): {"FARMER"},
    ("GET", "/api/v1/advisory/conversations"): {"FARMER"},
    ("GET", "/api/v1/admin/overview"): {"ADMIN", "FINANCE", "FOUNDER"},
    ("GET", "/api/v1/admin/products"): {"ADMIN"},
    ("GET", "/api/v1/admin/inventory"): {"ADMIN"},
    ("GET", "/api/v1/admin/orders"): {"ADMIN"},
    ("GET", "/api/v1/admin/customers"): {"ADMIN"},
    ("GET", "/api/v1/admin/users"): {"ADMIN"},
    ("GET", "/api/v1/admin/audit-logs"): {"ADMIN", "DEVELOPER"},
    ("GET", "/api/v1/finance/overview"): {"FINANCE", "FOUNDER"},
    ("GET", "/api/v1/finance/ledger"): {"FINANCE", "FOUNDER"},
    ("GET", "/api/v1/finance/export/ledger.csv"): {"FINANCE", "FOUNDER"},
    ("GET", "/api/v1/founder/overview"): {"FOUNDER"},
    ("GET", "/api/v1/founder/export/summary.csv"): {"FOUNDER"},
    ("GET", "/api/v1/system/overview"): {"DEVELOPER", "FOUNDER"},
    ("GET", "/api/v1/system/flags"): {"DEVELOPER", "FOUNDER"},
    ("GET", "/api/v1/system/models"): {"DEVELOPER", "FOUNDER"},
    ("GET", "/api/v1/knowledge/documents"): {"DEVELOPER", "ADMIN", "FOUNDER"},
}
ROLES = {"FARMER": "farmer@demo.local", "ADMIN": "admin@demo.local", "FINANCE": "finance@demo.local",
         "DEVELOPER": "developer@demo.local", "FOUNDER": "founder@demo.local"}


@pytest.mark.parametrize("key", list(MATRIX))
def test_matrix(key, login, anon):
    method, path = key
    assert anon.request(method, path).status_code == 401
    for role, email in ROLES.items():
        r = login(email).request(method, path)
        if role in MATRIX[key]:
            assert r.status_code == 200, f"{role} {path}: {r.status_code} {r.text[:100]}"
        else:
            assert r.status_code == 403, f"{role} should be denied {path}, got {r.status_code}"


def test_developer_cannot_see_finance_or_customers(login):
    dev = login("developer@demo.local")
    assert dev.get("/api/v1/finance/overview").status_code == 403
    assert dev.get("/api/v1/admin/customers").status_code == 403
    assert dev.get("/api/v1/admin/orders").status_code == 403


def test_finance_cannot_mutate_orders_models_or_roles(login):
    fin = login("finance@demo.local")
    assert fin.post("/api/v1/admin/orders/1/status", json={"status": "CONFIRMED"}).status_code == 403
    assert fin.put("/api/v1/admin/users/1/role", json={"role": "ADMIN"}).status_code == 403
    assert fin.put("/api/v1/system/flags", json={"key": "x.test", "enabled": True}).status_code == 403
    assert fin.post("/api/v1/system/models/1/activate").status_code == 403


def test_register_cannot_choose_role(anon):
    r = anon.post("/api/v1/auth/register", json={"email": "evil@x.com", "password": "password123", "full_name": "Evil", "role": "ADMIN"})
    assert r.status_code == 201 and r.json()["user"]["role"] == "FARMER"


def test_admin_cannot_change_own_role(login):
    a = login("admin@demo.local")
    me = a.get("/api/v1/auth/me").json()
    assert a.put(f"/api/v1/admin/users/{me['id']}/role", json={"role": "FOUNDER"}).status_code == 409


def test_sensitive_export_is_audited(login):
    f = login("founder@demo.local")
    assert f.get("/api/v1/founder/export/summary.csv").status_code == 200
    logs = login("developer@demo.local").get("/api/v1/admin/audit-logs?action=founder.export").json()
    assert logs["total"] >= 1


def test_bad_login(anon):
    assert anon.post("/api/v1/auth/login", json={"email": "farmer@demo.local", "password": "wrong-password"}).status_code == 401
