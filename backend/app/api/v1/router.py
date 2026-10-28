from fastapi import APIRouter

from app.api.v1 import admin, advisory, auth, catalog, crop, finance, founder, shop, system

api_router = APIRouter(prefix="/api/v1")
for m in (auth, catalog, shop, admin, finance, founder, crop, advisory, system):
    api_router.include_router(m.router)
