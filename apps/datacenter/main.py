"""
ValueCube DataCenter API — Phase 2.7
Data source: MySQL 8.4 (constitution mandate, Chapter 8)
"""
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from mysql.connector import pooling
import os
from typing import Optional, List
from pydantic import BaseModel

app = FastAPI(title="ValueCube DataCenter", version="2.7")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ["ALLOWED_ORIGINS"].split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── B2 Market Intelligence Models ───────────────────────────────────────────
class PriceBandItem(BaseModel):
    brand: str
    price_p25: float
    price_p75: float

class PriceBandsResponse(BaseModel):
    category: str
    price_min: float
    price_max: float
    price_avg: float
    bands: List[PriceBandItem]

class TrendPoint(BaseModel):
    date: str
    price_avg: float

class TrendResponse(BaseModel):
    category: str
    trend: str  # "up" | "down" | "stable"
    change_pct: float
    data_points: List[TrendPoint]
    note: Optional[str] = None

# ─── B3 Procurement Decision Models ──────────────────────────────────────────
class ProcureItem(BaseModel):
    category: str
    quantity: int

class ProcureRecommendItem(BaseModel):
    model: str
    unit_price: float
    quantity: int
    subtotal: float

class ProcurementRecommendation(BaseModel):
    supplier: str
    brand: str
    items: List[ProcureRecommendItem]
    total_cost: float
    savings: float
    remaining: float

class ProcureRecommendResponse(BaseModel):
    category: str
    budget: float
    recommendations: List[ProcurementRecommendation]

class CompareRow(BaseModel):
    supplier: str
    category: str
    items: int
    total: float
    unit_avg: float

class ProcureCompareResponse(BaseModel):
    compare_table: List[CompareRow]

# ─── MySQL Config ────────────────────────────────────────────────────────────
MYSQL_HOST = os.environ["MYSQL_HOST"]
MYSQL_PORT = int(os.environ["MYSQL_PORT"])
MYSQL_USER = os.environ["MYSQL_USER"]
MYSQL_PASSWORD = os.environ["MYSQL_PASSWORD"]
MYSQL_DATABASE = os.environ["MYSQL_DATABASE"]

_db_pool = None
def get_pool():
    global _db_pool
    if _db_pool is None:
        _db_pool = pooling.MySQLConnectionPool(
            pool_name="dc_pool", pool_size=5,
            host=MYSQL_HOST, port=MYSQL_PORT,
            user=MYSQL_USER, password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            connection_timeout=5, charset="utf8mb4", collation="utf8mb4_unicode_ci",
        )
    return _db_pool

def get_db():
    pool = get_pool()
    conn = pool.get_connection()
    return conn

# ── Health ──────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "datacenter", "version": "2.7", "database": "mysql"}

# ── /datacenter/health backward-compatible alias ───────────────────────────
@app.get("/datacenter/health")
def datacenter_health():
    return {"status": "ok", "service": "datacenter", "version": "2.7", "database": "mysql"}

# ── 2.2 供应商基础列表 ────────────────────────────────────────────────────
@app.get("/api/v1/suppliers")
def list_suppliers(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    """
    List all suppliers with basic info for admin dashboard.
    Returns paginated supplier list.
    """
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)

        # Total count
        cur.execute("SELECT COUNT(*) as cnt FROM suppliers")
        total = cur.fetchone()["cnt"]

        offset = (page - 1) * page_size
        cur.execute("""
            SELECT id, supplier_name, data_quality_score,
                   freshness, total_records, total_brands, avg_price,
                   price_tier, parse_success_rate,
                   updated_at as last_quote_at
            FROM suppliers
            ORDER BY data_quality_score DESC
            LIMIT %s OFFSET %s
        """, (page_size, offset))
        rows = cur.fetchall()
        cur.close()

    suppliers = []
    for row in rows:
        suppliers.append({
            "id": str(row["id"]),
            "name": row["supplier_name"],
            "quality_score": float(row["data_quality_score"] or 0),
            "is_active": row["freshness"] in ("live", "valid"),
            "last_quote_at": row["last_quote_at"].isoformat() if row["last_quote_at"] else None,
        })
    return {"suppliers": suppliers, "total": total, "page": page, "page_size": page_size}
    return {"suppliers": suppliers, "total": total, "page": page, "page_size": page_size}


# ── 2.2 供应商质量评分 ─────────────────────────────────────────────────────
@app.get("/api/v1/suppliers/quality")
def supplier_quality():
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT supplier_name, total_records, parse_success_rate, data_quality_score,
                   total_brands, price_tier, freshness, avg_price
            FROM suppliers ORDER BY data_quality_score DESC
        """)
        rows = cur.fetchall()
        cur.close()
    return {"suppliers": rows, "total": len(rows)}

# ── 2.3 供应商品牌分布 ─────────────────────────────────────────────────────
@app.get("/api/v1/suppliers/{supplier_name}/brands")
def supplier_brands(supplier_name: str):
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT brand, record_count, avg_price, share_pct
            FROM supplier_brand_dist sbd
            JOIN suppliers s ON sbd.supplier_id = s.id
            WHERE s.supplier_name = %s
            ORDER BY sbd.record_count DESC
        """, (supplier_name,))
        rows = cur.fetchall()
        cur.close()
    return {"supplier": supplier_name, "brands": rows}

