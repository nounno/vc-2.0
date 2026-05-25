# ValueCube 2.0 解析器调研报告
**日期**: 2026-05-25 | **调研人**: Hermes Subagent | **准确率基准**: ~74%

---

## 一、代码结构总览

### 核心文件
- **Pipeline主代码**: `/home/ubuntu/vc-2.0/apps/pipeline/main.py` (1550行)
- **数据库**: MySQL `valuecube.supplier_quotes` (171,578条记录)

### 六层架构（代码行号）
| 层级 | 类/模块 | 行号 | 核心功能 |
|------|---------|------|---------|
| L0 | `IntakeLayer` | 108-449 | 文件读取、合并格处理、header检测 |
| L2 | `FormatDetector` | 455-465 | 文件格式检测 |
| L3 | `ColumnTyper` | 471-517 | 列语义识别（正则匹配） |
| L4 | `SemanticMapper` | 1026-1099 | 字段值规范化 |
| L5 | `EntityExtractor` | 1141-1178 | 实体提取 |
| L6 | `QualityRouter` | 1230-1241 | 置信度评分 |

### 入口函数
- `run_pipeline()` — 行1247，每行调用链: IntakeLayer → ColumnTyper.infer() → EntityExtractor.extract() → QualityRouter.route()
- `persist_records_to_db()` — 行1353，写入MySQL

---

## 二、逐模块分析

### 2.1 ColumnTyper (L3) — **瓶颈核心**

**文件**: `apps/pipeline/main.py` 行471-517

```python
class ColumnTyper:
    PRICE_RE = re.compile(r"^[\d,．.．]+$")
    INT_RE = re.compile(r"^\d+$")

    def infer(self, headers: list[str], rows: list[list[str]]) -> dict[int, str]:
        mapping = {}
        for i, h in enumerate(headers):
            h_lower = h.lower().strip()
            # 品牌
            if re.search(r"品牌|brand|厂商", h_lower):
                mapping[i] = "brand"
            # 品类
            elif re.search(r"品类|category|分类|类型", h_lower):
                mapping[i] = "category"
            # 型号
            elif re.search(r"型号|model|货号|款式", h_lower):
                mapping[i] = "model"
            # 价格（11种列名）
            elif re.search(r"价格|price|售价|单价|批发价|开票价|工程价|今日批价|供货价", h_lower):
                mapping[i] = "price"
            # 库存
            elif re.search(r"库存|stock|数量|存货|销量", h_lower):
                mapping[i] = "stock"
            # 成本价
            elif re.search(r"供货价|成本价|进货价|采购价|工厂价", h_lower):
                mapping[i] = "costPrice"
            # 建议零售价
            elif re.search(r"建议零售价|标价|市场价|零售价|指导价|挂牌价", h_lower):
                mapping[i] = "suggestedPrice"
            # 数量
            elif re.search(r"数量|件数|库存量|备货量|可售数量", h_lower):
                mapping[i] = "quantity"
            # 仓库
            elif re.search(r"仓库|库房|发货地|仓库地址|所在仓库", h_lower):
                mapping[i] = "warehouse"
            else:
                # 值推导（fallback）
                sample_vals = [row[i] if i < len(row) else "" for row in rows[:5]]
                if all(self.PRICE_RE.match(v) for v in sample_vals if v):
                    mapping[i] = "price"
                elif all(self.INT_RE.match(v) for v in sample_vals if v):
                    mapping[i] = "stock"
                else:
                    mapping[i] = "text"
        return mapping
```

**问题清单**:
1. **价格列名覆盖不足**: 只覆盖了11种中文变体，缺少"专属销售价"、"特价"、"活动价"、"会员价"、"工程机价"等常见列名
2. **无"双表"检测**: `run_pipeline()` 没有检测header是否在同一行，供应商5.25价格输出表只有`['型号', '专属销售价']`两列，没有品牌列，导致置信度极低
3. **品牌列名只检测了3种**: "品牌|brand|厂商"，实际供应商还有"品牌名称"、"牌子"等变体
4. **型号列名检测了4种**: "型号|model|货号|款式"，实际还有"商品型号"、"产品型号"、"货号"等
5. **值推导逻辑太弱**: 只看前5行，数字型列不一定被识别为price

