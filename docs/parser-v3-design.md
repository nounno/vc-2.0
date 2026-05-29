# VC 2.0 解析器 V3 设计方案

**版本**：V3
**日期**：2026-05-29
**作者**：九月
**状态**：待 boss 确认后执行

---

## 一、为什么需要 V3

| 版本 | 核心思路 | 问题 |
|------|---------|------|
| V1 | 正则 + 列名硬匹配 | 没见过的新品类/品牌直接挂 |
| V2 | LLM 兜底（conf<65 时触发） | LLM 每次从头分析，无积累；正则和 LLM 是两个独立路径，没有互相增强 |
| **V3** | **知识库驱动 + LLM 生产正则** | **系统越跑越聪明，新品类进来一次就学会** |

**V3 的本质转变**：LLM 不是兜底工具，而是**正则的生产引擎**。正则体系从第一天起就在生长，而不是静态规则库。

---

## 二、知识库：新增核心组件

### 2.1 定位

知识库是 V3 的心脏。所有提取规则、列名映射、品牌别名、型号规则全部存在这里。Pipeline 每处理一次文件，都在往里写新知识。

**存储位置**：MySQL 表（`parser_rules`），与 supplier_quotes 同库

### 2.2 Schema

```sql
CREATE TABLE parser_rules (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand           VARCHAR(64)     COMMENT '品牌名（小写，精确匹配）',
    category        VARCHAR(64)     COMMENT '品类（kfr/BCD/JSQ等）',
    header_key      VARCHAR(128)    COMMENT '列名（小写标准化）',
    pattern_type    ENUM('regex','keyword','position','llm_jsonpath')  COMMENT '匹配方式',
    pattern_value   TEXT            COMMENT '具体模式（正则表达式或关键词列表）',
    sample_input    TEXT            COMMENT '触发这条规则的样本输入',
    confidence      INT DEFAULT 0   COMMENT '累计置信度（每次成功+1）',
    fail_count      INT DEFAULT 0   COMMENT '累计失败次数（用于淘汰）',
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_brand_category (brand, category),
    INDEX idx_conf (confidence DESC)
);

CREATE TABLE parser_brand_aliases (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand       VARCHAR(64)     COMMENT '标准品牌名（小写）',
    alias       VARCHAR(64)     COMMENT '别名（小写）',
    confidence  INT DEFAULT 1,
    source      VARCHAR(128)    COMMENT '来源：llm_discovered / manual / import',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_alias (alias),
    INDEX idx_brand (brand)
);

CREATE TABLE parser_category_patterns (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand           VARCHAR(64),
    category        VARCHAR(64),
    model_pattern   VARCHAR(256)    COMMENT '型号命名正则，如 ^KFR[0-9]{4}$',
    naming_markers  JSON            COMMENT '命名特征标记：{prefixes:[KFR,BD], suffixes:[W,G]}',
    confidence      INT DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_brand_category (brand, category)
);
```

### 2.3 知识库成长路径

```
第1次：美的空调报价.xlsx 进来
  → LLM 没见过这个组合
  → LLM 边提取边写规则到 parser_rules
  → brand_aliases 写入：美的 → 美的
  → model_pattern 写入：KFR\d{4}...
  → confidence = 1

第50次：美的空调报价.xlsx 再进来
  → 知识库命中 brand+category+header_key
  → 直接用缓存正则提取，0次 LLM 调用
  → confidence = 50

第51次：新品牌"格力"空调报价进来
  → 知识库无格力记录
  → LLM 边提取边写规则
  → brand_aliases 写入：格力 → 格力
  → model_pattern 写入：KFR\d{4}...
  → 系统学会格力了

第100次：海尔冰箱报价进来（新品类 BCD）
  → 知识库有"冰箱"品类但无"海尔 BCD"
  → LLM 边提取边写
  → model_pattern 写入：BCD\w+...
  → 系统学会海尔冰箱了
```

---

## 三、六层数据工厂：详细数据流

