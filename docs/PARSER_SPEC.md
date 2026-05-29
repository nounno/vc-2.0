# Parser 解析器规格说明书 v1.0

> **版本**：v1.0  
> **制定日期**：2026-05-28  
> **依据**：cruise 与九月的设计会话（飞书文档 `YoGkwsn1IihaqCkUKbmcRK12nAc`）  
> **适用范围**：VC 2.0 Parser 管理模块（Admin 前端 + API 后端）  
> **维护原则**：每次重大改动须同步更新本文档，标注变更日期和变更说明

---

## 一、业务目标

为运营人员提供可视化、可控的 Excel 供应商报价文件解析工具。

- 支持多供应商文件上传，自动切分多 Sheet
- 每阶段结果可视化，用户逐级确认后才进入下一阶段
- 低置信度数据优先处理，支持手动修改
- 记录所有修改历史，形成学习闭环

---

## 二、标准字段定义

解析器输出数据统一写入以下 6 个标准字段：

| 字段名 | 中文名 | 说明 | 示例 |
|--------|--------|------|------|
| `category` | 类别 | 商品品类 | `冰箱`、`空调`、`洗衣机` |
| `brand` | 品牌 | 商品品牌（统一中文名） | `美的`、`海尔`、`格力` |
| `model` | 型号 | 商品型号（原始写入） | `BCD-485WSPZM(E)` |
| `price` | 采购成本价 | 无论供应商文件列名叫什么价，统一视为采购成本价 | `2999.00` |
| `description` | 功能描述 | 商品功能、规格说明 | `十字对开门、变频、一级能效` |
| `notes` | 备注 | 短备注（≤50字），长备注（>50字）标记为物流备注不入库 | `安得直发48-72小时` |

**多价格处理**：同一行检测到多个价格字段 → 取最低值作为入库价格。

**长备注过滤**：备注 > 50 字一律视为物流噪音，不写入 `notes` 字段。

---

## 三、处理流程（5阶段）

```
┌─────────────────────────────────────────────────────────────┐
│  阶段一：上传切分                                            │
│  用户上传 Excel → 选择/新建供应商 → 系统自动切分 Sheet        │
│  输出：N 个子任务，每任务 = 1 个 Sheet                        │
└─────────────────────────────────────────────────────────────┘
                            ↓ 用户确认「开始清洗」
┌─────────────────────────────────────────────────────────────┐
│  阶段二：清洗                                                │
│  自动执行：展开合并单元格、统一编码 UTF-8、过滤空行/分隔行      │
│  输出：清洗报告「有效行 X 条，已过滤 Y 条」                    │
└─────────────────────────────────────────────────────────────┘
                            ↓ 用户确认「开始映射」
┌─────────────────────────────────────────────────────────────┐
│  阶段三：字段映射                                             │
│  自动执行：列名识别 → 匹配标准字段（category/brand/model/price/│
│             description/notes）                              │
│  无法匹配的列名单独列出，用户可手动映射或丢弃                   │
│  输出：映射对照表「型号 ← [产品型号, SKU, 型号]」              │
└─────────────────────────────────────────────────────────────┘
                            ↓ 用户确认「开始标准化」
┌─────────────────────────────────────────────────────────────┐
│  阶段四：标准化                                              │
│  自动执行：正则标准化格式 + LLM 语义标准化 + 置信度计算         │
│  正则处理：价格格式统一、型号格式规范、品牌名称统一             │
│  LLM 处理：正则无法处理的语义歧义                             │
│  输出：标准化报告「正则处理 X 条 / LLM 处理 Y 条 / 低置信度 Z 条」│
└─────────────────────────────────────────────────────────────┘
                            ↓ 用户确认「进入预览」
┌─────────────────────────────────────────────────────────────┐
│  阶段五：预览入库                                            │
│  按子表形成任务编号（如 P-20260528-001）                      │
│  所有行按置信度升序排列（低置信度置顶，高置信度在底部方便抽检）  │
│  每行可展开查看完整字段，支持手动修改                          │
│  行状态操作：废弃 / 修改 / 全部入库                           │
│  多商品行：标记「待拆分」，用户手动拆成多条或废弃               │
│  每次修改记录：「字段:原值→新值」存入修改历史                  │
│  用户点「入库」→ 写入 supplier_quotes → 完成                  │
└─────────────────────────────────────────────────────────────┘
```