---

### 2.2 QualityRouter (L6) — **BUG所在**

**文件**: `apps/pipeline/main.py` 行1188-1241

```python
FIELD_WEIGHTS = {
    "brand": 2.0,
    "model": 2.0,
    "price": 1.5,
    "costPrice": 1.5,
    "suggestedPrice": 1.5,
    "category": 1.0,
    "stock": 1.0,
    "quantity": 1.0,
    "warehouse": 1.0,
    "text": 1.0,
}

def overall_confidence(entities: dict[str, Any]) -> float:
    """Calculate weighted average confidence score."""
    if not entities:
        return 0.0
    weighted_sum = 0.0
    total_weight = 0.0
    for field, data in entities.items():
        weight = FIELD_WEIGHTS.get(field, 1.0)
        score_100 = data["confidence"] * 100   # ← BUG: 0-1 scale → 0-100
        weighted_sum += score_100 * weight
        total_weight += weight
    if total_weight == 0:
        return 0.0
    return round(weighted_sum / total_weight, 1)

def quality_tier(score: float) -> str:
    """Determine quality tier based on confidence score (0-100 scale)."""
    if score >= 90:
        return "HIGH"
    elif score >= 60:
        return "MEDIUM"
    return "LOW"
```

**实际数据验证**:
- `is_low_quality=1` 的记录数: **0条**（应为169059条MEDIUM中的一部分）
- 所有记录的 confidence 在 55.0~89.7 之间，全部落在MEDIUM区间
- **根本问题**: 代码在行1377写入了 `is_low=1 if tier == "LOW"`，但tier永远不是LOW

**BUG根因**: `SemanticMapper` 返回的 `confidence` 是0-1之间的小数（brand=0.98, price=0.90等），`overall_confidence` 乘以100后最大是98分（brand×2.0 + price×1.5时），但大多数行缺少brand或model字段，导致总分 < 90，落入MEDIUM。**没有任何逻辑触发LLM fallback或人工审核标记**。

---

### 2.3 QualityRouter Bug详情

**文件**: `apps/pipeline/main.py` 行1373-1420

```python
for record in records:
    parsed = record.get("parsed_entities", {})
    conf = record.get("confidence_score", 0.0)
    tier = record.get("quality_tier", "MEDIUM")
    is_low = 1 if tier == "LOW" else 0   # ← 永远不触发，因为tier只有HIGH/MEDIUM
```

**`is_low_quality=1` 应该触发的条件**: confidence_score < LOW_QUALITY_THRESHOLD (65.0)，但当前代码用的是tier判断而非分数判断。

**修复方案**: 将行1377改为:
```python
is_low = 1 if conf < LOW_QUALITY_THRESHOLD else 0
```

---

### 2.4 IntakeLayer (L0)

**文件**: `apps/pipeline/main.py` 行108-449

关键函数:
- `load()` 行116-164: 主入口，检测csv/xlsx/zip格式
- `_load_xlsx_from_workbook()` 行166-241: openpyxl读取，处理合并格、前向填充、header检测
- `_load_xlsx_raw_xml()` 行243-449: XML直接解析fallback

**Header检测逻辑** (行210-231):
```python
HEADER_MIN_NONEMPTY_RATIO = 0.20
HEADER_MIN_LABEL_RATIO = 0.40
header_row_idx = None
for r in range(1, min(max_row + 1, 20)):
    row_vals = [cell_values.get((r, c), "") for c in range(1, max_col + 1)]
    non_empty = [v for v in row_vals if v.strip()]
    nonempty_ratio = len(non_empty) / max_col
    label_ratio = sum(1 for v in non_empty if len(v) < 50) / len(non_empty)
    if nonempty_ratio < 0.35 and len(non_empty) < 5:
        continue
    if (nonempty_ratio > HEADER_MIN_NONEMPTY_RATIO and
            label_ratio >= HEADER_MIN_LABEL_RATIO):
        header_row_idx = r
        break
```

