"""
Backfill raw_data for existing parse_row_staging rows.
Reads the original Excel file, re-runs the header detection and cell extraction,
generates raw_data strings matching the format: "品牌: 格力 | 型号: KFR-35GW/..."

Usage: docker cp this file to vc2_api container, then run:
  python3 backfill_rawdata.py --job 10
  python3 backfill_rawdata.py --all
"""

import os
import sys
import json
import argparse
import re

# --- Import existing parser utilities ---
from parser_core import (
    find_header_row, expand_merged_cells, clean_rows,
    col_to_num, parse_xlsx_xml
)

# --- DB connection ---
def get_db():
    import pymysql
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST", "mysql"),
        port=int(os.getenv("MYSQL_PORT", 3306)),
        user="valuecube",
        password=os.getenv("MYSQL_PASSWORD", "Vc@2026#db"),
        database="valuecube",
        cursorclass=pymysql.cursors.DictCursor,
        charset="utf8mb4",
        autocommit=True,
    )


def generate_raw_data_for_rows(file_bytes, sheet_name, rows_in_sheet, header_row_idx, headers):
    """
    Reconstruct raw_data strings for rows in a given sheet.
    Returns dict: row_index -> raw_data_string
    """
    
    data_rows = rows_in_sheet[header_row_idx + 1:]
    merged_ranges = []
    data_rows = expand_merged_cells(data_rows, merged_ranges)
    data_rows = clean_rows(data_rows, len(headers))
    
    result = {}
    for row in data_rows:
        raw_cells = row["cells"]
        sorted_letters = sorted(raw_cells.keys(), key=lambda l: col_to_num(l))
        raw_items = []
        for i, letter in enumerate(sorted_letters):
            hdr = headers[i] if i < len(headers) else letter
            val = str(raw_cells[letter]) if raw_cells.get(letter) is not None else ""
            if val.strip():
                raw_items.append(f"{hdr}: {val.strip()}")
        result[row["row_num"]] = " | ".join(raw_items)
    
    return result


def backfill_job(job_id, file_path):
    """Backfill raw_data for a single job."""
    print(f"\nProcessing job {job_id}: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"  FILE NOT FOUND: {file_path}")
        return 0
    
    # Read file
    with open(file_path, "rb") as f:
        file_bytes = f.read()
    
    # Parse sheets
    sheets = parse_xlsx_xml(file_bytes)
    print(f"  Found {len(sheets)} sheet(s)")
    
    total_updated = 0
    db = get_db()
    
    try:
        for sheet in sheets:
            sheet_name = sheet["name"]
            rows_data = sheet["rows"]
            
            if not rows_data:
                continue
            
            # Detect header
            header_row_idx = find_header_row(rows_data)
            first_row = rows_data[header_row_idx]
            header_cells = first_row["cells"]
            sorted_cols = sorted(header_cells.keys(), key=lambda l: col_to_num(l))
            headers = [header_cells[c] for c in sorted_cols]
            
            # Generate raw_data for each data row
            raw_data_map = generate_raw_data_for_rows(
                file_bytes, sheet_name, rows_data, header_row_idx, headers
            )
            
            print(f"  Sheet '{sheet_name}': {len(raw_data_map)} rows with raw_data")
            
            # Update DB
            with db.cursor() as cur:
                for row_index, raw_str in raw_data_map.items():
                    cur.execute(
                        "UPDATE parse_row_staging SET raw_data = %s "
                        "WHERE job_id = %s AND sheet_name = %s AND row_index = %s",
                        (json.dumps(raw_str), job_id, sheet_name, row_index),
                    )
                    if cur.rowcount > 0:
                        total_updated += 1
            
            db.commit()
    
    finally:
        db.close()
    
    print(f"  Updated {total_updated} rows")
    return total_updated


def main():
    parser = argparse.ArgumentParser(description="Backfill raw_data for existing parser jobs")
    parser.add_argument("--job", type=int, help="Backfill a specific job ID")
    parser.add_argument("--all", action="store_true", help="Backfill all jobs with missing raw_data")
    args = parser.parse_args()
    
    if args.job:
        # Get file path for this job
        db = get_db()
        try:
            with db.cursor() as cur:
                cur.execute("SELECT id, file_path, original_filename FROM parse_jobs WHERE id = %s", (args.job,))
                job = cur.fetchone()
        finally:
            db.close()
        
        if not job:
            print(f"Job {args.job} not found")
            return
        
        backfill_job(job["id"], job["file_path"])
    
    elif args.all:
        db = get_db()
        try:
            with db.cursor() as cur:
                cur.execute("""
                    SELECT DISTINCT pj.id, pj.file_path, pj.original_filename
                    FROM parse_jobs pj
                    JOIN parse_row_staging prs ON pj.id = prs.job_id
                    WHERE prs.raw_data IS NULL OR prs.raw_data = CAST('null' AS JSON)
                """)
                jobs = cur.fetchall()
        finally:
            db.close()
        
        print(f"Found {len(jobs)} jobs with missing raw_data")
        total = 0
        for job in jobs:
            total += backfill_job(job["id"], job["file_path"])
        print(f"\nTotal rows updated: {total}")
    
    else:
        print("Specify --job <id> or --all")


if __name__ == "__main__":
    main()
