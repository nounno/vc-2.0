"""
Parser Core — Excel parsing, cleaning, mapping, standardization logic.
Handles the 5-stage pipeline: split → clean → map → standardize → stage.
Uses zipfile + XML to parse .xlsx without openpyxl Fill() issues.
"""
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from io import BytesIO
from datetime import datetime
from typing import Optional
import math
import requests
import json

# ─── Column name variants ──────────────────────────────────────────────────────
BRAND_VARIANTS = {
    "品牌", "商标", "brand",
    "品 牌", "牌",
}
MODEL_VARIANTS = {
    "型号", "产品型号", "sku", "商品型号", "model",
    "型 号", "机器型号",
}
PRICE_VARIANTS = {
    "供货价", "批发价", "单价", "价格", "cost_price", "price",
    "今日批价", "京东入户",
    "批 发 价", "批价",
}
CATEGORY_VARIANTS = {
    "品类", "分类", "类别", "category", "一级分类", "二级分类",
    "品 类",
}
DESC_VARIANTS = {
    "功能描述", "商品名称", "产品名称", "description", "系列",
    "系列名称", "品名",
}
NOTES_VARIANTS = {
    "备注", "notes", "物流备注", "通道",
    "备 注",
}

# ─── Header detection ─────────────────────────────────────────────────────────
_HEADER_HIT_THRESHOLD = 3


def col_to_num(col: str) -> int:
    """Convert column letter (A, B, ..., Z, AA, AB...) to integer position (1, 2, ..., 26, 27, 28...)."""
    n = 0
    for c in col.upper():
        n = n * 26 + (ord(c) - ord('A') + 1)
    return n


def find_header_row(rows_data: list[dict]) -> int:
    """
    Auto-detect the header row index.
    Scans rows for the one with the most known column-name hits.
    Returns the 0-based index into rows_data.
    """
    best_idx = 0
    best_hits = 0
    all_variants = (
        BRAND_VARIANTS | MODEL_VARIANTS | PRICE_VARIANTS
        | CATEGORY_VARIANTS | DESC_VARIANTS | NOTES_VARIANTS
    )
    for i, row in enumerate(rows_data):
        cells = row.get("cells", {})
        values = [str(v).lower().strip() for v in cells.values() if v]
        hits = sum(1 for v in values if v in all_variants)
        if hits > best_hits:
            best_hits = hits
            best_idx = i
    return best_idx

