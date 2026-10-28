"""Permission catalogue and default role bundles. Deny by default.

Bundles are seeded into the DB (roles/permissions tables) and can be edited through the
explicitly authorized users.manage_roles endpoints. FOUNDER and DEVELOPER deliberately do NOT
receive blanket access: sensitive scopes are separate permission codes.
"""

PERMISSIONS: dict[str, str] = {
    # farmer
    "shop.use": "Browse products, use cart and place orders",
    "ai.use": "Use Crop Doctor and Advisory",
    # admin
    "catalog.manage": "Create/edit/deactivate products and categories",
    "inventory.manage": "Adjust stock and thresholds",
    "orders.manage": "Process and cancel orders",
    "orders.view_all": "View all orders",
    "customers.view": "View customer accounts and order history",
    "promotions.manage": "Manage promotions",
    "reports.operational": "View operational business reports",
    "users.manage_roles": "Change user roles",
    "audit.view": "View audit records",
    # finance
    "finance.view": "View finance dashboards, ledger and exports",
    "finance.write": "Record expenses and refunds",
    # founder
    "executive.view": "Executive overview",
    "executive.sensitive": "Sensitive executive reports (audited)",
    # developer
    "system.view": "Service health, models, flags, sanitized logs",
    "system.configure": "Change feature flags, model versions",
    "knowledge.manage": "Upload/ingest knowledge documents",
    "knowledge.view": "View knowledge documents and ingestion jobs",
}

ROLE_BUNDLES: dict[str, list[str]] = {
    "FARMER": ["shop.use", "ai.use"],
    "ADMIN": ["catalog.manage", "inventory.manage", "orders.manage", "orders.view_all", "customers.view",
              "promotions.manage", "reports.operational", "users.manage_roles", "audit.view",
              "knowledge.view"],
    "FINANCE": ["finance.view", "finance.write", "reports.operational"],
    "DEVELOPER": ["system.view", "system.configure", "knowledge.manage", "knowledge.view", "audit.view"],
    "FOUNDER": ["executive.view", "executive.sensitive", "reports.operational", "finance.view",
                "system.view", "knowledge.view"],
}