# ── 2.4 供应商价格带 ───────────────────────────────────────────────────────
@app.get("/api/v1/suppliers/price-tier")
def price_tier():
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT supplier_name, price_tier, avg_price FROM suppliers")
        rows = cur.fetchall()
        cur.close()
    return {"suppliers": rows}

# ── 2.5 品类价格区间 ───────────────────────────────────────────────────────
@app.get("/api/v1/categories/price-bands")
def category_price_bands():
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT category, price_min, price_max, price_avg, price_p25, price_p75, sample_count
            FROM category_price_bands ORDER BY sample_count DESC
        """)
        rows = cur.fetchall()
        cur.close()
    return {"categories": rows}

# ── 2.1 标准化商品目录查询 ─────────────────────────────────────────────────
@app.get("/api/v1/products")
def list_products(
    brand: str = Query(None),
    category: str = Query(None),
    model: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        conditions = []
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
        where = " AND ".join(conditions) if conditions else "1=1"
        offset = (page - 1) * page_size

        cur.execute(f"SELECT COUNT(*) FROM std_products WHERE {where}", params)
        total = cur.fetchone()["COUNT(*)"]

        cur.execute(f"""
            SELECT product_uuid, brand, category, model_std, source_file, is_trap
            FROM std_products WHERE {where}
            ORDER BY brand, category LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        rows = cur.fetchall()
        cur.close()
    return {"products": rows, "total": total, "page": page, "page_size": page_size}

# ── 2.6 数据新鲜度 ───────────────────────────────────────────────────────
@app.get("/api/v1/suppliers/freshness")
def freshness():
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT supplier_name, freshness, updated_at FROM suppliers")
        rows = cur.fetchall()
        cur.close()
    return {"suppliers": rows}

# ── 2.2 错误类型统计 ───────────────────────────────────────────────────────
@app.get("/api/v1/suppliers/{supplier_name}/errors")
def supplier_errors(supplier_name: str):
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT error_type, error_count
            FROM data_quality_errors dqe
            JOIN suppliers s ON dqe.supplier_id = s.id
            WHERE s.supplier_name = %s
            ORDER BY error_count DESC
        """, (supplier_name,))
        rows = cur.fetchall()
        cur.close()
    return {"supplier": supplier_name, "errors": rows}

# ── Summary ────────────────────────────────────────────────────────────────
@app.get("/api/v1/summary")
def summary():
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM std_products")
        s1 = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM suppliers")
        s2 = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM supplier_quotes")
        s3 = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM category_price_bands")
        s4 = cur.fetchone()[0]
        cur.close()
    return {
        "std_products": s1,
        "suppliers": s2,
        "quotes": s3,
        "price_bands": s4,
    }

# ── Phase 4: 学习闭环 — 纠正记录 API ─────────────────────────────────────────

from datetime import datetime
from pydantic import BaseModel

class CorrectionCreate(BaseModel):
    entity_type: str
    entity_id: str | None = None
    quote_id: int | None = None
    supplier_id: int | None = None
    field_name: str
    original_value: str | None = None
    corrected_value: str | None = None
    correction_desc: str | None = None
    quality_before: float | None = None
    quality_after: float | None = None
    error_reduced: int | None = None
    notes: str | None = None
    operator: str | None = None
    source: str = "manual"

class CorrectionVerify(BaseModel):
    status: str  # 'verified' or 'reverted'
    notes: str | None = None

# ── Operation Log helper ───────────────────────────────────────────────────────
def _write_operation_log(conn, level: str, module: str, action: str, message: str,
                          operator: str = None, target_type: str = None, target_id: str = None,
                          ip_address: str = None):
    """Write to operation_logs table for audit trail."""
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO operation_logs (level, module, action, message, operator, target_type, target_id, ip_address, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
    """, (level, module, action, message, operator, target_type, target_id, ip_address))
    conn.commit()
    cur.close()