# ─── Model pattern (air conditioner focused) ───────────────────────────────────
MODEL_PATTERNS = [
    # Refrigerators
    r"BCD-\d+[A-Z]?",
    r"MR-\d+[A-Z]?",
    r"BD-\d+[A-Z]?",
    r"BC-\d+[A-Z]?",
    r"CRBU\d*",
    r"SC-\d+[A-Z]?",
    r"DC-\d+[A-Z]?",
    r"MS-\d+[A-Z]?",
    r"MBJ-\d+",
    r"JC-\d+",
    # Air Conditioners
    r"KFR-\d+[A-Z]?[WLT]?",
    r"KFRd?-\d+",
    r"RFC-\d+[A-Z]?",
    r"CU-\d+[A-Z]?",
    r"CS-\d+[A-Z]?",
    r"PF\d+[A-Z]",
    r"FKR-\d+",
    # Washing Machines
    r"XQG\d*[-\s][A-Z0-9]+",       # 滚筒
    r"XQB\d*[-\s][A-Z0-9]+",       # 波轮
    r"XQGL\d*[-\s][A-Z0-9]+",      # 滚筒大容量
    r"XQBL\d*[-\s][A-Z0-9]+",      # 波轮大容量
    r"XQS\d*[-\s][A-Z0-9]+",       # 双动力
    r"TB\d+[A-Z0-9]+",              # 波轮（美的系）
    r"TG\d+[A-Z0-9]+",              # 滚筒（美的系）
    r"MG\d+[A-Z0-9]+",              # 滚筒（美的系）
    r"MB\d+[A-Z0-9]+",              # 波轮（美的系）
    r"MD\d+[A-Z0-9]+",              # 洗烘一体
    r"D10\d*[A-Z]?",                # 卡萨帝洗衣机
    r"EB\d+[A-Z0-9]+",              # 海尔波轮 EB80Z33Mate1
    r"EG\d+[A-Z0-9]+",              # 海尔滚筒 EG100BD176L
    r"TD\d+[A-Z0-9]+",              # 小天鹅 TD10V628T
    # TVs
    r"\d+[A-Z][A-Z0-9]+[\s-]?Pro?",  # 50V58F Pro, 65S9, 75D30S
    r"\d+SU7F",
    r"\d+H5F\s*Pro",
    r"\d+S11[\s-][A-Z]",
    r"\d+J7K[\s-][A-Z]+",
    r"\d+N8M",
    r"\d+D[0-9]+[A-Z]?",             # 75D30S, 43D5T
    r"\d+E3[0-9]+[A-Z-]*",
    r"\d+S9\b",                      # 43S9, 65S9
    r"\d+A[0-9]+",                   # 75A23
    r"\d+V[0-9]+[A-Z]*[\s-]?Pro?",   # 75V58FPro, 40V58FPro
    r"\d+C[0-9]+[A-Z]*",             # 55C33NH, 75C33NH
    r"\d+H[0-9]+[A-Z]*[\s-]?Pro?",   # 43H5D, 55H5FPro
    r"\d+N[0-9]+[A-Z]*[\s-]?[A-Za-z]*", # 65N7L, 65N8MQD-Mini
    r"\d+L[0-9]+",                   # 80L7Q-PRO
    r"\d+S[0-9]+[A-Z-]*",            # 43S11K-F, 55S11-JN
    r"\d+J[0-9]+[A-Z-]*",            # 75J7K-JN
    r"\d+Q[0-9]+[A-Za-z]*[\s-]?Mini", # 98Q6G Mini, 98T6L Mini
    r"\d+SU[0-9]+F[\s-]?Pro?",        # 75SU7F, 65SU8F, 85SU8F PRO
    # Water Heaters (燃气/电热水器)
    r"JSQ\d*[\s-]?\d+[A-Z0-9]*",     # 燃气热水器
    r"JSLQ\d*[\s-]?\d+[A-Z0-9]*",
    r"F\d+[\s-]?\d+[A-Z0-9()]*",     # 电热水器 F60-33E8
    r"EC\d+[A-Z0-9-]*",              # 海尔电热水器
    r"ES\d+[A-Z0-9-]*",
    r"D\d+[-/][A-Z0-9]+",            # 万家乐 D50-P1Y1
    r"SMS-\d+[A-Z0-9]*",             # 奥克斯热水器
    r"KF\d+[\s-][A-Z0-9]+",
    r"SXTD\d+[A-Z0-9/-]*",           # 空气能热水器
    r"SQ\d+[-\s][A-Z0-9]+",           # 万和/海尔燃气热水器 SQ22-12WG3
    r"\d+Y5B",                        # 奥克斯热水器 80Y5B
    r"\d+E2PRO",                      # 万和 SQ25-13E2 PRO
    # Kitchen (烟机/灶具)
    r"CXW-\d+[\s-][A-Z0-9]+",        # 油烟机
    r"JZY[\s-]?[A-Z0-9]+",          # 燃气灶
    r"JZT[\s-]?[A-Z0-9]+",          # 燃气灶
    r"ZT\d+",                        # 华帝灶
    r"ZS\d+",                        # 华帝灶
    r"ZL\d+",                        # 华帝灶
    # Other appliance patterns
    r"MOX-\d+[A-Z]*",                # 奥克斯热水器
    r"L\d+[A-Z0-9]+",                # TV L系列 (L100D等)
    # Slash patterns
    r"[A-Z]{2,4}-\d+[A-Z0-9]+/[A-Z0-9-]+",   # HUR-35KWLF/N1DZBp-1, GR-120DW/BPR3DY
    r"[A-Z]{2,4}-\d+\.[A-Z0-9]+/[A-Z0-9-]+", # FGP7.2Pd/KNh-N1
    r"[A-Z]{2,4}\d+\.[A-Z0-9]+/[A-Z0-9-]+",  # PF12WPdQ/NhA-N3JY01
]

# ─── DeepSeek LLM configuration ─────────────────────────────────────────────────
LLM_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
LLM_BASE_URL = 'https://api.deepseek.com/v1'
LLM_MODEL = 'deepseek-v4-flash'

CONFIDENCE_THRESHOLD = 65


# ─── Job code generator ────────────────────────────────────────────────────────
def generate_job_code() -> str:
    """Generate job code P-YYYYMMDD-NNN format."""
    today = datetime.now().strftime("%Y%m%d")
    # In real usage, NNN would come from a DB sequence
    import random
    seq = random.randint(1, 999)
    return f"P-{today}-{seq:03d}"


# ─── Stage constants ───────────────────────────────────────────────────────────
STAGE_ORDER = ["split", "cleaned", "mapped", "standardized", "committed"]

