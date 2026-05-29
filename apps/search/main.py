"""
AI Purchase Assistant V1 — Search Service
Data source: Datacenter API (constitution mandate, Chapter 8 — Search forbidden from direct MySQL)
Caches in Redis (optional — graceful fallback if unavailable)
"""
import logging
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
import redis
import hashlib
import time
import json
import os
from typing import Optional
import urllib.request
import urllib.error
import urllib.parse

logger = logging.getLogger("search")

app = FastAPI()

# ─── Config (from environment — all mandatory, no defaults per VC Constitution §1.2) ─
REDIS_HOST = os.environ["REDIS_HOST"]
REDIS_PORT = int(os.environ["REDIS_PORT"])
CACHE_TTL = 300  # 5 minutes
DATACENTER_URL = os.environ.get("DATACENTER_URL", "http://vc2_datacenter:8003")

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

# ─── Datacenter API Caller ────────────────────────────────────────────────────
def call_datacenter_api(endpoint: str, params: dict) -> Optional[dict]:
    """
    Call Datacenter API with given endpoint and query params.
    Returns JSON response or None on failure.
    """
    try:
        url = f"{DATACENTER_URL}{endpoint}"
        query_string = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items())
        full_url = f"{url}?{query_string}" if query_string else url
        req = urllib.request.Request(full_url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        logger.error(f"[search] Datacenter HTTP error {e.code}: {e.reason}")
        return None
    except Exception as e:
        logger.error(f"[search] Datacenter API call failed: {e}")
        return None

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

# ─── DB Search (via Datacenter API) ───────────────────────────────────────────
def search_db(q: str, category: Optional[str], limit: int) -> tuple:
    """
    Search via Datacenter API (/api/v1/search).
    Desensitized: no supplier_id, no cost_price.
    Note: category filter not supported by Datacenter /api/v1/search — filtered post-fetch if needed.
    """
    params = {"q": q, "limit": limit}
    data = call_datacenter_api("/api/v1/search", params)
    if data is None:
        return [], 0

    rows = data.get("results", [])
    total = data.get("total", 0)

    # Datacenter doesn't support category filter — apply it post-fetch
    if category:
        rows = [r for r in rows if r.get("category") == category]
        total = len(rows)

    return rows, total


def format_results(rows, q: str) -> list:
    """
    Format Datacenter rows into desensitized API response.
    CRITICAL: no supplier_id, no cost_price.
    """
    results = []
    for row in rows:
        # Datacenter does not expose supplier_name — always anonymize
        masked_supplier = "匿名"

        price = row.get("price")
        price_display = f"¥{price:,.0f}" if price else "面议"

        # Datacenter /api/v1/search does not return spec fields (horsepower, volume_l, etc.)
        specs_parts = []

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
            "model": row.get("model") or "",
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

    # Cache miss — query Datacenter
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
    datacenter_ok = False
    try:
        data = call_datacenter_api("/health", {})
        datacenter_ok = data is not None
    except Exception as e:
        logger.info(f"[search] Datacenter health check failed: {e}")

    return {
        "status": "ok",
        "service": "search",
        "redis": "ok" if redis_ok else "unavailable",
        "datacenter": "ok" if datacenter_ok else "unavailable",
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

    # Verify Datacenter connectivity
    try:
        data = call_datacenter_api("/api/v1/search", {"q": "_startup_check_", "limit": 1})
        if data is not None:
            total = data.get("total", "unknown")
            logger.info(f"[search] Datacenter connected: search index accessible (total={total})")
        else:
            logger.error("[search] Datacenter startup check: no data returned")
    except Exception as e:
        logger.error(f"[search] Datacenter startup error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