# POST /api/v1/corrections — 创建纠正记录
@app.post("/api/v1/corrections")
def create_correction(payload: CorrectionCreate):
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            INSERT INTO correction_logs
                (entity_type, entity_id, quote_id, supplier_id,
                 field_name, original_value, corrected_value, correction_desc,
                 quality_before, quality_after, error_reduced, notes,
                 operator, source, status, applied_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'applied',NOW())
        """, (
            payload.entity_type, payload.entity_id, payload.quote_id, payload.supplier_id,
            payload.field_name, payload.original_value, payload.corrected_value, payload.correction_desc,
            payload.quality_before, payload.quality_after, payload.error_reduced,
            payload.notes, payload.operator, payload.source,
        ))
        log_id = cur.lastrowid
        conn.commit()
        cur.close()

        # S3审计日志：同步写operation_logs
        _write_operation_log(
            conn,
            module="datacenter", action="correction_applied",
            message=f"纠正记录 {log_id} 已应用",
            target_type="correction_log", target_id=str(log_id),
        )
    return {"id": log_id, "status": "applied", "applied_at": datetime.now().isoformat()}

# GET /api/v1/corrections — 查询纠正记录列表
@app.get("/api/v1/corrections")
def list_corrections(
    entity_type: str = Query(None),
    entity_id: str = Query(None),
    supplier_id: int = Query(None),
    rule_id: int = Query(None),
    status: str = Query(None),
    source: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        conditions, params = ["1=1"], []
        if entity_type:
            conditions.append("entity_type = %s"); params.append(entity_type)
        if entity_id:
            conditions.append("entity_id = %s"); params.append(entity_id)
        if supplier_id:
            conditions.append("supplier_id = %s"); params.append(supplier_id)
        if rule_id:
            conditions.append("rule_id = %s"); params.append(rule_id)
        if status:
            conditions.append("status = %s"); params.append(status)
        if source:
            conditions.append("source = %s"); params.append(source)
        where = " AND ".join(conditions)
        offset = (page - 1) * page_size

        cur.execute(f"SELECT COUNT(*) FROM correction_logs WHERE {where}", params)
        total = cur.fetchone()["COUNT(*)"]

        cur.execute(f"""
            SELECT id, entity_type, entity_id, quote_id, supplier_id,
                   field_name, original_value, corrected_value, correction_desc,
                   quality_before, quality_after, error_reduced,
                   status, applied_at, verified_at, reverted_at,
                   operator, source
            FROM correction_logs
            WHERE {where}
            ORDER BY applied_at DESC
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        rows = cur.fetchall()
        cur.close()
    return {"corrections": rows, "total": total, "page": page, "page_size": page_size}

# GET /api/v1/corrections/summary — 必须在 /{log_id} 之前注册（FastAPI按顺序匹配）
@app.get("/api/v1/corrections/summary")
def corrections_summary():
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT COUNT(*) FROM correction_logs")
        total = cur.fetchone()["COUNT(*)"]
        cur.execute("SELECT COUNT(*) FROM correction_logs WHERE status='applied'")
        applied = cur.fetchone()["COUNT(*)"]
        cur.execute("SELECT COUNT(*) FROM correction_logs WHERE status='verified'")
        verified = cur.fetchone()["COUNT(*)"]
        cur.execute("SELECT COUNT(*) FROM correction_logs WHERE status='reverted'")
        reverted = cur.fetchone()["COUNT(*)"]
        cur.execute("""
            SELECT entity_type, COUNT(*) as cnt
            FROM correction_logs GROUP BY entity_type
        """)
        by_entity = cur.fetchall()
        cur.execute("""
            SELECT source, COUNT(*) as cnt
            FROM correction_logs GROUP BY source
        """)
        by_source = cur.fetchall()
        cur.execute("""
            SELECT DATE(applied_at) as date, COUNT(*) as cnt,
                   SUM(quality_after - quality_before) as quality_delta,
                   SUM(error_reduced) as errors_reduced
            FROM correction_logs
            WHERE applied_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(applied_at) ORDER BY date DESC
        """)
        trend = cur.fetchall()
        cur.close()
    return {
        "total": total,
        "by_status": {"applied": applied, "verified": verified, "reverted": reverted},
        "by_entity_type": by_entity,
        "by_source": by_source,
        "daily_trend_30d": trend,
    }

# GET /api/v1/corrections/{id} — 获取单条纠正记录详情
@app.get("/api/v1/corrections/{log_id}")
def get_correction(log_id: int):
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT id, entity_type, entity_id, quote_id, supplier_id, field_name,
                   original_value, corrected_value, correction_desc,
                   status, applied_at, verified_at, reverted_at,
                   quality_before, quality_after, error_reduced,
                   operator, source, notes
            FROM correction_logs WHERE id = %s
        """, (log_id,))
        row = cur.fetchone()
        cur.close()
        if not row:
            return {"error": "correction log not found"}, 404
        return row

# PATCH /api/v1/corrections/{id}/verify — 验收/回滚纠正记录
@app.patch("/api/v1/corrections/{log_id}/verify")
def verify_correction(log_id: int, payload: CorrectionVerify):
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id, status FROM correction_logs WHERE id = %s", (log_id,))
        row = cur.fetchone()
        if not row:
            return {"error": "correction log not found"}, 404
        if payload.status == "verified":
            cur.execute("""
                UPDATE correction_logs
                SET status='verified', verified_at=NOW(), notes=CONCAT(IFNULL(notes,''), %s)
                WHERE id=%s
            """, (f"\n[verify] {payload.notes}" if payload.notes else "", log_id))
        elif payload.status == "reverted":
            cur.execute("""
                UPDATE correction_logs
                SET status='reverted', reverted_at=NOW(), notes=CONCAT(IFNULL(notes,''), %s)
                WHERE id=%s
            """, (f"\n[revert] {payload.notes}" if payload.notes else "", log_id))
        else:
            return {"error": "status must be 'verified' or 'reverted'"}, 400
        conn.commit()
        cur.execute("SELECT status, verified_at, reverted_at FROM correction_logs WHERE id = %s", (log_id,))
        result = cur.fetchone()
        return {"id": log_id, "status": result["status"],
                "verified_at": result["verified_at"], "reverted_at": result["reverted_at"]}
    finally:
        cur.close()
        conn.close()

# GET /api/v1/quotes/low-confidence — 置信度50-70%的报价（引导式审核队列）
@app.get("/api/v1/quotes/low-confidence")
def low_confidence_quotes(
    supplier: str = Query(None),
    category: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        conditions = ["confidence >= 50", "confidence < 70"]
        params = []
        if supplier:
            conditions.append("s.supplier_name = %s")
            params.append(supplier)
        if category:
            conditions.append("sq.category = %s")
            params.append(category.upper())
        where = " AND ".join(conditions)
        offset = (page - 1) * page_size

        cur.execute(f"SELECT COUNT(*) FROM supplier_quotes sq JOIN suppliers s ON sq.supplier_id=s.id WHERE {where}", params)
        total = cur.fetchone()["COUNT(*)"]

        cur.execute(f"""
            SELECT sq.id, sq.supplier_id, s.supplier_name, sq.brand, sq.category,
                   sq.model_raw, sq.model_std, sq.price, sq.price_type,
                   sq.quality_tier, sq.confidence, sq.error_type, sq.created_at,
                   CASE WHEN sq.confidence < 60 THEN 'high_uncertainty'
                        WHEN sq.confidence < 70 THEN 'medium_uncertainty'
                        ELSE 'low_uncertainty' END as uncertainty_level
            FROM supplier_quotes sq
            JOIN suppliers s ON sq.supplier_id = s.id
            WHERE {where}
            ORDER BY sq.confidence ASC, sq.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        rows = cur.fetchall()
        cur.close()
    return {"quotes": rows, "total": total, "page": page, "page_size": page_size}


