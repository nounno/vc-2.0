"""
Export routes for ValueCube API.
Provides secure table name resolution via whitelist dictionary lookup.
Phase 2: A-002 (context manager)
"""
import os
import csv
import io
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse

from app.auth import get_db

router = APIRouter()

# ─── Table Name Whitelist ─────────────────────────────────────────────────────
# Only tables in this whitelist can be used in export queries.
# This prevents SQL injection via table name manipulation.
# Note: "suppliers" key maps to "supplier_files" table (renamed in Phase 0).
ALLOWED_TABLES = {
    "suppliers": "supplier_files",
    "supplier_quotes": "supplier_quotes",
    "std_products": "std_products",
    "correction_logs": "correction_logs",
    "rules": "rules",
    "category_price_bands": "category_price_bands",
}


def get_table_name(table_key: str) -> str:
    """
    Resolve a table key to its canonical table name via whitelist lookup.
    """
    table_name = ALLOWED_TABLES.get(table_key)
    if not table_name:
        raise HTTPException(
            status_code=400,
            detail=f"无效的表名 '{table_key}'，允许的表: {list(ALLOWED_TABLES.keys())}"
        )
    return table_name


def get_table_row_count(table_name: str) -> int:
    """Get approximate row count for a table."""
    try:
        with get_db() as db:
            cur = db.cursor()
            cur.execute(f"SELECT COUNT(*) as cnt FROM {table_name}")
            row = cur.fetchone()
            cur.close()
            return row["cnt"] if row else 0
    except Exception:
        return 0


def generate_csv_stream(table_name: str, limit: int):
    """Generate CSV rows as an iterator for streaming response."""
    with get_db() as db:
        cur = db.cursor()
        try:
            cur.execute(f"SELECT * FROM {table_name} LIMIT %s", (limit,))
            columns = [desc[0] for desc in cur.description] if cur.description else []

            # Write header with UTF-8 BOM (required for Excel compatibility)
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(columns)
            yield "\ufeff" + output.getvalue()
            output.close()

            # Write rows
            for row in cur:
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerow([str(row.get(col, "")) for col in columns])
                yield output.getvalue()
                output.close()
        finally:
            cur.close()


# ─── Export Endpoints ─────────────────────────────────────────────────────────

@router.get("/export/{table_name}")
def export_table(
    table_name: str,
    format: str = Query("csv", regex="^(csv|json)$"),
    limit: int = Query(1000, ge=1, le=10000),
):
    """
    Export data from a whitelisted table.
    """
    resolved_table = get_table_name(table_name)

    try:
        if format == "csv":
            # Return streaming CSV response
            return StreamingResponse(
                generate_csv_stream(resolved_table, limit),
                media_type="text/csv; charset=utf-8",
                headers={
                    "Content-Disposition": f"attachment; filename=\"{table_name}.csv\""
                }
            )
        else:
            # Return JSON array
            with get_db() as db:
                cur = db.cursor()
                try:
                    cur.execute(f"SELECT * FROM {resolved_table} LIMIT %s", (limit,))
                    rows = cur.fetchall()
                    # Convert datetime/bytes values to strings for JSON serialization
                    serializable_rows = []
                    for row in rows:
                        serializable_row = {}
                        for key, value in row.items():
                            if isinstance(value, (bytes, bytearray)):
                                serializable_row[key] = value.decode("utf-8", errors="replace")
                            elif hasattr(value, "isoformat"):
                                serializable_row[key] = value.isoformat()
                            elif hasattr(value, "__float__"):  # Decimal
                                serializable_row[key] = float(value)
                            else:
                                serializable_row[key] = value
                        serializable_rows.append(serializable_row)
                    return JSONResponse(
                        content=serializable_rows,
                        media_type="application/json",
                        headers={
                            "Content-Disposition": f"attachment; filename=\"{table_name}.json\""
                        }
                    )
                finally:
                    cur.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="导出失败，请联系管理员")


@router.get("/export/{table_name}/count")
def export_table_count(table_name: str):
    """Get approximate row count for a table (for UI display)."""
    resolved_table = get_table_name(table_name)
    count = get_table_row_count(resolved_table)
    return {"table": table_name, "resolved_table": resolved_table, "row_count": count}
