"""
Suppliers CRUD Routes — /api/v1/suppliers/*
Requires JWT authentication (httpOnly cookie).
"""
import os
import math
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from pydantic import Field

router = APIRouter(prefix="/api/v1/suppliers", tags=["suppliers"])

# ─── DB helper ────────────────────────────────────────────────────────────────
def get_db():
    import pymysql
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST", "mysql"),
        port=int(os.getenv("MYSQL_PORT", 3306)),
        user="valuecube",
        password=os.getenv("MYSQL_PASSWORD", "Vc@2026#db"),
        database="valuecube",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        charset="utf8mb4",
    )

# ─── Auth dependency (reuse from auth_routes) ─────────────────────────────────
from jose import jwt

SECRET_KEY = os.getenv("JWT_SECRET", "vc2-super-secret-key-change-in-production-2026")
ALGORITHM = "HS256"

def get_current_user(access_token: Optional[str] = None):
    """Decode JWT from access_token cookie. Raises 401 on failure."""
    # FastAPI cookies: accessed via Request object in real middleware
    # Here we accept token as header override for programmatic callers
    if not access_token:
        raise HTTPException(status_code=401, detail="未登录")
    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        role = payload.get("role")
        if not username:
            raise HTTPException(status_code=401, detail="令牌无效")
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT id, username, role FROM auth_users WHERE username=%s", (username,))
        row = cur.fetchone()
        cur.close()
        db.close()
        if not row:
            raise HTTPException(status_code=401, detail="用户不存在")
        return row
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="令牌已过期")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="令牌无效")

# ─── Pydantic models ──────────────────────────────────────────────────────────
class SupplierCreate(BaseModel):
    supplier_code: str = Field(..., max_length=64)
    supplier_name: str = Field(..., max_length=128)
    source_file: Optional[str] = None
    file_date: Optional[str] = None

class SupplierUpdate(BaseModel):
    supplier_name: Optional[str] = Field(None, max_length=128)
    source_file: Optional[str] = None
    file_date: Optional[str] = None
    freshness: Optional[str] = None

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("")
def list_suppliers(
    brand: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    freshness: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    """
    List suppliers with optional brand/category/freshness filter.
    Returns paginated supplier list.
    """
    db = get_db()
    cur = db.cursor()

    conditions = ["1=1"]
    params = []

    if brand:
        conditions.append("s.supplier_code IN (SELECT DISTINCT supplier_code FROM supplier_quotes WHERE brand=%s)")
        params.append(brand.upper())
    if category:
        conditions.append("s.id IN (SELECT DISTINCT supplier_id FROM supplier_quotes WHERE category=%s)")
        params.append(category.upper())
    if freshness:
        conditions.append("s.freshness=%s")
        params.append(freshness)

    where_clause = " AND ".join(conditions)

    # Total count
    cur.execute(f"SELECT COUNT(*) as total FROM suppliers s WHERE {where_clause}", params)
    total = cur.fetchone()["total"]

    offset = (page - 1) * page_size
    cur.execute(f"""
        SELECT s.id, s.supplier_code, s.supplier_name, s.source_file, s.file_date,
               s.data_quality_score, s.parse_success_rate, s.price_tier,
               s.freshness, s.total_records, s.total_brands, s.avg_price,
               s.created_at, s.updated_at
        FROM suppliers s
        WHERE {where_clause}
        ORDER BY s.supplier_name
        LIMIT %s OFFSET %s
    """, params + [page_size, offset])

    rows = cur.fetchall()
    cur.close()
    db.close()

    return {
        "suppliers": rows,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total else 0,
    }


@router.get("/{supplier_id}")
def get_supplier(supplier_id: int):
    """Get a single supplier by ID."""
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        SELECT id, supplier_code, supplier_name, source_file, file_date,
               data_quality_score, parse_success_rate, price_tier,
               freshness, total_records, total_brands, avg_price,
               created_at, updated_at
        FROM suppliers WHERE id=%s
    """, (supplier_id,))
    row = cur.fetchone()
    cur.close()
    db.close()
    if not row:
        raise HTTPException(status_code=404, detail="供应商不存在")
    return row


@router.post("")
def create_supplier(payload: SupplierCreate):
    """
    Create a new supplier.
    Note: supplier_code must be unique.
    """
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO suppliers (supplier_code, supplier_name, source_file, file_date)
            VALUES (%s, %s, %s, %s)
        """, (
            payload.supplier_code,
            payload.supplier_name,
            payload.source_file,
            payload.file_date,
        ))
        new_id = cur.lastrowid
        db.commit()
        cur.execute("SELECT * FROM suppliers WHERE id=%s", (new_id,))
        result = cur.fetchone()
        cur.close()
        db.close()
        return {"id": new_id, **result}, 201
    except Exception as e:
        db.rollback()
        cur.close()
        db.close()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{supplier_id}")
def update_supplier(supplier_id: int, payload: SupplierUpdate):
    """Update supplier fields."""
    fields = []
    values = []
    if payload.supplier_name is not None:
        fields.append("supplier_name=%s"); values.append(payload.supplier_name)
    if payload.source_file is not None:
        fields.append("source_file=%s"); values.append(payload.source_file)
    if payload.file_date is not None:
        fields.append("file_date=%s"); values.append(payload.file_date)
    if payload.freshness is not None:
        fields.append("freshness=%s"); values.append(payload.freshness)

    if not fields:
        raise HTTPException(status_code=400, detail="没有需要更新的字段")

    values.append(supplier_id)
    db = get_db()
    cur = db.cursor()
    cur.execute(f"UPDATE suppliers SET {', '.join(fields)} WHERE id=%s", values)
    db.commit()
    if cur.rowcount == 0:
        cur.close(); db.close()
        raise HTTPException(status_code=404, detail="供应商不存在")
    cur.execute("SELECT * FROM suppliers WHERE id=%s", (supplier_id,))
    result = cur.fetchone()
    cur.close()
    db.close()
    return result


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int):
    """Delete a supplier (soft delete not implemented)."""
    db = get_db()
    cur = db.cursor()
    cur.execute("DELETE FROM suppliers WHERE id=%s", (supplier_id,))
    db.commit()
    affected = cur.rowcount
    cur.close()
    db.close()
    if affected == 0:
        raise HTTPException(status_code=404, detail="供应商不存在")
    return {"message": "供应商已删除", "id": supplier_id}