# GET /api/v1/quotes/{quote_id}/reasoning — 返回某条报价的判断依据
@app.get("/api/v1/quotes/{quote_id}/reasoning")
def quote_reasoning(quote_id: int):
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT sq.id, sq.brand, sq.category, sq.model_raw, sq.model_std,
                   sq.price, sq.price_type, sq.quality_tier, sq.confidence, sq.error_type,
                   s.supplier_name
            FROM supplier_quotes sq
            JOIN suppliers s ON sq.supplier_id = s.id
            WHERE sq.id = %s
        """, (quote_id,))
        row = cur.fetchone()
        cur.close()
    if not row:
        return {"error": "quote not found"}, 404

    reasoning = []
    uncertain_fields = []

    # 品类判断依据
    cat_conf = float(row.get('confidence', 0) if row.get('category') else 0)
    cat_basis = ""
    if row.get('category'):
        cat_basis = f"根据型号前缀规则，{row.get('model_raw','')} → {row.get('category')}，置信度 {cat_conf:.0f}%"
        reasoning.append({"field": "category", "value": row['category'], "confidence": cat_conf, "basis": cat_basis})
        if cat_conf < 70:
            uncertain_fields.append({"field": "category", "confidence": cat_conf, "hint": "品类置信度偏低，建议核实型号命名规则"})

    # 品牌判断依据
    brand_conf = 95.0 if row.get('brand') else 0.0
    if row.get('brand'):
        reasoning.append({"field": "brand", "value": row['brand'], "confidence": brand_conf, "basis": "品牌名字典精确匹配，置信度极高"})
    else:
        uncertain_fields.append({"field": "brand", "confidence": 0.0, "hint": "品牌字段为空，需人工补充"})

    # 价格质量层级判断依据
    price_val = float(row.get('price') or 0)
    qt_conf = float(row.get('confidence', 0))
    qt_value = row.get('quality_tier', 'UNKNOWN')
    if row.get('price'):
        if price_val < 3000:
            qt_hint = "单价偏低，可能是低端产品或工程机"
        elif price_val < 8000:
            qt_hint = "单价处于中间价位带，quality_tier判定置信度中等"
        else:
            qt_hint = "单价较高，需确认是否为高端产品或特供渠道"
        reasoning.append({"field": "quality_tier", "value": qt_value, "confidence": qt_conf, "basis": qt_hint})
        if qt_conf < 70:
            uncertain_fields.append({"field": "quality_tier", "confidence": qt_conf, "hint": qt_hint})

    return {
        "quote_id": quote_id,
        "supplier_name": row.get('supplier_name'),
        "reasoning": reasoning,
        "uncertain_fields": uncertain_fields,
    }


# GET /api/v1/quotes/{quote_id}/similar — 同类问题扫描（同供应商+同字段+低置信度）
@app.get("/api/v1/quotes/{quote_id}/similar")
def similar_quotes(quote_id: int):
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)

        # 获取被纠正记录的supplier_id
        cur.execute("SELECT supplier_id FROM supplier_quotes WHERE id=%s", (quote_id,))
        meta = cur.fetchone()

        # 查询同类：同供应商 + 置信度<70 的同类记录
        cur.execute("""
            SELECT sq.id, sq.brand, sq.category, sq.model_std, sq.price,
                   sq.quality_tier, sq.confidence, sq.error_type, sq.created_at,
                   s.supplier_name
            FROM supplier_quotes sq
            JOIN suppliers s ON sq.supplier_id = s.id
            WHERE sq.supplier_id = %s
              AND sq.id != %s
              AND sq.confidence < 70
            ORDER BY sq.confidence ASC
            LIMIT 50
        """, (meta['supplier_id'] if meta else 0, quote_id))
        rows = cur.fetchall()
        total = len(rows)
        cur.close()
    return {"matching_quotes": rows, "total": total, "source_quote_id": quote_id}


# GET /api/v1/rules/auto — 从纠正日志聚合自动生成的规则
@app.get("/api/v1/rules/auto")
def auto_rules():
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT
                cl.supplier_id,
                s.supplier_name,
                cl.field_name,
                cl.corrected_value,
                COUNT(*) as occurrence_count,
                GROUP_CONCAT(DISTINCT cl.original_value SEPARATOR '|') as original_values,
                MAX(cl.applied_at) as last_applied
            FROM correction_logs cl
            JOIN suppliers s ON cl.supplier_id = s.id
            WHERE cl.status IN ('applied', 'verified')
              AND cl.source IN ('manual', 'batch')
            GROUP BY cl.supplier_id, cl.field_name, cl.corrected_value
            HAVING COUNT(*) >= 1
            ORDER BY occurrence_count DESC, last_applied DESC
            LIMIT 50
        """)
        rows = cur.fetchall()
        cur.close()

    rules = []
    for r in rows:
        status = "active" if r["occurrence_count"] >= 3 else "learning"
        rules.append({
            "supplier_id": r["supplier_id"],
            "supplier_name": r["supplier_name"],
            "field": r["field_name"],
            "trigger_pattern": r["original_values"].split("|")[0] if r["original_values"] else "",
            "corrected_value": r["corrected_value"],
            "occurrence_count": r["occurrence_count"],
            "confidence_boost": min(r["occurrence_count"] * 5.0, 25.0),
            "status": status,
            "last_applied": r["last_applied"],
        })
    return {"rules": rules}