# ─── Category inference from model prefix ────────────────────────────────────────
CATEGORY_BY_MODEL_PREFIX = [
    ("BCD", "冰箱"), ("BC", "冰箱"), ("BD", "冷柜"), ("SC", "冷柜"),
    ("MR", "冰箱"), ("CRBU", "冰箱"), ("DC", "冰箱"), ("MS", "冰箱"),
    ("MBJ", "冰箱"), ("JC", "冰吧"),
    ("KFR", "空调"), ("KFRD", "空调"), ("RFC", "空调"),
    ("CU", "空调"), ("CS", "空调"), ("PF", "商用空调"),
    ("FKR", "空调"), ("GR", "空调"),
    ("HUR", "商用空调"), ("KUR", "商用空调"),
    ("XQG", "洗衣机"), ("XQB", "洗衣机"), ("XQGL", "洗衣机"),
    ("XQBL", "洗衣机"), ("XQS", "洗衣机"), ("TB", "洗衣机"),
    ("TG", "洗衣机"), ("MG", "洗衣机"), ("MB", "洗衣机"),
    ("MD", "洗衣机"), ("D10", "洗衣机"), ("EB", "洗衣机"),
    ("EG", "洗衣机"), ("TD", "洗衣机"),
    ("JSQ", "热水器"), ("JSLQ", "热水器"),
    ("F", "电热水器"), ("EC", "电热水器"), ("ES", "电热水器"),
    ("SMS", "热水器"), ("KF", "空气能热水器"),
    ("SXTD", "空气能热水器"), ("LKF", "空气能热水器"),
    ("CXW", "油烟机"), ("JZY", "燃气灶"), ("JZT", "燃气灶"),
    ("ZT", "灶具"), ("ZS", "灶具"), ("ZL", "灶具"),
    ("MOX", "热水器"), ("SQ", "热水器"),
]


# ─── Excel parsing via zipfile/XML ────────────────────────────────────────────
def parse_xlsx_xml(file_bytes: bytes) -> list[dict]:
    """
    Parse .xlsx using zipfile + XML directly.
    Returns list of sheets: [{name, rows: [dict]}]
    Handles merged cells by reading mergeCell XML info.
    """
    sheets = []
    try:
        with zipfile.ZipFile(BytesIO(file_bytes)) as zf:
            # Get sheet names from workbook.xml
            wb_xml = zf.read("xl/workbook.xml")
            wb_tree = ET.fromstring(wb_xml)
            ns = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            sheet_names = []
            for sheet in wb_tree.findall(".//main:sheet", ns):
                sheet_names.append(sheet.get("name"))

            # Read shared strings for cell values
            shared_strings = []
            if "xl/sharedStrings.xml" in zf.namelist():
                ss_xml = zf.read("xl/sharedStrings.xml")
                ss_tree = ET.fromstring(ss_xml)
                for si in ss_tree.findall(".//main:si", ns):
                    texts = si.findall(".//main:t", ns)
                    shared_strings.append("".join(t.text or "" for t in texts))

            # Read each sheet
            for idx, sheet_name in enumerate(sheet_names):
                sheet_file = f"xl/worksheets/sheet{idx + 1}.xml"
                if sheet_file not in zf.namelist():
                    continue

                sheet_xml = zf.read(sheet_file)
                sheet_tree = ET.fromstring(sheet_xml)

                # Get merged cell ranges
                merged_ranges = []
                for merge in sheet_tree.findall(".//main:mergeCell", ns):
                    ref = merge.get("ref", "")
                    merged_ranges.append(ref)

                # Parse rows
                rows_data = []
                for row_elem in sheet_tree.findall(".//main:row", ns):
                    row_idx = int(row_elem.get("r", 0))
                    row_cells = {}
                    for cell in row_elem.findall("main:c", ns):
                        cell_ref = cell.get("r", "")
                        col_letter = "".join(filter(str.isalpha, cell_ref))
                        cell_type = cell.get("t", "")
                        val_elem = cell.find("main:v", ns)
                        inline_elem = cell.find("main:is/main:t", ns)
                        if inline_elem is not None and inline_elem.text:
                            row_cells[col_letter] = inline_elem.text
                        elif val_elem is None or val_elem.text is None:
                            continue
                        elif cell_type == "s":  # shared string
                            idx = int(val_elem.text)
                            row_cells[col_letter] = shared_strings[idx] if idx < len(shared_strings) else ""
                        else:
                            row_cells[col_letter] = val_elem.text or ""

                    if row_cells:
                        rows_data.append({"row_num": row_idx, "cells": row_cells})

                sheets.append({"name": sheet_name, "rows": rows_data, "merged_ranges": merged_ranges})
    except Exception as e:
        raise ValueError(f"Failed to parse Excel: {e}")
    return sheets


