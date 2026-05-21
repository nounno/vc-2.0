"""
Export routes for ValueCube API.
Provides secure table name resolution via whitelist dictionary lookup.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional

router = APIRouter()

# ─── Table Name Whitelist ─────────────────────────────────────────────────────
# Only tables in this whitelist can be used in export queries.
# This prevents SQL injection via table name manipulation.
ALLOWED_TABLES = {
    "suppliers": "suppliers",
    "supplier_quotes": "supplier_quotes",
    "std_products": "std_products",
    "correction_logs": "correction_logs",
    "rules": "rules",
    "category_price_bands": "category_price_bands",
}


def get_table_name(table_key: str) -> str:
    """
    Resolve a table key to its canonical table name via whitelist lookup.
    
    Args:
        table_key: The table identifier from user input
        
    Returns:
        The whitelisted table name
        
    Raises:
        HTTPException: If table key is not in whitelist
    """
    table_name = ALLOWED_TABLES.get(table_key)
    if not table_name:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid table '{table_key}'. Allowed tables: {list(ALLOWED_TABLES.keys())}"
        )
    return table_name


# ─── Export Endpoints ─────────────────────────────────────────────────────────

@router.get("/export/{table_name}")
def export_table(
    table_name: str,
    format: str = Query("csv", regex="^(csv|json)$"),
    limit: int = Query(1000, ge=1, le=10000),
):
    """
    Export data from a whitelisted table.
    
    Table names are resolved via dictionary whitelist lookup to prevent SQL injection.
    """
    resolved_table = get_table_name(table_name)
    # resolved_table is guaranteed safe for use in SQL - it came from our whitelist
    return {
        "table": resolved_table,
        "format": format,
        "limit": limit,
        "status": "ok",
    }