# ============================================================
# Phase 4.4+4.5: 规则泛化Rule表 API
# ============================================================

class RuleCreate(BaseModel):
    rule_text: str
    field: str
    trigger_pattern: str | None = None
    target_value: str | None = None
    supplier_id: int | None = None
    source: str = "auto"

class RuleUpdate(BaseModel):
    status: str | None = None  # 'learning' | 'active' | 'disabled'
    notes: str | None = None

# GET /api/v1/rules — 查询规则列表
@app.get("/api/v1/rules")
def list_rules(
    field: str = Query(None),
    supplier_id: int = Query(None),
    status: str = Query(None),
    source: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        conditions, params = ["1=1"], []
        if field:
            conditions.append("field = %s"); params.append(field)
        if supplier_id:
            conditions.append("supplier_id = %s"); params.append(supplier_id)
        if status:
            conditions.append("status = %s"); params.append(status)
        if source:
            conditions.append("source = %s"); params.append(source)
        where = " AND ".join(conditions)
        offset = (page - 1) * page_size

        cur.execute(f"SELECT COUNT(*) FROM rules WHERE {where}", params)
        total = cur.fetchone()["COUNT(*)"]

        cur.execute(f"""
            SELECT id, rule_text, field_name, trigger_pattern, target_value,
                   supplier_id, occurrence_count, correction_count, source,
                   status, confidence_boost, created_at, updated_at, activated_at
            FROM rules
            WHERE {where}
            ORDER BY
                CASE status WHEN 'active' THEN 0 WHEN 'learning' THEN 1 ELSE 2 END,
                correction_count DESC,
                created_at DESC
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        rows = cur.fetchall()
        cur.close()
    return {"rules": rows, "total": total, "page": page, "page_size": page_size}

# GET /api/v1/rules/summary — 规则统计
@app.get("/api/v1/rules/summary")
def rules_summary():
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT COUNT(*) FROM rules")
        total = cur.fetchone()["COUNT(*)"]
        cur.execute("SELECT COUNT(*) FROM rules WHERE status='active'")
        active = cur.fetchone()["COUNT(*)"]
        cur.execute("SELECT COUNT(*) FROM rules WHERE status='learning'")
        learning = cur.fetchone()["COUNT(*)"]
        cur.execute("SELECT field_name, COUNT(*) as cnt FROM rules GROUP BY field_name ORDER BY cnt DESC")
        by_field = cur.fetchall()
        cur.execute("""
            SELECT DATE(created_at) as date, COUNT(*) as cnt
            FROM rules
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at) ORDER BY date DESC
        """)
        trend = cur.fetchall()
        cur.close()
    return {
        "total": total,
        "active": active,
        "learning": learning,
        "by_field": by_field,
        "daily_trend_30d": trend,
    }

# POST /api/v1/rules/sync — 从纠正日志聚合生成规则
@app.post("/api/v1/rules/sync")
def sync_rules(payload: dict | None = None):
    """
    扫描 correction_logs，将同一 field + supplier + corrected_value
    的纠正记录聚合，达到3次纠正的提升为 active 规则，
    不足3次的标记为 learning 规则。
    """
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)

        # 聚合查询：从 correction_logs 提取同 supplier+field+corrected_value 的记录
        cur.execute("""
            SELECT
                cl.supplier_id,
                s.supplier_name,
                cl.field_name,
                cl.corrected_value,
                cl.corrected_value as target_value,
                COUNT(*) as correction_count,
                GROUP_CONCAT(DISTINCT cl.original_value SEPARATOR '|') as original_values,
                MAX(cl.applied_at) as last_applied
            FROM correction_logs cl
            JOIN suppliers s ON cl.supplier_id = s.id
            WHERE cl.status IN ('applied', 'verified')
              AND cl.corrected_value IS NOT NULL
              AND cl.corrected_value != ''
            GROUP BY cl.supplier_id, cl.field_name, cl.corrected_value
            HAVING COUNT(*) >= 1
            ORDER BY correction_count DESC
        """)
        aggregates = cur.fetchall()

        created = 0
        activated = 0
        for agg in aggregates:
            trigger = agg["original_values"].split("|")[0] if agg["original_values"] else ""
            rule_text = f"{trigger} → {agg['corrected_value']}" if trigger else f"→ {agg['corrected_value']}"

            # 检查是否已存在相同规则
            cur.execute("""
                SELECT id, correction_count, status FROM rules
                WHERE supplier_id = %s AND field_name = %s AND corrected_value = %s
            """, (agg["supplier_id"], agg["field_name"], agg["corrected_value"]))
            existing = cur.fetchone()

            if existing:
                # 更新纠正次数
                new_count = existing["correction_count"] + agg["correction_count"]
                new_status = "active" if new_count >= 3 else "learning"
                cur.execute("""
                    UPDATE rules SET
                        correction_count = %s,
                        occurrence_count = occurrence_count + %s,
                        status = %s,
                        updated_at = NOW()
                    WHERE id = %s
                """, (new_count, agg["correction_count"], new_status, existing["id"]))
                if new_status == "active" and existing["status"] != "active":
                    activated += 1
            else:
                # 新建规则
                status = "active" if agg["correction_count"] >= 3 else "learning"
                cur.execute("""
                    INSERT INTO rules
                        (supplier_id, field_name, trigger_pattern, corrected_value,
                         occurrence_count, correction_count, source, status,
                         confidence_boost)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    agg["supplier_id"], agg["field_name"], trigger, agg["corrected_value"],
                    agg["correction_count"], agg["correction_count"],
                    "auto", status,
                    min(agg["correction_count"] * 5.0, 25.0),
                ))
                created += 1
                if status == "active":
                    activated += 1

        conn.commit()
        cur.close()
        return {
            "synced": len(aggregates),
            "created": created,
            "activated": activated,
        }