```
原始文件（xlsx / csv / pdf）
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Intake（接入层）                                    │
│ 职责：格式识别、编码检测、解压                                  │
│ 输入：原始字节流                                              │
│ 输出：干净字节流 + 文件类型 + 编码                              │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Format（格式层）                                    │
│ 职责：结构化解析                                              │
│ 输入：干净字节流 + 文件类型                                     │
│ 输出：标准行列表（List<Dict>），每行等长                        │
│ 技术：openpyxl / csv / pymupdf                               │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Column Layout（列布局层）                            │
│ 职责：表头识别、合并单元格展平、列数标准化                        │
│ 输入：List<Dict>                                             │
│ 输出：{header_row_idx, columns: [{name, sample_values}]}      │
│ 关键：header_row_idx 是动态的，不假设第1行就是表头               │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Semantic Mapping（语义映射层）★★★ 核心 ★★★           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Step A: Brand Normalization（品牌名标准化）           │    │
│  │ 输入：文件内品牌字符串                                │    │
│  │ 查 parser_brand_aliases                             │    │
│  │   命中 → 直接返回标准品牌名                          │    │
│  │   未命中 → LLM 判断标准品牌名 → 写入 brand_aliases  │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Step B: Category Detection（品类识别）                │    │
│  │ 输入：品牌名 + 表头列名                               │    │
│  │ 查 parser_category_patterns（brand+category）        │    │
│  │   命中 → 返回品类标签（kfr/BCD/JSQ...）             │    │
│  │   未命中 → LLM 看列名+样本值 判断品类 → 写入         │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Step C: Column Semantic Map（列语义映射）             │    │
│  │ 输入：brand + category + columns + sample_values      │    │
│  │ 查询 parser_rules（brand+category+header_key）        │    │
│  │   命中 → 直接用缓存的 pattern_value                  │    │
│  │   未命中 → LLM 看原始数据，判断每列含义               │    │
│  │         → 生成 pattern_value → 写入 parser_rules     │    │
│  │         → confidence = 1                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│ 输出：{column_mappings: [{col_idx, col_name, ir_field,       │
│              pattern_type, pattern_value, source}]}         │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: Value Extract（实体提取层）                          │
│ 职责：根据 Layer 4 的映射规则，逐列提取 IR 强制字段              │
│                                                             │
│ IR 强制字段：brand / model / category / costPrice /          │
│              suggestedPrice / quantity / warehouse         │
│                                                             │
│ 输入：rows + column_mappings                                 │
│ 输出：List<IRRecord>                                        │
│                                                             │
│ 提取策略：                                                   │
│   regex     → re.findall(pattern, cell_value)               │
│   keyword   → cell_value in keywords_list                   │
│   position  → 按列位置索引（列布局已知时兜底）                 │
│   llm_jsonpath → 预留，未来 LLM 输出结构化路径                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 6: Quality Scoring（质量评分层）                        │
│ 职责：完整度评分 / 冲突检测 / 异常标记 / 规则反馈               │
│                                                             │
│ 评分公式：                                                   │
│   score = (已填IR字段数 / 7) * 100                          │
│                                                             │
│ 规则反馈（Layer 4 自我优化）：                                │
│   score < 60 → 标记 parser_rules.fail_count += 1            │
│   fail_count > 3 → 标记该规则为 "需复核"                      │
│   confidence > 10 且 score > 80 → 规则稳定                  │
│                                                             │
│ 输出：{records: List<IRRecord>, score: float, issues: []}  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
最终输出：List<IRRecord> + 质量报告
```

---

## 四、LLM 调用协议（必须遵守）

### 4.1 何时调用 LLM

LLM **仅在** Layer 4 的以下三个时刻被调用：

| 触发条件 | LLM 任务 |
|---------|---------|
| 品牌名不在 brand_aliases | 判断"原始字符串"的标准品牌名 |
| 品类不在 category_patterns | 判断文件属于哪个品类（kfr/BCD/JSQ...） |
| 列语义不在 parser_rules | 一次性判断**所有列**的语义，返回每列的提取正则 |

