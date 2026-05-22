"""
AI Purchase Assistant V1 — Search Service
Data source: MySQL 8.4 (constitution mandate, Chapter 8)
Caches in Redis (optional — graceful fallback if unavailable)
"""
import logging
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
import mysql.connector
from mysql.connector import pooling
import redis
import hashlib
import time
import json
import os
from typing import Optional

logger = logging.getLogger("search")

app = FastAPI()

# ─── Config (from environment — all mandatory, no defaults per VC Constitution §1.2) ─
MYSQL_HOST = os.environ["MYSQL_HOST"]
MYSQL_PORT = int(os.environ["MYSQL_PORT"])
MYSQL_USER = os.environ["MYSQL_USER"]
MYSQL_PASSWORD = os.environ["MYSQL_PASSWORD"]
MYSQL_DATABASE = os.environ["MYSQL_DATABASE"]
REDIS_HOST = os.environ["REDIS_HOST"]
REDIS_PORT = int(os.environ["REDIS_PORT"])
CACHE_TTL = 300  # 5 minutes

# ─── Redis (graceful fallback) ────────────────────────────────────────────────
_redis = None
def get_redis():
    global _redis
    if _redis is None:
        try:
            _redis = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True, socket_connect_timeout=2)
            _redis.ping()
        except Exception:
            _redis = None
    return _redis

# ─── MySQL Connection Pool ─────────────────────────────────────────────────────
_db_pool = None
def get_pool():
    global _db_pool
    if _db_pool is None:
        _db_pool = pooling.MySQLConnectionPool(
            pool_name="search_pool",
            pool_size=5,
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            connection_timeout=5,
            charset="utf8mb4",
            collation="utf8mb4_unicode_ci",
        )
    return _db_pool

# ─── Cache helpers ────────────────────────────────────────────────────────────
def build_cache_key(q: str, category: Optional[str], limit: int) -> str:
    key_data = q.lower() + (category or "") + str(limit)
    return f"search:{hashlib.md5(key_data.encode()).hexdigest()}"

def get_cached(cache_key: str) -> Optional[dict]:
    r = get_redis()
    if r is None:
        return None
    try:
        cached = r.get(cache_key)
        return json.loads(cached) if cached else None
    except Exception:
        return None

def set_cached(cache_key: str, data: dict, ttl: int = CACHE_TTL):
    r = get_redis()
    if r is None:
        return
    try:
        r.setex(cache_key, ttl, json.dumps(data, ensure_ascii=False))
    except Exception:
        pass