# PATCH /api/v1/rules/{id} — 更新规则状态
@app.patch("/api/v1/rules/{rule_id}")
def update_rule(rule_id: int, payload: RuleUpdate):
    conn = get_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id, status FROM rules WHERE id = %s", (rule_id,))
        existing = cur.fetchone()
        if not existing:
            return {"error": "rule not found"}, 404

        if payload.status and payload.status not in ("learning", "active", "disabled"):
            return {"error": "status must be learning/active/disabled"}, 400

        updates = []
        params = []
        if payload.status:
            updates.append("status = %s")
            params.append(payload.status)
            if payload.status == "active":
                updates.append("activated_at = NOW()")
        if payload.notes:
            updates.append("rule_text = CONCAT(rule_text, %s)")
            params.append(f"\n[note] {payload.notes}")

        if updates:
            params.append(rule_id)
            cur.execute(f"UPDATE rules SET {', '.join(updates)}, updated_at=NOW() WHERE id=%s", params)
            conn.commit()

        cur.execute("SELECT id, rule_text, field_name, status, correction_count, updated_at FROM rules WHERE id=%s", (rule_id,))
        result = cur.fetchone()
        return result
    finally:
        cur.close()
        conn.close()


# ==============================================================================
# B2: Market Intelligence Endpoints
# ==============================================================================

def _approx_percentile(cursor, category: str, brand: str, percentile: float) -> float:
    """Approximate percentile using OFFSET/FETCH technique."""
    # Get ordered prices for the brand/category
    cursor.execute("""
        SELECT price FROM supplier_quotes
        WHERE category = %s AND quality_tier IN ('HIGH', 'MEDIUM') AND is_low_quality = 0
          AND brand = %s AND price IS NOT NULL
        ORDER BY price
    """, (category, brand))
    prices = [row['price'] for row in cursor.fetchall()]
    if not prices:
        return 0.0
    n = len(prices)
    idx = int(n * percentile / 100.0)
    if idx >= n:
        idx = n - 1
    return float(prices[idx])


