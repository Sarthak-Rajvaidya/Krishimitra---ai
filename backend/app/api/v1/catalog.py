from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.v1.common import page_args, product_out, stock_map
from app.db.session import get_db
from app.models import Product, ProductCategory, ServiceablePincode

router = APIRouter(tags=["catalog"])


@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    rows = db.scalars(select(ProductCategory).where(ProductCategory.is_active == True).order_by(ProductCategory.id)).all()  # noqa: E712
    return [{"id": c.id, "slug": c.slug, "name": c.name, "description": c.description} for c in rows]


@router.get("/products")
def list_products(q: str | None = None, category: str | None = None, crop: str | None = None,
                  min_price: int | None = Query(None, ge=0), max_price: int | None = Query(None, ge=0),
                  in_stock: bool | None = None, sort: str = "relevance", page: int = 1, size: int = 24,
                  db: Session = Depends(get_db)):
    stmt = select(Product).where(Product.is_active == True, Product.deleted_at.is_(None))  # noqa: E712
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(Product.name).like(like), func.lower(Product.crops).like(like),
                              func.lower(Product.use_tags).like(like), func.lower(Product.description).like(like)))
    if category:
        stmt = stmt.join(ProductCategory).where(ProductCategory.slug == category)
    if crop:
        stmt = stmt.where(func.lower(Product.crops).like(f"%{crop.lower()}%"))
    if min_price is not None:
        stmt = stmt.where(Product.price_paise >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price_paise <= max_price)
    order = {"price_asc": Product.price_paise.asc(), "price_desc": Product.price_paise.desc()}.get(sort, Product.name.asc())
    stmt = stmt.order_by(order)
    products = db.scalars(stmt).unique().all()
    stocks = stock_map(db, [p.id for p in products])
    items = [product_out(p, stocks.get(p.id, 0)) for p in products]
    if in_stock is not None:
        items = [i for i in items if i["in_stock"] == in_stock]
    total = len(items)
    off, size = page_args(page, size)
    return {"items": items[off:off + size], "total": total, "page": page, "size": size}


@router.get("/products/{pid}")
def get_product(pid: int, db: Session = Depends(get_db)):
    p = db.get(Product, pid)
    if not p or not p.is_active or p.deleted_at:
        raise HTTPException(404, "Product not found")
    return product_out(p, stock_map(db, [pid]).get(pid, 0))


@router.get("/serviceability/{pincode}")
def serviceability(pincode: str, db: Session = Depends(get_db)):
    sp = db.scalar(select(ServiceablePincode).where(ServiceablePincode.pincode == pincode))
    return {"pincode": pincode, "serviceable": bool(sp), "delivery_fee_paise": sp.delivery_fee_paise if sp else None}