### 4.2 LLM Prompt 模板（列语义判断）

```
你是一个家电行业的数据提取专家。

品牌：{brand}
品类：{category}
表头行：{header_names}
前5行样本数据：
{rows_json}

请判断每一列对应的IR字段（brand/model/category/costPrice/suggestedPrice/quantity/warehouse）。

输出JSON格式：
{{
  "columns": [
    {{
      "header": "原始列名",
      "ir_field": "对应的IR字段名",
      "confidence": 85,
      "pattern": "如果需要正则，请提供；否则为null",
      "reasoning": "为什么这么判断"
    }}
  ]
}}

注意：
- 不要猜测，只根据样本数据判断
- 如果某列没有对应IR字段，ir_field 填 null
- 正则表达式用 Python re 语法
```

### 4.3 知识库回写格式

LLM 返回后，九月负责将以下内容写入知识库：

```sql
-- 列语义规则
INSERT INTO parser_rules (brand, category, header_key, pattern_type, pattern_value, sample_input, confidence)
VALUES ('{brand}', '{category}', '{header_name}', 'regex', '{pattern}', '{first_sample}', 1);

-- 品牌别名（如果发现了新别名）
INSERT INTO parser_brand_aliases (brand, alias, source)
VALUES ('{normalized_brand}', '{original_str}', 'llm_discovered');
```

---

## 五、知识库使用算法

### 5.1 查询优先级

当处理一个新文件时，知识库查询顺序：

```
1. parser_brand_aliases   → 标准化品牌名
2. parser_category_patterns → 获取品类标签
3. parser_rules           → 按 brand + category + header_key 三级查找
```

### 5.2 置信度衰减与淘汰

```sql
-- 当某条规则连续失败3次，降权
UPDATE parser_rules SET confidence = confidence - 5 WHERE fail_count > 3;

-- 当 confidence <= 0，标记为"已淘汰"，下次不再使用
-- 已淘汰的规则仍保留在数据库，供人工复核
```

### 5.3 知识库未命中时的降级路径

```
知识库查询
  │
  ├─ 品牌未命中 → LLM 判断 → 写回 brand_aliases → 继续
  │
  ├─ 品类未命中 → LLM 判断 → 写回 category_patterns → 继续
  │
  └─ 列规则未命中 → LLM 判断 → 写回 parser_rules → 继续

所有 LLM 调用均记录日志，包含：
  - 触发文件
  - 原始值
  - LLM 返回值
  - 用于人工复核
```

---

## 六、数据路径总图

```
供应商上传文件（xlsx）
    │
    ▼
Pipeline Intake（Layer 1-2）
  识别格式、编码，解析为行数据
    │
    ▼
Knowledge Base Lookup（Layer 4 内置）
  ┌─ 查品牌别名 ──────────────────────────┐
  │   命中 → 标准化品牌名                  │
  │   未命中 → LLM 判断 → 写回            │
  └──────────────────────────────────────┘
  ┌─ 查品类规则 ──────────────────────────┐
  │   命中 → 品类标签                      │
  │   未命中 → LLM 判断 → 写回            │
  └──────────────────────────────────────┘
  ┌─ 查列提取规则 ────────────────────────┐
  │   命中 → 直接用缓存正则提取             │
  │   未命中 → LLM 一次判断所有列 → 写回   │
  └──────────────────────────────────────┘
    │
    ▼
Layer 5：按规则提取 IR 字段
    │
    ▼
Layer 6：质量评分 + 规则反馈
    │
    ▼
结构化数据 → Datacenter API → MySQL
质量报告 → 返回调用方
```

---

## 七、API 设计

### 7.1 Pipeline 上传接口（保持兼容）

```
POST /pipeline/upload
Content-Type: multipart/form-data

file: <binary>
supplier_id: int

返回：{task_id: "uuid", status: "queued"}
```

### 7.2 Pipeline 状态查询接口（保持兼容）

```
GET /pipeline/result/{task_id}

返回：{
  status: "queued" | "processing" | "completed" | "failed",
  score: 85,
  record_count: 120,
  issues: ["第45行 model 字段为空"]
}
```