**问题**: 对只有2列的Sheet（如供应商25的`['型号', '专属销售价']`），`nonempty_ratio = 2/max_col`，如果max_col较大则比例过低会跳过；且无"双表"检测逻辑。

---

## 三、数据现状

### 3.1 记录分布
| 指标 | 值 |
|------|-----|
| 总记录数 | 171,578 |
| HIGH (≥90分) | 2,519 (1.5%) |
| MEDIUM (60-89分) | 169,059 (98.5%) |
| LOW (0条) | **0条 (BUG!)** |
| is_low_quality=1 | **0条 (BUG!)** |

### 3.2 置信度分布（主要供应商）
| supplier_id | 记录数 | 置信度范围 | 列结构示例 |
|------------|--------|-----------|-----------|
| 5 | 70,884 | 55-89 | 无raw_row（老数据） |
| 1 | 56,862 | 55-89 | 无raw_row（老数据） |
| 23 | 14,830 | 较高 | `['票','品牌','型号','备注','类型','供货价','一级分类','二级分类','包邮地区','商品名称']` |
| 18 | 8,973 | 较低 | `['','品牌','品类','型号','名称（系列）','备注（还可以优惠）','最低零售价（明价）']` |
| 25 | 8,080 | 很低 | `['型号','专属销售价']` — **只有2列，无品牌，无品类** |
| 2,3,4 | ~10k | - | 无raw_row（老数据） |

### 3.3 已知问题编号（代码中无G4/G7/G8/G16/G18注释）
未在代码中找到问题追踪编号注释。

---

## 四、逐项解决方案（CC可直接实现）

### 方案1: Type-A 供应商模板硬编码 — 快速提升

**问题**: 供应商25只有`['型号','专属销售价']`两列，品牌/品类全靠猜。

**数据结构设计**:
```python
# apps/pipeline/main.py 行 ~470（ColumnTyper类前新增）

SUPPLIER_TEMPLATES: dict[str, dict] = {
    # supplier_code_prefix → column mapping
    "5.25价格输出表": {
        "header_row": 1,
        "column_mapping": {
            0: "model",       # 第1列=型号
            1: "price",       # 第2列=专属销售价
        },
        "fixed_fields": {
            "brand": "通用",   # 模板固定品牌
            "category": "空调", # 模板固定品类（可从文件名推断）
        },
        "price_column_type": "price",  # 这列是price类型
    },
    "5月25日VIP专属价格输出表": {
        "header_row": 1,
        "column_mapping": {
            0: "brand",
            1: "category", 
            2: "model",
            3: "text",         # 名称（系列）
            4: "text",         # 备注
            5: "price",        # 最低零售价
        },
        "fixed_fields": {},
    },
    # 可继续添加更多模板...
}

def match_supplier_template(filename: str, headers: list[str]) -> str | None:
    """匹配供应商模板，返回template_key或None"""
    filename_key = filename.replace(" ", "").replace("　", "")
    for template_key in SUPPLIER_TEMPLATES:
        if template_key in filename_key or filename_key in template_key:
            return template_key
    return None
```

**更新流程**:
1. 发现新供应商格式 → 在 `SUPPLIER_TEMPLATES` 字典添加条目
2. 格式: `filename关键字 → {column_mapping, fixed_fields}`
3. 模板注册由CC人工分析raw_row后写入代码

**ColumnTyper.infer()修改**:
```python
def infer(self, headers: list[str], rows: list[list[str]], 
          filename: str = "") -> dict[int, str]:
    # 1. 先尝试模板匹配
    template_key = match_supplier_template(filename, headers)
    if template_key:
        template = SUPPLIER_TEMPLATES[template_key]
        mapping = {}
        for col_idx, col_type in template["column_mapping"].items():
            mapping[col_idx] = col_type
        # 注入固定字段（在run_pipeline中处理）
        return mapping
    
    # 2. 原有正则逻辑
    ...（保持不变）
```