def expand_merged_cells(rows_data: list[dict], merged_ranges: Optional[list[str]] = None) -> list[dict]:
    """
    Expand merged cell values — fill merged slave cells with master value.
    Uses mergeCell XML ranges for precise filling, with fill-down as fallback.
    """
    if not rows_data:
        return rows_data

    # Step 1: Pre-compute slave slots from mergeCell ranges
    slave_slots = {}  # (row_num, col_letter) -> master_value
    if merged_ranges:
        for ref in merged_ranges:
            if ":" not in ref:
                continue
            start, end = ref.split(":")
            # Extract column letters and row numbers
            start_col = "".join(filter(str.isalpha, start))
            start_row = int("".join(filter(str.isdigit, start)))
            end_col = "".join(filter(str.isalpha, end))
            end_row = int("".join(filter(str.isdigit, end)))

            # Find master value from rows_data
            master_value = ""
            for row in rows_data:
                if row["row_num"] == start_row:
                    master_value = row["cells"].get(start_col, "")
                    break

            if not master_value or not str(master_value).strip():
                continue

            # Fill all slave rows in range
            for r in range(start_row, end_row + 1):
                key = (r, start_col)
                if r == start_row:
                    continue  # master already has the value
                slave_slots[key] = master_value

    # Step 2: Fill slave slots into rows_data (add missing cells)
    for i, row in enumerate(rows_data):
        rn = row["row_num"]
        cells = dict(row["cells"])
        added = False
        for (sr, col), val in slave_slots.items():
            if sr == rn and col not in cells:
                cells[col] = val
                added = True
        if added:
            rows_data[i] = {"row_num": rn, "cells": cells}

    # Step 3: Fill-down for remaining empty cells (fallback)
    result = []
    last_values = {}
    for row in rows_data:
        cells = dict(row["cells"])
        row_num = row["row_num"]
        for col_letter in list(cells.keys()):
            if not cells[col_letter] or str(cells[col_letter]).strip() == "":
                cells[col_letter] = last_values.get(col_letter, "")
            else:
                last_values[col_letter] = cells[col_letter]
        result.append({"row_num": row_num, "cells": cells})

    return result


def is_empty_row(cells: dict, total_cols: int) -> bool:
    """Check if row is >80% empty."""
    if not cells:
        return True
    non_empty = sum(1 for v in cells.values() if v and str(v).strip())
    return non_empty / max(total_cols, 1) < 0.2


def clean_rows(rows_data: list[dict], total_cols: int) -> list[dict]:
    """Remove empty rows and separator rows."""
    cleaned = []
    for row in rows_data:
        cells = row["cells"]
        # Skip separator-like rows (all single chars or numbers)
        values = list(cells.values())
        if values and all(str(v).strip() in ("-", "—", "|", "", " ") for v in values):
            continue
        if is_empty_row(cells, total_cols):
            continue
        cleaned.append(row)
    return cleaned


def map_columns(headers: list[str]) -> dict:
    """
    Map source column names to standard field names.
    Returns {standard_name: source_col_index}
    """
    header_lc = {h.lower().strip(): i for i, h in enumerate(headers)}
    mapping = {}

    # Brand
    for variant in BRAND_VARIANTS:
        if variant in header_lc:
            mapping["brand"] = header_lc[variant]
            break

    # Model
    for variant in MODEL_VARIANTS:
        if variant in header_lc:
            mapping["model"] = header_lc[variant]
            break

    # Price
    for variant in PRICE_VARIANTS:
        if variant in header_lc:
            mapping["price"] = header_lc[variant]
            break

    # Category
    for variant in CATEGORY_VARIANTS:
        if variant in header_lc:
            mapping["category"] = header_lc[variant]
            break

    # Description
    for variant in DESC_VARIANTS:
        if variant in header_lc:
            mapping["description"] = header_lc[variant]
            break

    # Notes
    for variant in NOTES_VARIANTS:
        if variant in header_lc:
            mapping["notes"] = header_lc[variant]
            break

    return mapping


STAGE_ORDER = ["split", "cleaned", "mapped", "standardized", "committed"]