### 7.3 新增：知识库管理接口

```
GET /parser/rules?brand=美的&category=kfr
  → 返回美的空调所有列提取规则

GET /parser/rules?min_confidence=10
  → 返回高置信度规则（用于导出/备份）

POST /parser/rules/feedback
Body: {rule_id, outcome: "success" | "fail"}
  → 人工反馈，adjusts confidence

DELETE /parser/rules/{id}
  → 人工删除低质量规则
```

### 7.4 新增：LLM 调用日志

```
GET /parser/llm-logs?task_id=xxx
  → 返回该任务中所有 LLM 调用记录
  → 包含：触发条件、原始值、LLM返回、规则写入
```

---

## 八、技术实现要点

### 8.1 技术栈（无变化）

- FastAPI（Pipeline Service）
- openpyxl / csv（Format Layer）
- Redis Streams（异步队列）
- MySQL（知识库 + IR 数据）
- DeepSeek API（LLM 调用）

### 8.2 LLM 调用策略

| 策略 | 说明 |
|------|------|
| 批量列判断 | Layer 4 Step C 一次调用判断所有列，不逐列调 LLM |
| 超时处理 | LLM 调用超时 10s，走降级路径（标记该列待人工处理） |
| 重试 | LLM 返回非 JSON，重试 1 次；仍失败则标记列语义未知 |
| MiniMax 禁用 | MiniMax 返回 thinking 块不适合 JSON 解析，**仅用 DeepSeek** |

### 8.3 性能考量

- 知识库命中时：单文件处理 < 500ms（无 LLM 调用）
- 知识库未命中时：单文件处理 3-10s（含 LLM 调用）
- 知识库预热：服务启动时加载 confidence > 10 的规则到内存缓存

---

## 九、与 V2 的关键差异

| 维度 | V2 | V3 |
|------|----|----|
| 品牌识别 | 正则或 LLM 兜底 | 知识库查 brand_aliases，未命中 LLM 并写回 |
| 品类判断 | 硬编码品类关键词 | 知识库查 category_patterns，未命中 LLM 并写回 |
| 列提取 | 列名正则匹配 + LLM 兜底 | 知识库查 parser_rules，未命中 LLM 一次判断所有列并写回 |
| 正则积累 | 无 | 每次 LLM 提取都生产新正则，知识库持续生长 |
| 自我优化 | 无 | Layer 6 评分反馈调整规则 confidence |
| 系统演进 | 每次重头来 | 越跑越聪明，LLM 依赖越来越少 |

---

## 十、部署与数据迁移

### 10.1 新增数据表

```sql
-- 执行时机：V3 上线时一次性执行
CREATE TABLE parser_rules (...);
CREATE TABLE parser_brand_aliases (...);
CREATE TABLE parser_category_patterns (...);
CREATE TABLE parser_llm_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id VARCHAR(64),
    layer VARCHAR(32),
    trigger_condition TEXT,
    input_data TEXT,
    llm_output TEXT,
    rules_written JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_task (task_id)
);
```

### 10.2 V2 规则迁移

V2 中的硬编码品牌别名、品类关键词、列名映射，**一次性导入**知识库作为初始种子数据，confidence 初始化为 10（表示来自历史经验）。

---

## 十一、验证计划

V3 上线后，分三阶段验证：

**阶段1：知识库空载（全新品类）**
上传一个完全陌生的品牌+品类文件（如：西门子烤箱报价.xlsx）
- 预期：LLM 被调用 → 知识库写入规则 → 提取成功

**阶段二：知识库复用（同款品类第二次上传）**
再次上传同一文件
- 预期：知识库命中 → LLM 不调用 → 提取成功

**阶段三：知识库增长（新品牌同品类）**
上传同品类新品牌（如：原来学的是美的空调，现在上传格力空调）
- 预期：品类规则复用，品牌规则新建 → LLM 调用1次

---

*本方案由九月起草，待张炜（boss）确认后执行。*