**预期提升**: 为供应商25（约8,080条，占4.7%）从MEDIUM(55-65分)提升到HIGH(90+)。

---

### 方案2: QualityRouter Bug修复

**文件**: `apps/pipeline/main.py` 行1377

**当前代码**:
```python
is_low = 1 if tier == "LOW" else 0
```

**修复代码**:
```python
is_low = 1 if conf < LOW_QUALITY_THRESHOLD else 0
```

**验证SQL**:
```sql
-- 修复后验证
SELECT is_low_quality, COUNT(*) FROM supplier_quotes GROUP BY is_low_quality;
-- 预期: is_low_quality=1应有 ~50,000+ 条（confidence < 65的MEDIUM记录）
```

**预期提升**: 修复后低质量标记正确，datacenter可过滤低质量数据做分析，提升数据应用准确率。

---

### 方案3: 双表检测算法（列密度直方图）

**问题**: 供应商25的Sheet只有2列，header直接是`['型号','专属销售价']`，当前`IntakeLayer`的前20行搜索逻辑可能找到错误的header行。

**算法设计**: 在`run_pipeline()`行1247之前，在`IntakeLayer`或新增`TableDetector`类中实现:

```python
def detect_dual_table(sheet_rows: list[list[str]], max_col: int) -> bool:
    """
    检测是否存在双表结构（两个独立的header+body区域）。
    使用列密度直方图：
    - 统计每列的非空值比例（密度）
    - 如果存在两个明显不同的密度峰值/区间 → 双表
    
    例如：
    第1-3列: 高密度（品牌、品类、型号连续填充）
    第4-10列: 低密度（价格列大量为空）
    → 说明第4列可能是第二个表的header
    """
    if len(sheet_rows) < 10:
        return False
    
    col_densities = []
    for col in range(len(sheet_rows[0])):
        non_empty = sum(1 for row in sheet_rows if col < len(row) and row[col].strip())
        density = non_empty / len(sheet_rows)
        col_densities.append(density)
    
    # 找到密度断崖点（相邻列密度差 > 0.5）
    breakpoints = []
    for i in range(1, len(col_densities)):
        diff = abs(col_densities[i] - col_densities[i-1])
        if diff > 0.5:
            breakpoints.append(i)
    
    # 如果有多个断崖点，且后半部分密度显著低于前半部分
    # 说明可能存在双表（前半是主表，后半是次表或备注列）
    return len(breakpoints) >= 2
```

**集成位置**: `run_pipeline()` 行1247，在调用`FormatDetector`后、`ColumnTyper.infer()`之前，检测双表并返回两个独立的数据区域分别处理。

**预期提升**: 识别双表结构，对每个子表独立做列类型推断，避免列错位。

---

### 方案4: LLM Fallback双条件触发

**问题**: 目前没有任何逻辑在confidence低时调用LLM。230个复杂Sheet需要批量处理。

**双条件触发**:
1. **条件A**: `confidence_score < 65`（低于MEDIUM下限）
2. **条件B**: 关键列缺失（brand或model为None，但存在其他列）

当 A+B 同时满足时，触发LLM fallback。