# ─── DB Search ─────────────────────────────────────────────────────────────────
def search_db(q: str, category: Optional[str], limit: int) -> tuple:
    """
    Search supplier_quotes + std_products JOIN on MySQL.
    Desensitized: no supplier_id, no cost_price.
    """
    pool = get_pool()
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)

        pattern = f"%{q}%"
        params = [pattern, pattern, pattern, pattern]

        sql = """
            SELECT
                sq.id,
                sq.brand,
                sq.category,
                sq.model_raw,
                sq.model_std,
                sq.price,
                sq.price_type,
                sq.quality_tier,
                sq.confidence,
                sp.horsepower,
                sp.volume_l,
                sp.capacity_kg,
                sp.screen_size,
                s.supplier_name AS supplier_name_raw
            FROM supplier_quotes sq
            LEFT JOIN std_products sp ON sq.product_uuid = sp.product_uuid
            LEFT JOIN suppliers s ON sq.supplier_id = s.id
            WHERE (sq.brand LIKE %s OR sq.model_raw LIKE %s OR sq.model_std LIKE %s OR sq.category LIKE %s)
        """
        if category:
            sql += " AND sq.category = %s"
            params.append(category)

        # Count total
        count_sql = "SELECT COUNT(*) AS total FROM (" + sql + ") AS t"
        cursor.execute(count_sql, params)
        total = cursor.fetchone()["total"]

        # Main results
        sql += " ORDER BY sq.confidence DESC LIMIT %s"
        params.append(limit)
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        return rows, total
    except mysql.connector.Error as e:
        logger.error(f"[search] MySQL error: {e}")
        return [], 0
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def format_results(rows, q: str) -> list:
    """
    Format DB rows into desensitized API response.
    CRITICAL: no supplier_id, no cost_price.
    """
    results = []
    for row in rows:
        supplier_name = row.get("supplier_name_raw") or ""
        masked_supplier = supplier_name[0] + "***" if supplier_name else "匿名"

        price = row.get("price")
        price_display = f"¥{price:,.0f}" if price else "面议"

        specs_parts = []
        if row.get("horsepower"):
            specs_parts.append(row["horsepower"])
        if row.get("volume_l"):
            specs_parts.append(str(row["volume_l"]) + "L")
        if row.get("capacity_kg"):
            specs_parts.append(str(row["capacity_kg"]) + "kg")
        if row.get("screen_size"):
            specs_parts.append(str(row["screen_size"]) + "英寸")

        quality_tier = row.get("quality_tier") or ""
        if quality_tier == "HIGH":
            freshness = "REALTIME"
        elif quality_tier == "MEDIUM":
            freshness = "VALID"
        elif quality_tier == "LOW":
            freshness = "STALE"
        else:
            freshness = "ARCHIVED"

        results.append({
            "id": row["id"],
            "brand": row.get("brand"),
            "model": row.get("model_raw") or row.get("model_std") or "",
            "category": row.get("category"),
            "price": price_display,
            "price_type": row.get("price_type") or "",
            "quality_tier": quality_tier,
            "freshness": freshness,
            "confidence": round(float(row.get("confidence") or 0), 1),
            "supplier": masked_supplier,
            "specs": " / ".join(specs_parts) if specs_parts else "",
        })
    return results


# ─── API Endpoints ────────────────────────────────────────────────────────────
@app.get("/search")
def search(
    q: str = Query(..., description="Search query", min_length=1),
    category: Optional[str] = Query(None, description="Category filter: ac, refrigerator, washer, tv"),
    limit: int = Query(20, description="Results limit", ge=1, le=100),
):
    start_time = time.time()
    cache_key = build_cache_key(q, category, limit)

    # Cache hit
    cached = get_cached(cache_key)
    if cached:
        elapsed_ms = int((time.time() - start_time) * 1000)
        return JSONResponse(content={
            **cached,
            "query": q,
            "cached": True,
            "response_time_ms": elapsed_ms,
        })

    # Cache miss — query MySQL
    rows, total = search_db(q, category, limit)
    results = format_results(rows, q)
    elapsed_ms = int((time.time() - start_time) * 1000)

    response = {
        "results": results,
        "total": total,
        "query": q,
        "cached": False,
        "response_time_ms": elapsed_ms,
    }

    if not results:
        response["suggestions"] = [
            "尝试更宽泛的关键词",
            "检查品类筛选是否过严",
            "尝试品牌名而非具体型号",
        ]

    if results:
        set_cached(cache_key, {"results": results, "total": total})

    return JSONResponse(content=response)


@app.get("/search/health")
def health():
    r = get_redis()
    redis_ok = r is not None
    pool = get_pool()
    db_ok = False
    try:
        conn = pool.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        db_ok = True
    except Exception as e:
        logger.info(f"[search] MySQL health check failed: {e}")

    return {
        "status": "ok",
        "service": "search",
        "redis": "ok" if redis_ok else "unavailable",
        "database": "ok" if db_ok else "unavailable",
    }


@app.on_event("startup")
async def startup():
    r = get_redis()
    if r:
        try:
            r.ping()
            logger.info("[search] Redis connected")
        except Exception as e:
            logger.warning(f"[search] Redis unavailable: {e}")
    pool = get_pool()
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM supplier_quotes LIMIT 1")
        count = cursor.fetchone()[0]
        logger.info(f"[search] MySQL connected: {count} quotes indexed")
    except mysql.connector.Error as e:
        logger.error(f"[search] MySQL startup check: {e}")
    except Exception as e:
        logger.error(f"[search] MySQL startup error: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
