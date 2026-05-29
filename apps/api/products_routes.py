"""
Products Routes — /api/v1/products/*
Read-only product catalog with filtering and pagination.
Phase 2: A-002 (context manager), M-002 (constants)
"""
import os
import math
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.auth import get_db

router = APIRouter(prefix="/api/v1/products", tags=["products"])

# ─── Magic number constants (M-002) ────────────────────────────────────────────
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 500

# ─── Models ───────────────────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    brand: str
    category: str
    model_std: str
    model_raw: Optional[str] = None
    product_uuid: Optional[str] = None

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("")
def list_products(
    brand: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    """
    List standardized products with optional brand/category/model filter.
    Returns paginated product list.
    """
    with get_db() as db:
        cur = db.cursor()

        conditions = ["1=1"]
        params = []
        if brand:
            conditions.append("brand = %s")
            params.append(brand.upper())
        if category:
            conditions.append("category = %s")
            params.append(category.upper())
        if model:
            conditions.append("model_std LIKE %s")
            params.append(f"%{model}%")

        where_clause = " AND ".join(conditions)

        cur.execute(f"SELECT COUNT(*) as total FROM std_products WHERE {where_clause}", params)
        total = cur.fetchone()["total"]

        offset = (page - 1) * page_size
        cur.execute(f"""
            SELECT product_uuid,
                   CONVERT(BINARY(CONVERT(brand USING latin1)) USING utf8mb4) AS brand,
                   CONVERT(BINARY(CONVERT(category USING latin1)) USING utf8mb4) AS category,
                   model_std,
                   CONVERT(BINARY(CONVERT(model_raw USING latin1)) USING utf8mb4) AS model_raw,
                   horsepower, volume_l, capacity_kg, screen_size,
                   subsidy_code, created_at
            FROM std_products
            WHERE {where_clause}
            ORDER BY brand, category
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])

        rows = cur.fetchall()
        cur.close()

    return {
        "products": rows,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total else 0,
    }


@router.get("/{product_id}")
def get_product(product_id: int):
    """Get a single product by ID."""
    with get_db() as db:
        cur = db.cursor()
        cur.execute("""
            SELECT id, product_uuid, brand, category, model_std, model_raw,
                   horsepower, volume_l, capacity_kg, screen_size,
                   subsidy_code, created_at
            FROM std_products WHERE id=%s
        """, (product_id,))
        row = cur.fetchone()
        cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="商品不存在")
    return row


@router.post("")
def create_product(payload: ProductCreate):
    """
    Create a new standardized product entry.
    Auto-generates UUID if not provided.
    """
    import uuid
    with get_db() as db:
        cur = db.cursor()
        uuid_val = payload.product_uuid or str(uuid.uuid4())
        try:
            cur.execute("""
                INSERT INTO std_products (product_uuid, brand, category, model_std, model_raw)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                uuid_val,
                payload.brand.upper(),
                payload.category.upper(),
                payload.model_std,
                payload.model_raw,
            ))
            new_id = cur.lastrowid
            db.commit()
            cur.execute("SELECT * FROM std_products WHERE id=%s", (new_id,))
            result = cur.fetchone()
            cur.close()
            return {"id": new_id, **result}, 201
        except Exception as e:
            db.rollback()
            cur.close()
            raise HTTPException(status_code=500, detail="创建产品失败，请联系管理员")
