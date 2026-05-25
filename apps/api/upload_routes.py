import os
import csv
from io import BytesIO

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
import pymysql

router = APIRouter(prefix="/api/v1", tags=["upload"])

ALLOWED_EXTENSIONS = {'.xlsx', '.csv'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
BATCH_SIZE = 500

def get_db():
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

def validate_extension(filename: str) -> bool:
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)

def parse_xlsx(file_bytes: bytes):
    """解析 xlsx，返回 (rows, column_names)"""
    from openpyxl import load_workbook
    wb = load_workbook(BytesIO(file_bytes), read_only=True)
    ws = wb.active
    rows = list(ws.values)
    wb.close()
    if not rows:
        return [], []
    headers = [str(h).strip() if h is not None else '' for h in rows[0]]
    data = []
    for row in rows[1:]:
        data.append({headers[i]: str(cell).strip() if cell is not None else '' for i, cell in enumerate(row)})
    return data, headers

def parse_csv(file_bytes: bytes):
    """解析 csv，尝试多种编码"""
    for enc in ['utf-8-sig', 'utf-8', 'gbk', 'gb2312']:
        try:
            text = file_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    reader = csv.DictReader(text.splitlines())
    rows = list(reader)
    headers = reader.fieldnames or []
    return rows, headers

def validate_columns(headers: list[str], required: set[str]) -> bool:
    lc = {h.lower() for h in headers}
    return required.issubset(lc)

QUOTE_REQUIRED = {'supplier_name', 'brand', 'category', 'model', 'price'}
PRODUCT_REQUIRED = {'brand', 'category', 'model_std'}

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    type: str = Form(...)
):
    if type not in ('quote', 'product'):
        raise HTTPException(400, "type must be 'quote' or 'product'")
    
    if not validate_extension(file.filename or ''):
        raise HTTPException(400, "Only .xlsx and .csv files allowed")
    
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large (max 50MB)")
    
    filename = file.filename or 'unknown'
    ext = '.xlsx' if filename.endswith('.xlsx') else '.csv'
    
    try:
        if ext == '.xlsx':
            rows, headers = parse_xlsx(contents)
        else:
            rows, headers = parse_csv(contents)
    except Exception as e:
        raise HTTPException(400, f"Parse error: {str(e)}")
    
    if not rows:
        raise HTTPException(400, "No data found in file")
    
    required = QUOTE_REQUIRED if type == 'quote' else PRODUCT_REQUIRED
    if not validate_columns(headers, required):
        missing = required - {h.lower() for h in headers}
        raise HTTPException(400, f"Missing columns: {missing}")
    
    conn = get_db()
    cur = conn.cursor()
    errors = []
    inserted = 0
    
    for i, row in enumerate(rows[:10000], start=2):
        try:
            if type == 'quote':
                supplier = row.get('supplier_name', '').strip()
                brand = row.get('brand', '').strip()
                category = row.get('category', '').strip()
                model_raw = row.get('model', '').strip()
                price_str = row.get('price', '0').strip()
                try:
                    price = float(price_str) if price_str else 0
                except ValueError:
                    errors.append({"row": i, "error": f"invalid price: {price_str}"})
                    continue
                # Ensure supplier exists
                cur.execute("SELECT id FROM suppliers WHERE supplier_name=%s", (supplier,))
                row2 = cur.fetchone()
                if row2:
                    supplier_id = row2['id']
                else:
                    cur.execute(
                        "INSERT INTO suppliers (supplier_code, supplier_name, source_file, file_date, freshness, total_records) "
                        "VALUES (%s,%s,%s,CURDATE(),'pending',0)",
                        (supplier[:32], supplier, filename)
                    )
                    supplier_id = cur.lastrowid
                cur.execute(
                    "INSERT INTO supplier_quotes "
                    "(supplier_id, brand, category, model_raw, model_std, price, quality_tier, is_low_quality) "
                    "VALUES (%s,%s,%s,%s,%s,%s,'MEDIUM',0)",
                    (supplier_id, brand, category, model_raw, model_raw, price)
                )
            else:
                brand = row.get('brand', '').strip()
                category = row.get('category', '').strip()
                model_std = row.get('model_std', '').strip()
                model_raw = model_std  # store raw as both
                cur.execute(
                    "INSERT INTO std_products (brand, category, model_std, model_raw, is_trap) "
                    "VALUES (%s,%s,%s,%s,0)",
                    (brand, category, model_std, model_raw)
                )
            inserted += 1
            
            if inserted % BATCH_SIZE == 0:
                conn.commit()
        except Exception as e:
            if len(errors) < 10:
                errors.append({"row": i, "error": str(e)})
    
    conn.commit()
    cur.close()
    conn.close()
    
    # Trigger pipeline (best effort) - removed dead /pipeline/trigger endpoint call
    
    return {
        "filename": filename,
        "type": type,
        "records_parsed": len(rows),
        "records_inserted": inserted,
        "errors": errors[:10]
    }