def is_multi_product_row(model_str: str) -> bool:
    """
    Determine if a row contains multiple distinct products based on model string.

    Key insight (boss observation 2026-05-28): each row = one product.
    '/' in AC model numbers is part of model variant syntax (e.g. KFR-26GW/JH5...).
    Only explicit list separators between COMPLETE model numbers indicate multi-product.
    """
    if not model_str:
        return False
    # Explicit separator characters between model numbers
    if re.search(r"[、&＋+，]", model_str):
        return True
    return False


def recognize_model(model_str: str) -> bool:
    """Check if model string matches known product model patterns."""
    if not model_str:
        return False
    # Strip leading Chinese brand prefix (e.g., 海信HUR-35KWLF → HUR-35KWLF)
    s = re.sub(r'^[\u4e00-\u9fff]+', '', model_str).strip()
    if not s:
        return False
    for pattern in MODEL_PATTERNS:
        if re.search(pattern, s, re.IGNORECASE):
            return True
    return False


def clean_model(model_str: str) -> str:
    """
    Extract clean model number by removing trailing parenthetical notes and
    quantity/price suffixes attached via slash notation.
    Also removes leading Chinese brand prefixes.
    """
    if not model_str:
        return ""
    s = str(model_str).strip()
    # Strip leading Chinese brand prefix (e.g., 海信HUR-35KWLF → HUR-35KWLF)
    s = re.sub(r'^[\u4e00-\u9fff]+', '', s).strip()

    # Find the longest model pattern match
    best_match = None
    best_end = -1
    for pattern in MODEL_PATTERNS:
        m = re.search(pattern, s, re.IGNORECASE)
        if m and m.end() > best_end:
            best_match = m.group(0)
            best_end = m.end()

    if best_match is not None:
        rest = s[best_end:]
        # Strip trailing price/quantity suffixes: /3套起1670, /峦锦瑜, /白, /2套4450
        rest = re.sub(r'/[0-9\u4e00-\u9fff][^\s/]*$', '', rest)
        rest = re.sub(r'/[0-9]+$', '', rest)
        rest = re.sub(r'/[\u4e00-\u9fff]+$', '', rest)
        rest = rest.strip()
        result = best_match + rest
    else:
        result = s

    # Remove trailing parenthetical notes (Chinese and ASCII, standalone)
    result = re.sub(r'[（][^）]*[）]\s*$', '', result)
    result = re.sub(r'[(][^)]*[)]\s*$', '', result)
    # Remove any remaining Chinese/ASCII mixed parenthetical at end
    result = re.sub(r'[（(][^）)]*[）)]\s*$', '', result)
    result = re.sub(r'\s+', '', result)
    return result.strip()


def parse_price(price_str) -> Optional[float]:
    """Convert price string to float."""
    if price_str is None:
        return None
    s = str(price_str).strip()
    # Remove Chinese parenthetical notes: 9699（码机）→ 9699
    s = re.sub(r'[（(][^）)]*[）)]', '', s)
    # Remove currency symbols and commas
    s = re.sub(r"[¥$€£，,\s]", "", s)
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def calculate_confidence(
    has_model: bool,
    has_price: bool,
    has_brand: bool,
    has_category: bool,
    notes_len: int,
    is_multi_product: bool,
) -> float:
    """Calculate row confidence score."""
    score = 0.0
    if has_model:
        score += 40
    if has_price:
        score += 20
    if has_brand:
        score += 20
    if has_category:
        score += 10
    if notes_len > 50:
        score -= 10
    if is_multi_product:
        score -= 30
    return max(0.0, min(100.0, score))


