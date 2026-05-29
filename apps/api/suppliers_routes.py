"""
Suppliers CRUD Routes — /api/v1/suppliers/*
Requires JWT authentication (httpOnly cookie).
Phase 2 fixes: A-001 (shared auth), A-002 (context manager), M-002 (constants), M-007 (duplicate import)
"""
import os
import math
import secrets
import bcrypt
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request, Depends
from pydantic import BaseModel
from pydantic import Field

from app.auth import require_auth, get_db

from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/v1/suppliers", tags=["Suppliers"])

# ─── Magic number constants (M-002) ────────────────────────────────────────────
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 500

# ─── Pydantic models ──────────────────────────────────────────────────────────
class SupplierCreate(BaseModel):
    supplier_code: Optional[str] = Field(None, max_length=64, description="供应商编号，不传则自动生成")
    supplier_name: str = Field(..., max_length=128)
    source_file: Optional[str] = None
    file_date: Optional[str] = None
    username: Optional[str] = Field(None, max_length=64, description="自定义登录用户名，不传则自动生成")
    password: Optional[str] = Field(None, max_length=128, description="自定义登录密码，不传则自动生成")

class SupplierUpdate(BaseModel):
    supplier_name: Optional[str] = Field(None, max_length=128)
    source_file: Optional[str] = None
    file_date: Optional[str] = None
    freshness: Optional[str] = None


@router.get("/profile")
def get_supplier_profile(current_user: dict = Depends(require_auth())):
    """
    Get the authenticated supplier's own profile.
    Returns full supplier info from the supplier_files table.
    """
    supplier_id = current_user.get("supplier_id")
    if not supplier_id:
        raise HTTPException(status_code=400, detail="尚未绑定供应商账号")
    with get_db() as db:
        cur = db.cursor()
        cur.execute("""
            SELECT id, supplier_code, supplier_name, source_file, file_date,
                   data_quality_score, parse_success_rate, price_tier,
                   freshness, total_records, total_brands, avg_price,
                   created_at, updated_at
            FROM supplier_files WHERE id=%s
        """, (supplier_id,))
        row = cur.fetchone()
        cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="供应商不存在")
    return row


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("")
def list_supplier_files(
    request: Request,
    brand: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    freshness: Optional[str] = Query(None),
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    current_user: dict = Depends(require_auth()),
):
    """
    List supplier_files with optional brand/category/freshness filter.
    Admin sees all suppliers; suppliers see only their own data.
    """
    with get_db() as db:
        cur = db.cursor()

        conditions = ["1=1"]
        params = []

        # Role-based filtering: suppliers can only see their own data
        if current_user["role"] == "supplier":
            supplier_id = current_user.get("supplier_id")
            if supplier_id:
                conditions.append("s.id=%s")
                params.append(supplier_id)
            else:
                cur.close()
                return {"suppliers": [], "total": 0, "page": page, "page_size": page_size, "pages": 0}

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
        cur.execute(f"SELECT COUNT(*) as total FROM supplier_files s WHERE {where_clause}", params)
        total = cur.fetchone()["total"]

        offset = (page - 1) * page_size
        cur.execute(f"""
            SELECT s.id, s.supplier_code, s.supplier_name, s.source_file, s.file_date,
                   s.data_quality_score, s.parse_success_rate, s.price_tier,
                   s.freshness, s.total_records, s.total_brands, s.avg_price,
                   s.created_at, s.updated_at
            FROM supplier_files s
            WHERE {where_clause}
            ORDER BY s.supplier_name
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])

        rows = cur.fetchall()
        cur.close()

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
    with get_db() as db:
        cur = db.cursor()
        cur.execute("""
            SELECT id, supplier_code, supplier_name, source_file, file_date,
                   data_quality_score, parse_success_rate, price_tier,
                   freshness, total_records, total_brands, avg_price,
                   created_at, updated_at
            FROM supplier_files WHERE id=%s
        """, (supplier_id,))
        row = cur.fetchone()
        cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="供应商不存在")
    return row


@router.post("")
def create_supplier(payload: SupplierCreate):
    """
    Create a new supplier and auto-generate a login account.
    Returns the supplier info and the generated username/password.
    """
    # Generate or use custom password
    if payload.password:
        raw_password = payload.password
    else:
        raw_password = secrets.token_urlsafe(12)
    password_hash = bcrypt.hashpw(raw_password.encode(), bcrypt.gensalt()).decode()

    with get_db() as db:
        cur = db.cursor()
        try:
            # 1. Create supplier (auto-generate code if not provided)
            effective_code = payload.supplier_code or secrets.token_hex(4).upper()
            cur.execute("""
                INSERT INTO supplier_files (supplier_code, supplier_name, source_file, file_date)
                VALUES (%s, %s, %s, %s)
            """, (
                effective_code,
                payload.supplier_name,
                payload.source_file,
                payload.file_date,
            ))
            new_id = cur.lastrowid

            # 2. Create auth account — use custom username or auto-generate
            username = payload.username if payload.username else f"supplier_{effective_code}"[:64]
            cur.execute("""
                INSERT INTO auth_users (username, password_hash, role, supplier_id, created_at)
                VALUES (%s, %s, 'supplier', %s, NOW())
            """, (username, password_hash, new_id))

            db.commit()

            # 3. Return result with credentials (serialize datetime/Decimal for JSONResponse)
            cur.execute("SELECT * FROM supplier_files WHERE id=%s", (new_id,))
            result = cur.fetchone()
            cur.close()

            def _fmt(val):
                if hasattr(val, "isoformat"):
                    return val.isoformat()
                if hasattr(val, "__float__"):
                    return float(val)
                return val

            row_data = {k: _fmt(v) for k, v in result.items()}
            row_data["account"] = {
                "username": username,
                "raw_password": raw_password,
            }
            return JSONResponse(content=row_data, status_code=201)
        except Exception as e:
            db.rollback()
            cur.close()
            raise HTTPException(status_code=500, detail="创建供应商失败，请联系管理员")


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
    with get_db() as db:
        cur = db.cursor()
        cur.execute(f"UPDATE supplier_files SET {', '.join(fields)} WHERE id=%s", values)
        db.commit()
        if cur.rowcount == 0:
            cur.close()
            raise HTTPException(status_code=404, detail="供应商不存在")
        cur.execute("SELECT * FROM supplier_files WHERE id=%s", (supplier_id,))
        result = cur.fetchone()
        cur.close()
    return result


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int):
    """Delete a supplier (soft delete not implemented)."""
    with get_db() as db:
        cur = db.cursor()
        cur.execute("DELETE FROM supplier_files WHERE id=%s", (supplier_id,))
        db.commit()
        affected = cur.rowcount
        cur.close()
    if affected == 0:
        raise HTTPException(status_code=404, detail="供应商不存在")
    return {"message": "供应商已删除", "id": supplier_id}