**核心原则**：线性向前，不走回头路。某阶段发现质量问题 → 在预览阶段废弃/修改，不退回重做。

---

## 四、行状态定义

| 状态值 | 含义 | 出现在 |
|--------|------|--------|
| `valid` | 正常，可入库 | 预览阶段 |
| `flagged` | 低置信度（< 65分），需人工处理 | 预览阶段 |
| `pending_split` | 同一行含多个商品，需人工拆分 | 预览阶段 |
| `rejected` | 已废弃 | 预览阶段 |

---

## 五、置信度评分规则

初始分 100 分，以下情况扣分：

| 扣分条件 | 扣分值 |
|----------|--------|
| 备注 > 50 字（物流噪音） | -10 分 |
| 备注 20-50 字（可疑） | -5 分 |
| 型号格式不标准 | -10 分 |
| 价格字段为空 | -20 分 |
| 列名无法识别（需 LLM 介入） | -15 分 |

**阈值**：
- ≥ 65 分 → `valid`
- < 65 分 → `flagged`

---

## 六、数据库表结构

### parse_jobs（任务总表）

```sql
CREATE TABLE parse_jobs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_code      VARCHAR(32) NOT NULL UNIQUE,   -- 任务编号，如 P-20260528-001
  supplier_id   BIGINT UNSIGNED NOT NULL,
  original_filename VARCHAR(256) NOT NULL,
  file_path     VARCHAR(512),                  -- 临时文件路径
  status        ENUM('uploaded','split','cleaned','mapped',
                     'standardized','committed','failed') NOT NULL DEFAULT 'uploaded',
  sheet_count   INT UNSIGNED DEFAULT 0,
  total_rows    INT UNSIGNED DEFAULT 0,
  valid_rows    INT UNSIGNED DEFAULT 0,
  flagged_rows  INT UNSIGNED DEFAULT 0,
  committed_rows INT UNSIGNED DEFAULT 0,
  rejected_rows INT UNSIGNED DEFAULT 0,
  error_message TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supplier_id (supplier_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### parse_row_staging（行级中间数据）

```sql
CREATE TABLE parse_row_staging (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_id              BIGINT UNSIGNED NOT NULL,
  sheet_name          VARCHAR(128),
  row_index           INT UNSIGNED NOT NULL,    -- 在 Sheet 中的行号
  row_status          ENUM('valid','flagged','pending_split','rejected')
                      NOT NULL DEFAULT 'valid',
  confidence          DECIMAL(5,2) DEFAULT 100.0,
  category            VARCHAR(64),
  brand               VARCHAR(64),
  model               VARCHAR(256),
  model_std           VARCHAR(128),
  price               DECIMAL(10,2),
  price_type          VARCHAR(32),
  description         TEXT,
  notes               VARCHAR(512),
  raw_data            JSON,                      -- 原始行数据快照
  source_columns      JSON,                      -- 列名→标准字段映射
  confidence_details  JSON,                      -- 各字段扣分明细
  is_multi_product    TINYINT DEFAULT 0,        -- 1=多商品行
  split_into          JSON,                      -- 拆出的多条原始数据
  manually_corrected  TINYINT DEFAULT 0,
  reviewer_action     VARCHAR(32),
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_job_id (job_id),
  INDEX idx_row_status (row_status),
  INDEX idx_confidence (confidence)
);
```

### correction_logs（修改历史，复用现有表）

```sql
-- 复用现有 correction_logs 表
-- 字段：id, job_id, row_id, field_name, original_value, corrected_value, corrected_at
-- 每次用户手动修改入库前的一条记录时写入
```

---

## 七、后端 API 端点

| 端点 | 方法 | 阶段 | 说明 |
|------|------|------|------|
| `/api/v1/parser/upload` | POST | 阶段一 | 上传文件 + 自动切分 Sheet |
| `/api/v1/parser/jobs` | GET | 全部 | 任务列表 |
| `/api/v1/parser/jobs/{id}` | GET | 全部 | 任务详情 + 当前状态 |
| `/api/v1/parser/jobs/{id}/sheets` | GET | 阶段一 | 切分结果（各 Sheet 行数预览） |
| `/api/v1/parser/jobs/{id}/confirm-split` | POST | 阶段一→二 | 确认切分，进入清洗 |
| `/api/v1/parser/jobs/{id}/rows` | GET | 阶段五 | 预览行（支持 status/limit/page 参数） |
| `/api/v1/parser/jobs/{id}/rows/{row_id}` | PATCH | 阶段五 | 更新单行（修改字段值或行状态） |
| `/api/v1/parser/jobs/{id}/commit` | POST | 阶段五 | 确认入库 |
| `/api/v1/parser/jobs/{id}/rollback` | POST | 任意 | 回退任务状态（可选） |

---

## 八、前端页面结构

### /parser（上传入口 + 任务列表）

- 拖拽上传区域（支持 xlsx/xls）
- 供应商选择下拉（可新建）
- 历史任务列表（状态、文件名、上传时间、条数）
- 点击任务 → 进入解析详情

### /parser/[id]（解析详情 + 多环节确认）

顶部：任务状态进度条（5阶段）
```
[①上传] → [②切分✓] → [③清洗] → [④映射] → [⑤预览]
```

每阶段展开内容：
- **阶段一（切分）**：各 Sheet 名称 + 行数列表 → 「开始清洗」按钮
- **阶段二（清洗）**：清洗报告 → 「开始映射」按钮
- **阶段三（映射）**：列名对照表 → 「开始标准化」按钮
- **阶段四（标准化）**：标准化报告 + 置信度分布 → 「进入预览」按钮
- **阶段五（预览入库）**：行列表（低置信度在上）+ 行编辑 + 批量操作 → 「入库」按钮

---

## 九、已实现清单（2026-05-28 状态）

| 模块 | 功能 | 状态 | 备注 |
|------|------|------|------|
| 后端 | parse_jobs 表 | ✅ 已创建 | |
| 后端 | parse_row_staging 表 | ✅ 已创建 | |
| 后端 | POST /parser/upload | ✅ 已实现 | 上传后停在 uploaded（不再跳步到 standardized），2026-05-28 修复 |
| 后端 | GET /parser/jobs | ✅ 已实现 | |
| 后端 | GET /parser/jobs/{id} | ✅ 已实现 | |
| 后端 | GET /parser/jobs/{id}/sheets | ✅ 已实现 | 2026-05-28 上线 |
| 后端 | POST /parser/jobs/{id}/confirm-stage | ✅ 已实现 | 统一 confirm 接口，跳转各阶段 |
| 后端 | POST /parser/jobs/{id}/rollback | ✅ 已实现 | 2026-05-28 上线，只能回退上一阶段 |
| 后端 | GET /parser/jobs/{id}/rows | ✅ 已实现 | 按置信度升序排列（flagged/pending_split 在前） |
| 后端 | PATCH /parser/jobs/{id}/rows/{row_id} | ✅ 已实现 | reject/modify/split 三种操作 |
| 后端 | POST /parser/jobs/{id}/commit | ✅ 已实现 | action=commit_valid 只入库 valid 行，skip flagged |
| 后端 | inlineStr 处理（内联字符串） | ✅ 已修复 | 美的文件验证通过 |
| 后端 | 列位置映射修复（get_val） | ✅ 已修复 | 美的文件验证通过 |
| 前端 | /parser 页面（上传 + 列表） | ✅ 已实现 | |
| 前端 | /parser/[id] 页面（行预览） | ✅ 已实现 | |
| 前端 | 多阶段确认流程 | ❌ 未实现 | 无分阶段 UI，现状直接入库 |
| 前端 | 逐行编辑 / 修改历史 | ❌ 未实现 | |
| 前端 | 低置信度置顶 + pending_split | ❌ 未实现 | |
| 功能 | 合并单元格展开 | ⚠️ 部分实现 | 新解析器未集成，旧 pipeline 有但未迁移 |
| 功能 | 恒生文件（多 Sheet + 合并单元格） | ❌ 未验证 | 待真实文件测试 |

---

## 十、变更记录

| 日期 | 版本 | 变更内容 | 依据 |
|------|------|----------|------|
| 2026-05-28 | v1.0 | 初始版本，按 2026-05-28 凌晨设计会话制定 | cruise × 九月设计会话 |
| 2026-05-28 | v1.1 | 后端补充：新增 sheets/rollback 接口；upload 停在 uploaded 阶段；commit 支持 selective 入库 | 2026-05-28 上午实现 |