def standardize_row(
    row_cells: dict,
    mapping: dict,
    header_list: list[str],
    col_to_letter: dict[int, str],
) -> dict:
    """
    Standardize a single row based on column mapping.
    Returns standardized row dict with confidence.
    """
    def get_val(std_name):
        """Get cell value by std field name using col_to_letter position map."""
        col_idx = mapping.get(std_name)
        if col_idx is None:
            return ""
        letter = col_to_letter.get(col_idx)
        if letter is None:
            return ""
        val = row_cells.get(letter, "")
        # Normalize non-breaking spaces and other Unicode whitespace
        if isinstance(val, str):
            val = val.replace('\xa0', ' ').replace('\u3000', ' ')
        return val

    brand = get_val("brand") or ""

    # Clean brand: remove internal whitespace (格 力 空 调 → 格力空调)
    brand = re.sub(r'\s+', '', brand)

    model = get_val("model") or ""
    price_raw = get_val("price") or ""
    category = get_val("category") or ""
    description = get_val("description") or ""
    notes = get_val("notes") or ""

    price = parse_price(price_raw)
    has_price = price is not None

    # Detect swapped columns: if model doesn't look like a model number
    # but description does, swap them
    model_clean = clean_model(model)
    desc_clean = clean_model(description)
    model_is_recognized = bool(recognize_model(model_clean))
    desc_is_recognized = bool(recognize_model(desc_clean))

    if not model_is_recognized and desc_is_recognized:
        # Model and description are swapped — fix it
        model, description = description, model
        model_clean = desc_clean
        model_is_recognized = True

    has_model = model_is_recognized
    has_brand = bool(brand.strip())
    has_category = bool(category.strip())

    # Infer category from model prefix if no category column exists
    if not has_category and model:
        for prefix, cat in CATEGORY_BY_MODEL_PREFIX:
            if model.upper().startswith(prefix):
                category = cat
                has_category = True
                break

    model_std = model.strip()
    # Note: '/' is NOT a multi-product separator in AC model numbers (KFR-26GW/JH5K1FNhAaB1 uses '/' as variant separator)
    is_multi_product = bool(re.search(r"[，,、&]", model)) if model else False

    confidence = calculate_confidence(
        has_model, has_price, has_brand, has_category,
        len(notes), is_multi_product
    )

    # Determine status
    if confidence < CONFIDENCE_THRESHOLD:
        status = "flagged"
    elif is_multi_product:
        status = "pending_split"
    else:
        status = "valid"

    return {
        "brand": brand.strip(),
        "model": model_std,
        "model_std": model_std,
        "price": price if has_price else None,
        "category": category.strip(),
        "description": "",
        "notes": "",
        "confidence": confidence,
        "status": status,
        "is_multi_product": is_multi_product,
        "source_columns": mapping,
    }


# ─── LLM-based column mapping inference ─────────────────────────────────────────