@app.get("/api/v1/market/price-bands")
def market_price_bands(category: str = Query(None)):
    """
    Return price bands for a category (or all categories if not specified).
    Filters to HIGH quality, non-low-quality quotes only.
    """
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)

        if category:
            # Single category query
            cat_upper = category.upper()
            cur.execute("""
                SELECT brand,
                       MIN(price) as price_min,
                       MAX(price) as price_max,
                       AVG(price) as price_avg
                FROM supplier_quotes
                WHERE category = %s AND quality_tier IN ('HIGH', 'MEDIUM') AND is_low_quality = 0
                  AND price IS NOT NULL AND brand IS NOT NULL AND brand != ''
                GROUP BY brand
                ORDER BY brand
            """, (cat_upper,))
            rows = cur.fetchall()

            if not rows:
                cur.close()
                conn.close()
                return {"category": cat_upper, "price_min": 0, "price_max": 0, "price_avg": 0, "bands": []}

            price_min = float(min(r['price_min'] for r in rows))
            price_max = float(max(r['price_max'] for r in rows))
            price_avg = float(sum(r['price_avg'] for r in rows) / len(rows))

            bands = []
            for r in rows:
                p25 = _approx_percentile(cur, cat_upper, r['brand'], 25)
                p75 = _approx_percentile(cur, cat_upper, r['brand'], 75)
                bands.append(PriceBandItem(brand=r['brand'], price_p25=p25, price_p75=p75))

            cur.close()
            conn.close()
            return PriceBandsResponse(
                category=cat_upper,
                price_min=price_min,
                price_max=price_max,
                price_avg=price_avg,
                bands=bands
            )
        else:
            # All categories
            cur.execute("""
                SELECT DISTINCT category FROM supplier_quotes
                WHERE quality_tier IN ('HIGH', 'MEDIUM') AND is_low_quality = 0
                ORDER BY category
            """)
            categories = [row['category'] for row in cur.fetchall()]
            cur.close()
            conn.close()

            results = []
            for cat in categories:
                result = market_price_bands(cat)
                results.append(result)
            return {"categories": results}


@app.get("/api/v1/market/trend")
def market_trend(category: str = Query(...), days: int = Query(30)):
    """
    Return price trend for a category. Since all data is from a single import
    (2026-05-19), the trend is always 'stable'.
    """
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)

        cat_upper = category.upper()

        # Check distinct import dates
        cur.execute("""
            SELECT DATE(created_at) as import_date, AVG(price) as avg_price
            FROM supplier_quotes
            WHERE category = %s AND quality_tier = 'HIGH' AND is_low_quality = 0
              AND price IS NOT NULL
            GROUP BY DATE(created_at)
            ORDER BY import_date
        """, (cat_upper,))
        rows = cur.fetchall()

        cur.close()

    data_points = [TrendPoint(date=str(r['import_date']), price_avg=float(r['avg_price'])) for r in rows]

    if len(data_points) <= 1:
        return TrendResponse(
            category=cat_upper,
            trend="stable",
            change_pct=0.0,
            data_points=data_points,
            note="Insufficient time-series data (all data from single import 2026-05-19)"
        )

    # Calculate change percentage
    first_price = data_points[0].price_avg
    last_price = data_points[-1].price_avg
    if first_price > 0:
        change_pct = round((last_price - first_price) / first_price * 100, 2)
    else:
        change_pct = 0.0

    if change_pct > 1:
        trend = "up"
    elif change_pct < -1:
        trend = "down"
    else:
        trend = "stable"

    return TrendResponse(
        category=cat_upper,
        trend=trend,
        change_pct=change_pct,
        data_points=data_points,
        note=None
    )


# ==============================================================================
# B3: Procurement Decision Endpoints
# ==============================================================================