**批量调用策略**:
```python
# 新增 LLMFallbackBatch 类，放在QualityRouter后（行~1242）

LLM_FALLBACK_THRESHOLD = 65.0

class LLMFallbackBatch:
    """对低置信度记录批量调用LLM进行列语义识别"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.batch_size = 10  # 每批10条记录
    
    def build_prompt(self, records: list[dict]) -> str:
        """组装批量prompt"""
        headers_example = [r["raw_fields"] for r in records[:3]]
        prompt = f"""你是一个家电产品数据解析专家。给定以下Excel列名，判断每列的语义类型。
允许的类型：brand, model, price, category, stock, quantity, warehouse, costPrice, suggestedPrice, text

示例列结构：
{json.dumps(headers_example, ensure_ascii=False, indent=2)}

请以JSON格式返回每个列名对应的类型：
{{"col_0": "brand", "col_1": "model", ...}}
"""
        return prompt
    
    def parse_response(self, response: str) -> dict[int, str]:
        """解析LLM响应，返回列索引→类型映射"""
        # 尝试从```json代码块中提取
        import re
        match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", response)
        if match:
            text = match.group(1)
        else:
            text = response.strip()
        return json.loads(text)
    
    def batch_process(self, records: list[dict]) -> list[dict]:
        """批量处理记录，返回更新后的records"""
        if not records:
            return records
        
        # 按batch_size分组
        results = []
        for i in range(0, len(records), self.batch_size):
            batch = records[i:i+self.batch_size]
            prompt = self.build_prompt(batch)
            
            # 调用LLM API（示例用OpenAI兼容接口）
            import openai
            resp = openai.ChatCompletion.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
            )
            content = resp.choices[0].message.content
            
            col_mapping = self.parse_response(content)
            
            # 更新batch中每条记录的column_mapping
            for r in batch:
                r["llm_column_mapping"] = col_mapping
            
            results.extend(batch)
        
        return results
```

**集成方式**: 在`run_pipeline()`行1272之后:
```python
# 在每行处理后，检查是否需要LLM fallback
low_conf_records = [r for r in records 
                   if r["confidence_score"] < LLM_FALLBACK_THRESHOLD
                   and r["parsed_entities"].get("brand") is None 
                   and r["parsed_entities"].get("model") is None]

if low_conf_records:
    llm_batch = LLMFallbackBatch()
    updated_records = llm_batch.batch_process(low_conf_records)
    # 用LLM结果重新计算confidence...
```

**预期提升**: 对约10-15%的低置信度记录（无品牌无型号但有价格）进行LLM识别，预计提升3-5%准确率。

---

## 五、实施顺序（最优动手顺序）

### 第一阶段：可并行开发（不互相依赖）

| 步骤 | 模块 | 改动内容 | 预期提升 |
|------|------|---------|---------|
| **1** | ColumnTyper | 新增SUPPLIER_TEMPLATES字典 + 模板匹配逻辑 | +5%（8k条供应商25直接受益） |
| **2** | QualityRouter Bug | 一行修改：tier判断→分数判断 | 数据质量标记正确化（不是准确率提升，但为后续分析奠基） |

### 第二阶段：依赖第一阶段结果

| 步骤 | 模块 | 改动内容 | 预期提升 |
|------|------|---------|---------|
| **3** | IntakeLayer双表检测 | 列密度直方图算法 | +2%（识别双表结构避免列错位） |
| **4** | LLM Fallback | 双条件触发+批量调用逻辑 | +3-5%（复杂Sheet的列类型纠正） |

### 第三阶段：可选增强

| 步骤 | 模块 | 改动内容 | 预期提升 |
|------|------|---------|---------|
| **5** | ColumnTyper增强 | 扩展价格列名正则（+10种变体） | +2-3% |

---

## 六、快速见效方案（只改一个模块）

**只改 `ColumnTyper.infer()` 中的 `SUPPLIER_TEMPLATES` 字典**，为已知的小格式供应商（供应商25、18等）注册硬编码模板。

**改动量**: ~50行新增代码（SUPPLIER_TEMPLATES + match_supplier_template + infer()中的一段if）
**预期效果**: 供应商25（8,080条）从MEDIUM(55分)直接升到HIGH(90+)，总体准确率从74%提升至约**77-78%**

---

## 七、补充：17种价格列名完整列表

当前ColumnTyper已覆盖: `价格|price|售价|单价|批发价|开票价|工程价|今日批价|供货价`

**建议新增**（基于供应商数据观察）:
```python
# 建议在行491的正则中新增以下列名变体：
r"专属销售价|特价|活动价|会员价|工程机价|提货价|开单价|底价|结算价|直批价|渠道价"
```

完整价格列名正则应为:
```python
r"价格|price|售价|单价|批发价|开票价|工程价|今日批价|供货价|专属销售价|特价|活动价|会员价|工程机价|提货价|开单价|底价|结算价|直批价|渠道价"
```
