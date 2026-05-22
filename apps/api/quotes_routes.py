"""
Quotes Routes — /api/v1/quotes/*
Manage supplier price quotes.
"""
import os
import math
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/quotes", tags=["quotes"])

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

# ─── Models ───────────────────────────────────────────────────────────────────
class QuoteCreate(BaseModel):
    supplier_id: int
    brand: str
    category: str
    model_raw: str
    model_std: Optional[str] = None
    price: float
    price_type: Optional[str] = None
    quality_tier: Optional[str] = "MEDIUM"
    confidence: Optional[float] = 50.0

class QuoteStatusUpdate(BaseModel):
    status: str  # 'verified', 'reverted', 'rejected'

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("")
def list_quotes(
    supplier_id: Optional[int] = Query(None),
    brand: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    quality_tier: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    """
    List supplier quotes with optional filters.
    """
    db = get_db()
    cur = db.cursor()

    conditions = ["1=1"]
    params = []
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
        JOIN suppliers s ON sq.supplier_id = s.id
        WHERE {where_clause}
        ORDER BY sq.created_at DESC
        LIMIT %s OFFSET %s
    """, params + [page_size, offset])

    rows = cur.fetchall()
    cur.close()
    db.close()

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
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        SELECT sq.id, sq.supplier_id, s.supplier_name,
               sq.brand, sq.category, sq.model_raw, sq.model_std,
               sq.price, sq.price_type, sq.quality_tier, sq.is_low_quality,
               sq.confidence, sq.error_type, sq.raw_row, sq.created_at
        FROM supplier_quotes sq
        JOIN suppliers s ON sq.supplier_id = s.id
        WHERE sq.id=%s
    """, (quote_id,))
    row = cur.fetchone()
    cur.close()
    db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Quote not found")
    return row


@router.post("")
def create_quote(payload: QuoteCreate):
    """
    Create a new supplier quote.
    """
    db = get_db()
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
            JOIN suppliers s ON sq.supplier_id = s.id
            WHERE sq.id=%s
        """, (new_id,))
        result = cur.fetchone()
        cur.close()
        db.close()
        return {"id": new_id, **result}, 201
    except Exception as e:
        db.rollback()
        cur.close()
        db.close()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{quote_id}/status")
def update_quote_status(quote_id: int, payload: QuoteStatusUpdate):
    """
    Update quote status: verified, reverted, or rejected.
    """
    if payload.status not in ("verified", "reverted", "rejected"):
        raise HTTPException(status_code=400, detail="status must be one of: verified, reverted, rejected")

    db = get_db()
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
        cur.close(); db.close()
        raise HTTPException(status_code=404, detail="Quote not found")

    cur.execute("SELECT * FROM supplier_quotes WHERE id=%s", (quote_id,))
    result = cur.fetchone()
    cur.close()
    db.close()
    return {"id": quote_id, "status": payload.status, "updated": result}
