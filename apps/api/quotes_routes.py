"""
Quotes Routes — /api/v1/quotes/*
Manage supplier price quotes.
Phase 2 fixes: A-001 (shared auth), A-002 (context manager), M-002 (constants)
"""
import os
import math
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request, Depends
from pydantic import BaseModel

from app.auth import require_auth, get_db

router = APIRouter(prefix="/api/v1/quotes", tags=["quotes"])

# ─── Magic number constants (M-002) ────────────────────────────────────────────
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 500
DEFAULT_CONFIDENCE = 50.0
DEFAULT_QUALITY_TIER = "MEDIUM"

# ─── Models ───────────────────────────────────────────────────────────────────
class QuoteCreate(BaseModel):
    supplier_id: int
    brand: str
    category: str
    model_raw: str
    model_std: Optional[str] = None
    price: float
    price_type: Optional[str] = None
    quality_tier: Optional[str] = DEFAULT_QUALITY_TIER
    confidence: Optional[float] = DEFAULT_CONFIDENCE

class QuoteStatusUpdate(BaseModel):
    status: str  # 'verified', 'reverted', 'rejected'

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("")
def list_quotes(
    request: Request,
    supplier_id: Optional[int] = Query(None),
    brand: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    quality_tier: Optional[str] = Query(None),
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    current_user: dict = Depends(require_auth()),
):
    """
    List supplier quotes with optional filters.
    Admin sees all quotes; suppliers see only their own.
    """
    with get_db() as db:
        cur = db.cursor()

        conditions = ["1=1"]
        params = []

        # Role-based filtering: suppliers can only see their own quotes
        if current_user["role"] == "supplier":
            supplier_id_from_token = current_user.get("supplier_id")
            if supplier_id_from_token:
                conditions.append("sq.supplier_id=%s")
                params.append(supplier_id_from_token)
            else:
                cur.close()
                return {"quotes": [], "total": 0, "page": page, "page_size": page_size, "pages": 0}

        if supplier_id:
            conditions.append("sq.supplier_id=%s"); params.append(supplier_id)
        if brand:
            conditions.append("sq.brand=%s"); params.append(brand.upper())
        if category:
            conditions.append("sq.category=%s"); params.append(category.upper())
        if quality_tier:
            conditions.append("sq.quality_tier=%s"); params.append(quality_tier.upper())

        where_clause = " AND ".join(conditions)

        cur.execute(f"""
            SELECT COUNT(*) as total
            FROM supplier_quotes sq
            WHERE {where_clause}
        """, params)
        total = cur.fetchone()["total"]

        offset = (page - 1) * page_size
        cur.execute(f"""
            SELECT sq.id, sq.supplier_id, s.supplier_name,
                   sq.brand, sq.category, sq.model_raw, sq.model_std,
                   sq.price, sq.price_type, sq.quality_tier, sq.is_low_quality,
                   sq.confidence, sq.error_type, sq.created_at
            FROM supplier_quotes sq
            JOIN supplier_files s ON sq.supplier_id = s.id
            WHERE {where_clause}
            ORDER BY sq.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])

        rows = cur.fetchall()
        cur.close()

    return {
        "quotes": rows,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total else 0,
    }


@router.get("/{quote_id}")
def get_quote(quote_id: int):
    """Get a single quote by ID."""
    with get_db() as db:
        cur = db.cursor()
        cur.execute("""
            SELECT sq.id, sq.supplier_id, s.supplier_name,
                   sq.brand, sq.category, sq.model_raw, sq.model_std,
                   sq.price, sq.price_type, sq.quality_tier, sq.is_low_quality,
                   sq.confidence, sq.error_type, sq.raw_row, sq.created_at
            FROM supplier_quotes sq
            JOIN supplier_files s ON sq.supplier_id = s.id
            WHERE sq.id=%s
        """, (quote_id,))
        row = cur.fetchone()
        cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="报价不存在")
    return row


@router.post("")
def create_quote(payload: QuoteCreate):
    """
    Create a new supplier quote.
    """
    with get_db() as db:
        cur = db.cursor()
        try:
            cur.execute("""
                INSERT INTO supplier_quotes
                    (supplier_id, brand, category, model_raw, model_std,
                     price, price_type, quality_tier, confidence)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                payload.supplier_id,
                payload.brand.upper(),
                payload.category.upper(),
                payload.model_raw,
                payload.model_std,
                payload.price,
                payload.price_type,
                payload.quality_tier,
                payload.confidence,
            ))
            new_id = cur.lastrowid
            db.commit()
            cur.execute("""
                SELECT sq.*, s.supplier_name
                FROM supplier_quotes sq
                JOIN supplier_files s ON sq.supplier_id = s.id
                WHERE sq.id=%s
            """, (new_id,))
            result = cur.fetchone()
            cur.close()
            return {"id": new_id, **result}, 201
        except Exception as e:
            db.rollback()
            cur.close()
            raise HTTPException(status_code=500, detail="创建报价失败，请联系管理员")


@router.put("/{quote_id}/status")
def update_quote_status(quote_id: int, payload: QuoteStatusUpdate):
    """
    Update quote status: verified, reverted, or rejected.
    """
    if payload.status not in ("verified", "reverted", "rejected"):
        raise HTTPException(
            status_code=400,
            detail="状态值必须为: verified(已审核), reverted(已回退), rejected(已拒绝)"
        )

    with get_db() as db:
        cur = db.cursor()

        # Map status to DB logic (is_low_quality toggle + error_type)
        if payload.status == "verified":
            cur.execute("""
                UPDATE supplier_quotes
                SET is_low_quality=0, error_type=NULL
                WHERE id=%s
            """, (quote_id,))
        elif payload.status == "rejected":
            cur.execute("""
                UPDATE supplier_quotes
                SET is_low_quality=1, error_type='manual_rejection'
                WHERE id=%s
            """, (quote_id,))
        else:  # reverted
            cur.execute("""
                UPDATE supplier_quotes
                SET is_low_quality=1, error_type='manual_revert'
                WHERE id=%s
            """, (quote_id,))

        db.commit()
        if cur.rowcount == 0:
            cur.close()
            raise HTTPException(status_code=404, detail="报价不存在")

        cur.execute("SELECT * FROM supplier_quotes WHERE id=%s", (quote_id,))
        result = cur.fetchone()
        cur.close()
    return {"id": quote_id, "status": payload.status, "updated": result}
