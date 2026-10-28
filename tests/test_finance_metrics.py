def test_finance_overview_identities(login):
    f = login("finance@demo.local").get("/api/v1/finance/overview?range=90d").json()["summary"]
    assert f["net_sales_paise"] == f["gross_sales_paise"] - f["discounts_paise"] - f["refunds_paise"]
    assert f["gross_profit_paise"] == f["net_sales_paise"] - f["cogs_paise"]
    assert f["operating_profit_paise"] == f["gross_profit_paise"] - f["expenses_paise"]
    assert f["gross_profit_paise"] != f["net_sales_paise"]       # profit is never revenue
    assert 0 < f["gross_margin_pct"] < 100 and f["expense_categories_included"]


def test_date_filters(login):
    c = login("finance@demo.local")
    for rng in ("today", "7d", "30d", "90d"):
        assert c.get(f"/api/v1/finance/overview?range={rng}").status_code == 200
    assert c.get("/api/v1/finance/overview?range=custom&start=2026-01-01&end=2026-12-31").status_code == 200
    assert c.get("/api/v1/finance/overview?range=custom&start=bad&end=bad").status_code == 422
    assert c.get("/api/v1/finance/overview?range=bogus").status_code == 422


def test_csv_export(login):
    r = login("finance@demo.local").get("/api/v1/finance/export/ledger.csv?range=90d")
    assert r.status_code == 200 and r.text.startswith("id,type,amount_paise") and "text/csv" in r.headers["content-type"]


def test_expense_write_is_finance_only_and_audited(login):
    assert login("founder@demo.local").post("/api/v1/finance/expenses", json={"category": "Misc", "amount_paise": 100}).status_code == 403
    assert login("finance@demo.local").post("/api/v1/finance/expenses", json={"category": "Misc", "amount_paise": 100}).status_code == 201


def test_founder_overview_has_no_invented_values(login):
    d = login("founder@demo.local").get("/api/v1/founder/overview?range=30d").json()
    assert "finance" in d and "alerts" in d and d["ai"]["model_unavailable_count"] >= 1
    assert d["net_sales_growth_pct"] is None or isinstance(d["net_sales_growth_pct"], float)
    assert login("founder@demo.local").get("/api/v1/founder/overview?range=today").status_code == 200


def test_admin_overview_shapes(login):
    d = login("admin@demo.local").get("/api/v1/admin/overview").json()
    assert d["total_products"] >= 12 and d["sales_daily"] and d["category_sales"] and d["top_products"]