@app.get("/api/v1/procure/recommend")
def procure_recommend(category: str = Query(...), budget: float = Query(...)):
    """
    Recommend procurement options for a category within budget.
    Finds HIGH quality quotes, groups by supplier+brand, calculates quantities.
    """
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)

        cat_upper = category.upper()

        # Get all HIGH quality quotes for this category within budget
        cur.execute("""
            SELECT sq.supplier_id, s.supplier_name, sq.brand, sq.model_std,
                   sq.price, sq.quality_tier
            FROM supplier_quotes sq
            JOIN suppliers s ON sq.supplier_id = s.id
            WHERE sq.category = %s AND sq.quality_tier IN ('HIGH', 'MEDIUM') AND sq.is_low_quality = 0
              AND sq.price IS NOT NULL AND sq.price <= %s
              AND sq.brand IS NOT NULL AND sq.brand != ''
            ORDER BY s.supplier_name, sq.brand, sq.price ASC
        """, (cat_upper, budget))

        rows = cur.fetchall()
        cur.close()

    if not rows:
        return ProcureRecommendResponse(
            category=cat_upper,
            budget=budget,
            recommendations=[]
        )

    # Group by supplier + brand
    from collections import defaultdict
    groups = defaultdict(list)
    for r in rows:
        key = (r['supplier_name'], r['brand'])
        groups[key].append(r)

    recommendations = []
    for (supplier, brand), items in groups.items():
        # Pick the cheapest model for each group
        cheapest = min(items, key=lambda x: x['price'])
        unit_price = float(cheapest['price'])
        quantity = int(budget // unit_price)
        if quantity < 1:
            continue
        subtotal = round(unit_price * quantity, 2)
        total_cost = subtotal
        savings = round(budget - total_cost, 2)
        remaining = savings  # after spending on this option

        rec_items = [ProcureRecommendItem(
            model=cheapest['model_std'] or cheapest.get('model_raw', 'N/A'),
            unit_price=unit_price,
            quantity=quantity,
            subtotal=subtotal
        )]

        recommendations.append(ProcurementRecommendation(
            supplier=supplier,
            brand=brand,
            items=rec_items,
            total_cost=total_cost,
            savings=savings,
            remaining=remaining
        ))

    # Sort by savings descending
    recommendations.sort(key=lambda x: x.savings, reverse=True)

    return ProcureRecommendResponse(
        category=cat_upper,
        budget=budget,
        recommendations=recommendations
    )


@app.get("/api/v1/procure/compare")
def procure_compare(items: str = Query(...)):
    """
    Compare procurement costs across suppliers for given items.
    items is a JSON array like: [{"category":"AIR_CONDITIONER","quantity":10},...]
    """
    import json

    try:
        item_list = json.loads(items)
    except json.JSONDecodeError:
        return {"error": "Invalid JSON for items parameter"}, 400

    if not isinstance(item_list, list):
        return {"error": "items must be a JSON array"}, 400

    with get_db() as conn:
        cur = conn.cursor(dictionary=True)

        compare_table = []

        for req in item_list:
            cat = req.get('category', '').upper()
            qty = int(req.get('quantity', 0))

            if not cat or qty <= 0:
                continue

            # For each supplier, find the best (lowest) total cost for this category
            cur.execute("""
                SELECT s.supplier_name, sq.brand,
                       MIN(sq.price) as best_unit_price
                FROM supplier_quotes sq
                JOIN suppliers s ON sq.supplier_id = s.id
                WHERE sq.category = %s AND sq.quality_tier IN ('HIGH', 'MEDIUM') AND sq.is_low_quality = 0
                  AND sq.price IS NOT NULL
                GROUP BY s.supplier_name, sq.brand
                ORDER BY s.supplier_name, best_unit_price ASC
            """, (cat,))
            rows = cur.fetchall()

            if not rows:
                continue

            # Get cheapest option per supplier
            from collections import defaultdict
            by_supplier = defaultdict(list)
            for r in rows:
                by_supplier[r['supplier_name']].append(float(r['best_unit_price']))

            for supplier, prices in by_supplier.items():
                best_unit = min(prices)
                total = round(best_unit * qty, 2)
                compare_table.append(CompareRow(
                    supplier=supplier,
                    category=cat,
                    items=qty,
                    total=total,
                    unit_avg=round(total / qty, 2)
                ))

        cur.close()

    # Sort by total ascending
    compare_table.sort(key=lambda x: x.total)

    return ProcureCompareResponse(compare_table=compare_table)


# GET /datacenter/stats/overview — 今日概览核心指标
@app.get("/datacenter/stats/overview")
def datacenter_stats_overview():
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT COUNT(*) as cnt FROM std_products")
        total_products = cur.fetchone()["cnt"]
        cur.execute("SELECT COUNT(*) as cnt FROM suppliers")
        total_suppliers = cur.fetchone()["cnt"]
        cur.execute("SELECT COUNT(*) as cnt FROM supplier_quotes WHERE DATE(created_at)=CURDATE()")
        quotes_today = cur.fetchone()["cnt"]
        cur.execute("SELECT COUNT(*) as cnt FROM supplier_quotes")
        total_quotes = cur.fetchone()["cnt"]
        cur.execute("""
            SELECT COUNT(*) as cnt FROM supplier_quotes
            WHERE confidence < 70 AND DATE(created_at)=CURDATE()
        """)
        low_conf_today = cur.fetchone()["cnt"]
        cur.execute("""
            SELECT COUNT(*) as cnt FROM correction_logs
            WHERE DATE(applied_at)=CURDATE()
        """)
        corrections_today = cur.fetchone()["cnt"]
        cur.close()
    return {
        "total_products": total_products,
        "total_suppliers": total_suppliers,
        "total_quotes": total_quotes,
        "quotes_today": quotes_today,
        "low_confidence_today": low_conf_today,
        "corrections_today": corrections_today,
    }


# GET /datacenter/quality/overview — 今日概览质量指标
@app.get("/datacenter/quality/overview")
def datacenter_quality_overview():
    with get_db() as conn:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT
                COUNT(*) as total_quotes,
                SUM(CASE WHEN confidence >= 80 THEN 1 ELSE 0 END) as high_quality,
                SUM(CASE WHEN confidence >= 50 AND confidence < 80 THEN 1 ELSE 0 END) as medium_quality,
                SUM(CASE WHEN confidence < 50 THEN 1 ELSE 0 END) as low_quality,
                AVG(confidence) as avg_confidence
            FROM supplier_quotes
            WHERE DATE(created_at) = CURDATE()
        """)
        row = cur.fetchone()
        cur.execute("""
            SELECT supplier_name, data_quality_score
            FROM suppliers ORDER BY data_quality_score DESC LIMIT 5
        """)
        top_suppliers = cur.fetchall()
        cur.execute("""
            SELECT category,
                   AVG(confidence) as avg_confidence,
                   COUNT(*) as quote_count
            FROM supplier_quotes
            WHERE DATE(created_at) = CURDATE()
            GROUP BY category
            ORDER BY avg_confidence ASC
            LIMIT 5
        """)
        lowest_categories = cur.fetchall()
        cur.close()
    return {
        "today_total": row["total_quotes"] or 0,
        "high_quality": row["high_quality"] or 0,
        "medium_quality": row["medium_quality"] or 0,
        "low_quality": row["low_quality"] or 0,
        "avg_confidence": float(row["avg_confidence"] or 0),
        "top_suppliers": top_suppliers,
        "lowest_categories": lowest_categories,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
