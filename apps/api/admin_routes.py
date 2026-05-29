"""
Admin Management API Routes
Covers: brands, categories, columns, products, accounts, logs, pipeline
"""
import math
from datetime import datetime
from typing import Optional, List, Any

from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel

from app.auth import get_db, require_auth

router = APIRouter(tags=["admin"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class BrandSummary(BaseModel):
    total_brands: int
    top_brands: list[dict]


class PriceBand(BaseModel):
    id: int
    category: str
    price_min: float
    price_max: float
    band_label: str


class ColumnMapping(BaseModel):
    id: int
    source_table: str
    source_col: str
    std_col: str
    data_type: str
    transform_rule: Optional[str]
    is_active: int


class Product(BaseModel):
    id: int
    product_uuid: str
    brand: str
    category: str
    model_std: str
    model_raw: Optional[str]
    horsepower: Optional[str]
    volume_l: Optional[str]
    capacity_kg: Optional[str]
    screen_size: Optional[str]
    subsidy_code: Optional[str]
    created_at: Optional[datetime]


class Account(BaseModel):
    id: int
    username: str
    created_at: Optional[datetime]


class AccountStats(BaseModel):
    total_accounts: int
    active_accounts: int
    inactive_accounts: int
    avg_quality_score: float


class LogEntry(BaseModel):
    id: int
    level: str
    module: str
    action: str
    message: Optional[str]
    operator: Optional[str]
    target_type: Optional[str]
    target_id: Optional[str]
    ip_address: Optional[str]
    created_at: Optional[datetime]


class LogStats(BaseModel):
    total: int
    by_level: dict
    by_module: dict


class PipelineTask(BaseModel):
    id: int
    task_name: str
    task_type: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    record_count: int
    error_message: Optional[str]


class PipelineLog(BaseModel):
    id: int
    level: str
    module: str
    message: Optional[str]
    created_at: Optional[datetime]


class ApiResponse(BaseModel):
    data: Any
    total: Optional[int] = None
    page: Optional[int] = None
    page_size: Optional[int] = None


class PipelineStats(BaseModel):
    total_tasks: int
    running_tasks: int
    stopped_tasks: int
    error_tasks: int
    total_records_today: int
    avg_duration_ms: float
    success_rate: float


# ---------------------------------------------------------------------------
# 1. /suppliers/quality  → brands page
# ---------------------------------------------------------------------------
@router.get("/suppliers/quality")
def get_suppliers_quality(current_user: dict = Depends(require_auth())):
    """返回各供应商质量数据，供品牌管理页面展示"""
    with get_db() as db:
        cur = db.cursor()
        cur.execute("""
            SELECT id, supplier_name, total_brands, total_records,
                   data_quality_score, avg_price, freshness
            FROM supplier_files ORDER BY data_quality_score DESC
        """)
        rows = cur.fetchall()
        cur.close()
    return {"suppliers": [
        {**dict(r), "brand_count": r.get("total_brands") or 0} for r in rows
    ]}

# ── suppliers/freshness ───────────────────────────────────────────────────
@router.get("/suppliers/freshness")
def get_suppliers_freshness(current_user: dict = Depends(require_auth())):
    """返回供应商数据新鲜度"""
    with get_db() as db:
        cur = db.cursor()
        cur.execute("SELECT supplier_name, freshness, updated_at FROM supplier_files")
        rows = cur.fetchall()
        cur.close()
    return {"suppliers": [dict(r) for r in rows]}


# ---------------------------------------------------------------------------
# 2. /categories/price-bands  → categories page
# ---------------------------------------------------------------------------
@router.get("/categories/price-bands")
def get_price_bands(current_user: dict = Depends(require_auth())):
    """返回品类价格带，供品类管理页面展示"""
    with get_db() as db:
        cur = db.cursor()
        cur.execute("""
            SELECT id,
                   CONVERT(BINARY(CONVERT(category USING latin1)) USING utf8mb4) as category,
                   price_min, price_max, price_avg, price_p25, price_p75,
                   sample_count,
                   CONVERT(BINARY(CONVERT(brand USING latin1)) USING utf8mb4) as brand,
                   updated_at
            FROM category_price_bands
            ORDER BY category, price_min
        """)
        rows = cur.fetchall()
        cur.close()
    return {"price_bands": [dict(r) for r in rows]}


# ---------------------------------------------------------------------------
# 3. /columns  → column mapping page
# ---------------------------------------------------------------------------
@router.get("/columns")
def get_columns(
    current_user: dict = Depends(require_auth()),
    source_table: Optional[str] = None,
    std_col: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """返回列名映射配置"""
    with get_db() as db:
        cur = db.cursor()

        where = []
        params = []
        if source_table:
            where.append("source_table = %s")
            params.append(source_table)
        if std_col:
            where.append("std_col = %s")
            params.append(std_col)

        where_clause = " AND ".join(where) if where else "1=1"

        cur.execute(f"SELECT COUNT(*) as total FROM column_mappings WHERE {where_clause}", params)
        total = cur.fetchone()["total"]

        offset = (page - 1) * page_size
        cur.execute(f"""
            SELECT id, source_table, source_col, std_col, data_type,
                   transform_rule, is_active, created_at
            FROM column_mappings
            WHERE {where_clause}
            ORDER BY source_table, source_col
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        rows = cur.fetchall()
        cur.close()

    return {
        "data": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size),
    }


# ---------------------------------------------------------------------------
# 4. /products  → products page
# ---------------------------------------------------------------------------
@router.get("/products")
def get_products(
    current_user: dict = Depends(require_auth()),
    search: Optional[str] = None,
    brand: Optional[str] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """返回标准商品列表（分页）"""
    with get_db() as db:
        cur = db.cursor()

        where = []
        params = []
        if search:
            where.append("(brand LIKE %s OR model_std LIKE %s OR model_raw LIKE %s)")
            p = f"%{search}%"
            params.extend([p, p, p])
        if brand:
            where.append("brand = %s")
            params.append(brand)
        if category:
            where.append("category = %s")
            params.append(category)

        where_clause = " AND ".join(where) if where else "1=1"

        cur.execute(f"SELECT COUNT(*) as total FROM std_products WHERE {where_clause}", params)
        total = cur.fetchone()["total"]

        offset = (page - 1) * page_size
        cur.execute(f"""
            SELECT id, product_uuid,
                   CONVERT(BINARY(CONVERT(brand USING latin1)) USING utf8mb4) as brand,
                   CONVERT(BINARY(CONVERT(category USING latin1)) USING utf8mb4) as category,
                   model_std, model_raw,
                   horsepower, volume_l, capacity_kg, screen_size,
                   subsidy_code, created_at
            FROM std_products
            WHERE {where_clause}
            ORDER BY id DESC
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        rows = cur.fetchall()
        cur.close()

    return {
        "data": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size),
    }


# ---------------------------------------------------------------------------
# 5. /admin/accounts  → accounts page
# ---------------------------------------------------------------------------
@router.get("/admin/accounts")
def get_accounts(
    current_user: dict = Depends(require_auth()),
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    """返回账号列表"""
    with get_db() as db:
        cur = db.cursor()

        # admins 表只有 username
        where = []
        params = []
        if search:
            where.append("username LIKE %s")
            params.append(f"%{search}%")
        where_clause = " AND ".join(where) if where else "1=1"

        cur.execute(f"SELECT COUNT(*) as total FROM admins WHERE {where_clause}", params)
        total = cur.fetchone()["total"]

        offset = (page - 1) * page_size
        cur.execute(f"""
            SELECT id, username, created_at
            FROM admins
            WHERE {where_clause}
            ORDER BY id DESC
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        rows = cur.fetchall()
        cur.close()

    # 补齐前端需要的字段
    data = []
    for r in rows:
        d = dict(r)
        d["account_status"] = "active"
        d["quality_score"] = 100.0
        d["total_quotes"] = 0
        d["pending_quotes"] = 0
        d["approved_quotes"] = 0
        d["rejected_quotes"] = 0
        d["supplier_name"] = "ValueCube Admin"
        d["contact_name"] = d["username"]
        d["contact_phone"] = ""
        d["contact_email"] = ""
        d["last_active_at"] = d.get("created_at")
        data.append(d)

    return {"data": data, "total": total, "page": page, "page_size": page_size}


@router.get("/admin/accounts/stats")
def get_accounts_stats(current_user: dict = Depends(require_auth())):
    """账号统计"""
    with get_db() as db:
        cur = db.cursor()
        cur.execute("SELECT COUNT(*) as total FROM admins")
        total = cur.fetchone()["total"]
        cur.close()
    return {
        "total_accounts": total,
        "active_accounts": total,
        "inactive_accounts": 0,
        "suspended_accounts": 0,
        "avg_quality_score": 100.0,
    }


# ---------------------------------------------------------------------------
# 6. /admin/logs  → logs page
# ---------------------------------------------------------------------------
@router.get("/admin/logs")
def get_logs(
    current_user: dict = Depends(require_auth()),
    level: Optional[str] = None,
    module: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """返回操作日志（分页）"""
    with get_db() as db:
        cur = db.cursor()

        where = []
        params = []
        if level:
            where.append("level = %s")
            params.append(level)
        if module:
            where.append("module = %s")
            params.append(module)
        if search:
            where.append("message LIKE %s")
            params.append(f"%{search}%")
        if start_date:
            where.append("created_at >= %s")
            params.append(start_date)
        if end_date:
            where.append("created_at <= %s")
            params.append(end_date)

        where_clause = " AND ".join(where) if where else "1=1"

        cur.execute(f"SELECT COUNT(*) as total FROM operation_logs WHERE {where_clause}", params)
        total = cur.fetchone()["total"]

        offset = (page - 1) * page_size
        cur.execute(f"""
            SELECT id, level, module, action, message, operator,
                   target_type, target_id, ip_address, created_at
            FROM operation_logs
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        rows = cur.fetchall()
        cur.close()

    return {"data": [dict(r) for r in rows], "total": total, "page": page, "page_size": page_size}


@router.get("/admin/logs/stats")
def get_logs_stats(current_user: dict = Depends(require_auth())):
    """日志统计"""
    with get_db() as db:
        cur = db.cursor()
        cur.execute("SELECT COUNT(*) as total FROM operation_logs")
        total = cur.fetchone()["total"]

        cur.execute("""
            SELECT level, COUNT(*) as cnt FROM operation_logs GROUP BY level
        """)
        by_level = {r["level"]: r["cnt"] for r in cur.fetchall()}

        cur.execute("""
            SELECT module, COUNT(*) as cnt FROM operation_logs GROUP BY module ORDER BY cnt DESC LIMIT 10
        """)
        by_module = {r["module"]: r["cnt"] for r in cur.fetchall()}

        cur.close()
    return {"total": total, "by_level": by_level, "by_module": by_module}


# ---------------------------------------------------------------------------
# 7. /pipeline/*  → pipeline page
# ---------------------------------------------------------------------------
@router.get("/pipeline/stats")
def get_pipeline_stats(current_user: dict = Depends(require_auth())):
    """Pipeline统计 — 真实数据源：supplier_files(任务) + supplier_quotes(记录)"""
    with get_db() as db:
        cur = db.cursor()

        # 总任务数 = supplier_files 中有实际数据的供应商
        cur.execute("""
            SELECT COUNT(*) as total FROM supplier_files
            WHERE total_records > 0 OR source_file IS NOT NULL
        """)
        total = cur.fetchone()["total"]

        # 运行中任务 = freshness='live' 的供应商
        cur.execute("SELECT COUNT(*) as running FROM supplier_files WHERE freshness='live'")
        running = cur.fetchone()["running"]

        # 待处理任务 = freshness='pending'
        cur.execute("SELECT COUNT(*) as pending FROM supplier_files WHERE freshness='pending'")
        pending = cur.fetchone()["pending"]

        # 错误任务（暂用freshness='archived'标记失败）
        cur.execute("SELECT COUNT(*) as error FROM supplier_files WHERE freshness='archived'")
        error = cur.fetchone()["error"]

        # 今日入库记录数
        cur.execute("""
            SELECT COUNT(*) as today FROM supplier_quotes
            WHERE DATE(created_at) = CURDATE()
        """)
        today_result = cur.fetchone()["today"]
        total_records_today = today_result if today_result else 0

        # 总入库记录数
        cur.execute("SELECT COUNT(*) as records FROM supplier_quotes")
        total_records = cur.fetchone()["records"]

        # 成功率 = 有quality_tier的记录中高置信度占比
        cur.execute("""
            SELECT COUNT(*) as high_quality FROM supplier_quotes
            WHERE quality_tier = 'HIGH'
        """)
        high_quality = cur.fetchone()["high_quality"]
        success_rate = (high_quality / total_records) if total_records > 0 else 0.0

        # avg_duration_ms：暂无correction_logs时间戳，先设为0
        avg_duration_ms = 0.0

        cur.close()
    return ApiResponse(data={
        "total_tasks": total,
        "running_tasks": running,
        "stopped_tasks": pending,
        "error_tasks": error,
        "total_records_today": total_records_today,
        "avg_duration_ms": avg_duration_ms,
        "success_rate": success_rate,
    })


@router.get("/pipeline/tasks")
def get_pipeline_tasks(
    current_user: dict = Depends(require_auth()),
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Pipeline任务列表 — 真实数据源：supplier_files"""
    with get_db() as db:
        cur = db.cursor()

        # 状态过滤映射：前端status → supplier_files.freshness
        freshness_map = {
            "running": "live",
            "stopped": "pending",
            "error": "archived",
            "completed": "live",
        }
        where = []
        params = []
        if status and status != "all":
            freshness = freshness_map.get(status)
            if freshness:
                where.append("freshness = %s")
                params.append(freshness)

        where_clause = " AND ".join(where) if where else "1=1"

        cur.execute(f"SELECT COUNT(*) as total FROM supplier_files WHERE {where_clause}", params)
        total = cur.fetchone()["total"]

        offset = (page - 1) * page_size
        cur.execute(f"""
            SELECT
                id,
                supplier_name,
                supplier_code,
                source_file,
                total_records,
                freshness,
                data_quality_score,
                parse_success_rate,
                avg_price,
                created_at,
                updated_at
            FROM supplier_files
            WHERE {where_clause}
            ORDER BY updated_at DESC
            LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        rows = cur.fetchall()
        cur.close()

    now = datetime.now().isoformat()
    tasks = []
    for r in rows:
        freshness = r.get("freshness", "pending")
        status_map = {
            "live": "running",
            "pending": "stopped",
            "archived": "error",
            "valid": "completed",
        }
        task_status = status_map.get(freshness, "stopped")
        tasks.append({
            "id": str(r.get("id", "")),
            "name": r.get("supplier_name", "未知供应商"),
            "description": r.get("source_file") or "",
            "type": "batch",
            "status": task_status,
            "schedule": "",
            "last_run_at": r.get("updated_at").isoformat() if r.get("updated_at") else "",
            "next_run_at": "",
            "duration_ms": 0,
            "progress": int(r.get("parse_success_rate", 0) or 0),
            "records_processed": r.get("total_records", 0) or 0,
            "error_message": None,
            "created_at": r.get("created_at").isoformat() if r.get("created_at") else now,
            "updated_at": r.get("updated_at").isoformat() if r.get("updated_at") else now,
        })
    return ApiResponse(data=tasks, total=total, page=page, page_size=page_size)


@router.get("/pipeline/logs")
def get_pipeline_logs(
    current_user: dict = Depends(require_auth()),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Pipeline日志（从operation_logs读取）"""
    with get_db() as db:
        cur = db.cursor()
        pattern = '%pipeline%'
        cur.execute("""
            SELECT COUNT(*) as total FROM operation_logs
            WHERE module IN ('pipeline','datacenter','pipeline-rules','pipeline-parse','pipeline-dedup')
               OR message LIKE %s
        """, [pattern])
        total = cur.fetchone()["total"]
        offset = (page - 1) * page_size
        cur.execute("""
            SELECT id, level, module, message, created_at
            FROM operation_logs
            WHERE module IN ('pipeline','datacenter','pipeline-rules','pipeline-parse','pipeline-dedup')
               OR message LIKE %s
            ORDER BY created_at DESC LIMIT %s OFFSET %s
        """, [pattern, page_size, offset])
        rows = cur.fetchall()
        cur.close()
    # Map to PipelineLog interface
    logs = []
    for r in rows:
        raw_level = r.get("level", "")
        # Map level to status: INFO->started, ERROR->failed
        if raw_level == "INFO":
            status = "started"
        elif raw_level == "ERROR":
            status = "failed"
        else:
            status = "started"
        logs.append({
            "id": str(r.get("id", "")),
            "task_id": "",
            "task_name": r.get("module", ""),
            "status": status,
            "started_at": r.get("created_at").isoformat() if r.get("created_at") else "",
            "completed_at": None,
            "duration_ms": None,
            "records_processed": 0,
            "error_message": r.get("message"),
        })
    return ApiResponse(data=logs, total=total, page=page, page_size=page_size)


@router.get("/pipeline/tasks/{task_id}/status")
def get_pipeline_task_status(task_id: int, current_user: dict = Depends(require_auth())):
    with get_db() as db:
        cur = db.cursor()
        cur.execute("SELECT id, action as task_name, 'completed' as status FROM correction_logs WHERE id=%s", [task_id])
        row = cur.fetchone()
        cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="任务不存在")
    return dict(row)


@router.post("/pipeline/tasks/{task_id}/trigger")
def trigger_pipeline_task(task_id: int, current_user: dict = Depends(require_auth())):
    return {"message": "triggered", "task_id": task_id}


# --------------------------------------------------------------------------
# 8. /admin/brands  → brands page
# --------------------------------------------------------------------------
@router.get("/admin/brands")
def get_admin_brands(current_user: dict = Depends(require_auth())):
    """获取品牌列表及商品数量"""
    with get_db() as db:
        cur = db.cursor()
        cur.execute("""
            SELECT CONVERT(BINARY(CONVERT(brand USING latin1)) USING utf8mb4) as brand,
                   COUNT(*) as product_count
            FROM std_products
            GROUP BY CONVERT(BINARY(CONVERT(brand USING latin1)) USING utf8mb4)
            ORDER BY product_count DESC
        """)
        rows = cur.fetchall()
        cur.close()
    return {"brands": [dict(r) for r in rows], "total": len(rows)}


# --------------------------------------------------------------------------
# 9. /admin/categories  → categories page
# --------------------------------------------------------------------------
@router.get("/admin/categories")
def get_admin_categories(current_user: dict = Depends(require_auth())):
    """获取品类列表及商品数量"""
    with get_db() as db:
        cur = db.cursor()
        cur.execute("""
            SELECT CONVERT(BINARY(CONVERT(category USING latin1)) USING utf8mb4) as category,
                   COUNT(*) as product_count
            FROM std_products
            GROUP BY CONVERT(BINARY(CONVERT(category USING latin1)) USING utf8mb4)
            ORDER BY product_count DESC
        """)
        rows = cur.fetchall()
        cur.close()
    return {"categories": [dict(r) for r in rows], "total": len(rows)}


# --------------------------------------------------------------------------
# 10. /admin/columns  → column mapping page (admin namespace)
# --------------------------------------------------------------------------
@router.get("/admin/columns")
def get_admin_columns(
    current_user: dict = Depends(require_auth()),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """获取字段映射配置"""
    with get_db() as db:
        cur = db.cursor()

        cur.execute("SELECT COUNT(*) as total FROM column_mappings")
        total = cur.fetchone()["total"]

        offset = (page - 1) * page_size
        cur.execute("""
            SELECT id, source_table, source_col, std_col, data_type,
                   transform_rule, is_active, created_at
            FROM column_mappings
            ORDER BY source_table, source_col
            LIMIT %s OFFSET %s
        """, [page_size, offset])
        rows = cur.fetchall()
        cur.close()

    return {
        "columns": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total > 0 else 0,
    }