def llm_infer_columns(headers: list[str], sample_rows: list[dict]) -> Optional[dict]:
    """
    Use DeepSeek LLM to infer column-to-field mapping from headers and sample data.
    Returns {standard_field_name: column_index} or None on failure.
    """
    if not LLM_API_KEY:
        return None
    try:
        # Build sample data text
        sample_text = ""
        for i, row in enumerate(sample_rows[:5]):
            sample_text += f"Row {i + 1}: {json.dumps(row, ensure_ascii=False)}\n"

        headers_json = json.dumps(headers, ensure_ascii=False)

        prompt = (
            f"You are a data mapping assistant. Given column headers and sample data "
            f"from a spreadsheet, determine which standard field each column maps to.\n\n"
            f"Standard fields: brand, model, price, category, description, notes\n\n"
            f"Headers: {headers_json}\n\n"
            f"Sample data (first rows):\n{sample_text}\n\n"
            f"For each standard field, identify the column index (0-based). "
            f"Return ONLY a JSON object like:\n"
            '{{"brand": 0, "model": 2, "price": 3, '
            '"category": null, "description": null, "notes": null}}\n\n'
            f"Use null for fields without a matching column. Return ONLY the JSON."
        )

        payload = {
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": "You are a data mapping expert. Respond only with valid JSON."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 2000,
            "stream": False,
        }

        resp = requests.post(
            f"{LLM_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        msg = data["choices"][0]["message"]
        content = msg.get("content", "") or ""

        # DeepSeek V4 Flash may put the actual response in reasoning_content
        if not content.strip():
            content = msg.get("reasoning_content", "") or ""

        # Strip potential markdown code block fencing
        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            json_lines = []
            in_code = False
            for line in lines:
                if line.startswith("```"):
                    in_code = not in_code
                    continue
                if in_code:
                    json_lines.append(line)
            if json_lines:
                content = "\n".join(json_lines)

        result = json.loads(content)

        # Filter out null / non-int values
        mapping = {}
        for field, idx in result.items():
            if idx is not None and isinstance(idx, int):
                mapping[field] = idx

        return mapping if mapping else None
    except Exception:
        return None


def llm_extract_row(row_cells_dict: dict) -> Optional[dict]:
    """
    Use DeepSeek LLM to extract structured fields (brand/model/price/etc.)
    from a single row of raw cell data.
    Returns dict or None on failure.
    """
    if not LLM_API_KEY:
        return None
    try:
        row_text = json.dumps(row_cells_dict, ensure_ascii=False)

        prompt = (
            f"Extract product information from this row of cell data.\n\n"
            f"Row data: {row_text}\n\n"
            f"Return ONLY a JSON object (use null for missing fields):\n"
            '{"brand": "...", "model": "...", "price": ..., '
            '"category": "...", "description": "...", "notes": "..."}\n\n'
            f"brand = product brand, model = model number, price = numeric value, "
            f"category = product category, description = product name/description, "
            f"notes = additional notes."
        )

        payload = {
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": "You are a data extraction expert. Respond only with valid JSON."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 1000,
            "stream": False,
        }

        resp = requests.post(
            f"{LLM_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        msg = data["choices"][0]["message"]
        content = msg.get("content", "") or ""

        # DeepSeek V4 Flash may put output in reasoning_content
        if not content.strip():
            content = msg.get("reasoning_content", "") or ""

        # Strip potential markdown code block fencing
        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            json_lines = []
            in_code = False
            for line in lines:
                if line.startswith("```"):
                    in_code = not in_code
                    continue
                if in_code:
                    json_lines.append(line)
            if json_lines:
                content = "\n".join(json_lines)

        return json.loads(content)
    except Exception:
        return None


def llm_check_consistency(batch_rows: list[dict]) -> list[dict]:
    """
    Use DeepSeek LLM to check consistency between raw data and parsed results.
    
    Input: list of {raw_data: str, brand: str, model: str, price: float/None, category: str}
    Output: list of {row_idx: int, consistent: bool, reason: str}
    
    Processes in batches of 10 per API call.
    Falls back to consistent=True on any failure (non-blocking).
    """
    results = []

    for batch_start in range(0, len(batch_rows), 10):
        batch = batch_rows[batch_start:batch_start + 10]

        rows_text = ""
        for i, r in enumerate(batch):
            raw = r.get("raw_data", "") or ""
            brand = r.get("brand", "") or ""
            model = r.get("model", "") or ""
            price = r.get("price")
            price_str = f"¥{price}" if price is not None else "无"
            category = r.get("category", "") or ""
            rows_text += (
                f"行{i + 1}:\n"
                f"原始数据: {raw}\n"
                f"解析结果: 品牌={brand}, 型号={model}, 价格={price_str}, 品类={category}\n\n"
            )

        prompt = (
            "你是一个数据质量检查员。下面每一行包含原始Excel数据和解析器提取的结果。\n"
            "请判断每行的解析结果与原始数据是否一致。\n"
            "四个字段（品牌、型号、价格、品类）都需要核对。\n"
            "型号应能在原始数据中找到完全一致的字符串。\n"
            "价格（数字）应能在原始数据中找到对应值。\n"
            "品牌和品类应根据原始数据中的文字判断是否正确，不要无依据推断。\n"
            "如果原始数据中找不到对应值，或解析结果明显错误，视为不一致。\n\n"
            f"{rows_text}"
            "逐行判断。返回JSON数组，每个元素格式：\n"
            '{"row": 行号, "consistent": true/false, "reason": "简短中文原因"}\n'
            "例如：[{\"row\": 1, \"consistent\": true, \"reason\": \"品牌、型号、价格、品类与原始数据一致\"}]\n"
            "只返回JSON数组，不要其他任何内容。"
        )

        payload = {
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": "你是一个数据质量检查专家。只返回有效JSON。"},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 2000,
            "stream": False,
        }

        try:
            resp = requests.post(
                f"{LLM_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {LLM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            msg = data["choices"][0]["message"]
            content = msg.get("content", "") or ""
            if not content.strip():
                content = msg.get("reasoning_content", "") or ""

            # Strip markdown code fences
            content = content.strip()
            if content.startswith("```"):
                lines = content.split("\n")
                json_lines = []
                in_code = False
                for line in lines:
                    if line.startswith("```"):
                        in_code = not in_code
                        continue
                    if in_code:
                        json_lines.append(line)
                if json_lines:
                    content = "\n".join(json_lines)

            judgments = json.loads(content)
            for j in judgments:
                results.append({
                    "row_idx": batch_start + j.get("row", 1) - 1,
                    "consistent": j.get("consistent", True),
                    "reason": j.get("reason", ""),
                })
        except Exception:
            # On any failure, mark all rows as error
            for i in range(len(batch)):
                results.append({
                    "row_idx": batch_start + i,
                    "consistent": None,
                    "reason": "LLM检查异常，请稍后重试",
                })

    return results


def process_sheet(sheet_data: dict) -> dict:
    """
    Process a single sheet through all stages.
    Returns sheet with standardized rows and stats.
    """
    rows = sheet_data["rows"]
    if not rows:
        return {
            "name": sheet_data["name"],
            "total_rows": 0,
            "valid_rows": 0,
            "flagged_rows": 0,
            "pending_split_rows": 0,
            "rejected_rows": 0,
            "rows": [],
        }

    # Step 1: headers — use auto-detected header row
    header_row_idx = find_header_row(rows)
    first_row = rows[header_row_idx]
    header_cells = first_row["cells"]

    def col_sort_key(letter):
        return col_to_num(letter)

    sorted_cols = sorted(header_cells.keys(), key=col_sort_key)
    headers = [header_cells[c] for c in sorted_cols]
    total_cols = len(headers)
    # Build position->letter map from header row
    col_to_letter = {i: letter for i, letter in enumerate(sorted_cols) if i < len(headers)}

    # Step 2: clean rows (skip header row and everything before it)
    data_rows = rows[header_row_idx + 1:]
    merged_ranges = sheet_data.get("merged_ranges", [])
    data_rows = expand_merged_cells(data_rows, merged_ranges)
    data_rows = clean_rows(data_rows, total_cols)

    # Step 3: map columns — try LLM inference first, fall back to regex
    # Build sample rows for LLM (dict of col_letter -> value)
    sample_rows_for_llm = [row["cells"] for row in data_rows[:5]]
    llm_mapping = llm_infer_columns(headers, sample_rows_for_llm)
    if llm_mapping is not None:
        mapping = llm_mapping
    else:
        mapping = map_columns(headers)

    # Step 4: standardize each row
    standardized_rows = []
    for row in data_rows:
        std_row = standardize_row(row["cells"], mapping, headers, col_to_letter)
        std_row["row_num"] = row["row_num"]
        # Build readable raw_data: "品牌: 格力 | 产品型号: KFR-35GW/..."
        raw_cells = row["cells"]
        sorted_letters = sorted(raw_cells.keys(), key=lambda l: col_to_num(l))
        raw_items = []
        for i, letter in enumerate(sorted_letters):
            hdr = headers[i] if i < len(headers) else letter
            val = str(raw_cells[letter]) if raw_cells.get(letter) is not None else ""
            if val.strip():
                raw_items.append(f"{hdr}: {val.strip()}")
        std_row["raw_data"] = " | ".join(raw_items)
        standardized_rows.append(std_row)

    # Stats
    valid = sum(1 for r in standardized_rows if r["status"] == "valid")
    flagged = sum(1 for r in standardized_rows if r["status"] == "flagged")
    pending_split = sum(1 for r in standardized_rows if r["status"] == "pending_split")
    rejected = sum(1 for r in standardized_rows if r["status"] == "rejected")

    return {
        "name": sheet_data["name"],
        "total_rows": len(standardized_rows),
        "valid_rows": valid,
        "flagged_rows": flagged,
        "pending_split_rows": pending_split,
        "rejected_rows": rejected,
        "rows": standardized_rows,
        "source_columns": {k: headers[v] if v < len(headers) else "" for k, v in mapping.items()},
    }


def process_excel(file_bytes: bytes, job_code: str, supplier_id: int) -> dict:
    """
    Full pipeline: parse → clean → map → standardize.
    Returns job-level summary + sheet details.
    """
    # Stage 1: Parse sheets via zipfile
    sheets = parse_xlsx_xml(file_bytes)

    # Stage 2-4: process each sheet
    processed_sheets = []
    raw_sheets_data = []  # {name, rows} for DB insertion
    total_rows = 0
    valid_rows = 0
    flagged_rows = 0
    pending_split_rows = 0
    rejected_rows = 0

    for sheet in sheets:
        proc = process_sheet(sheet)
        processed_sheets.append({
            "name": proc["name"],
            "row_count": proc["total_rows"],
            "valid_rows": proc["valid_rows"],
            "flagged_rows": proc["flagged_rows"],
            "pending_split_rows": proc["pending_split_rows"],
            "rejected_rows": proc["rejected_rows"],
        })
        raw_sheets_data.append({"name": proc["name"], "rows": proc["rows"]})
        total_rows += proc["total_rows"]
        valid_rows += proc["valid_rows"]
        flagged_rows += proc["flagged_rows"]
        pending_split_rows += proc["pending_split_rows"]
        rejected_rows += proc["rejected_rows"]

    return {
        "job_code": job_code,
        "supplier_id": supplier_id,
        "stage": "standardized",
        "sheet_count": len(sheets),
        "total_rows": total_rows,
        "valid_rows": valid_rows,
        "flagged_rows": flagged_rows,
        "pending_split_rows": pending_split_rows,
        "rejected_rows": rejected_rows,
        "committed_rows": 0,
        "sheets": processed_sheets,
        "_raw_sheets": raw_sheets_data,
    }
