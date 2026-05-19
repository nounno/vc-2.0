-- ============================================================
-- ValueCube DataCenter Schema — Phase 2
-- 标准化商品目录 + 供应商情报
-- ============================================================

USE valuecube_prod;
-- (Schema also supports MySQL — see schema.sql for reference)

-- ============================================================
-- DataCenter SQLite Storage (MySQL unavailable)
-- ============================================================
CREATE TABLE IF NOT EXISTS std_products (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_uuid    TEXT NOT NULL UNIQUE,
    brand           TEXT NOT NULL,
    category        TEXT NOT NULL,
    model_std       TEXT NOT NULL,
    model_raw       TEXT,
    horsepower      TEXT,
    volume_l        TEXT,
    capacity_kg     TEXT,
    screen_size     TEXT,
    is_trap         INTEGER DEFAULT 0,
    trap_type       TEXT,
    trap_desc       TEXT,
    source_file     TEXT,
    subsidy_code    TEXT,
    created_at     TEXT DEFAULT (datetime('now')),
    updated_at     TEXT DEFAULT (datetime('now')),
    UNIQUE(model_std, brand, category)
);

CREATE TABLE IF NOT EXISTS suppliers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_code   TEXT NOT NULL UNIQUE,
    supplier_name   TEXT NOT NULL,
    source_file     TEXT,
    file_date       TEXT,
    data_quality_score REAL DEFAULT 0.0,
    parse_success_rate  REAL DEFAULT 0.0,
    price_tier      TEXT DEFAULT 'unknown',
    freshness       TEXT DEFAULT 'pending',
    total_records   INTEGER DEFAULT 0,
    total_brands   INTEGER DEFAULT 0,
    avg_price       REAL DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplier_quotes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id     INTEGER NOT NULL,
    product_uuid    TEXT,
    brand           TEXT,
    category        TEXT,
    model_raw       TEXT,
    model_std       TEXT,
    price           REAL,
    price_type      TEXT,
    quality_tier    TEXT DEFAULT 'MEDIUM',
    confidence      REAL DEFAULT 0.0,
    error_type      TEXT,
    raw_row         TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supplier_brand_dist (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id     INTEGER NOT NULL,
    brand           TEXT NOT NULL,
    category        TEXT DEFAULT 'unknown',
    record_count    INTEGER DEFAULT 0,
    avg_price       REAL DEFAULT 0,
    share_pct       REAL DEFAULT 0.0,
    created_at      TEXT DEFAULT (datetime('now')),
    UNIQUE(supplier_id, brand),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS category_price_bands (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    category        TEXT NOT NULL,
    brand           TEXT DEFAULT '*',
    price_min       REAL DEFAULT 0,
    price_max       REAL DEFAULT 0,
    price_avg       REAL DEFAULT 0,
    price_p25       REAL DEFAULT 0,
    price_p75       REAL DEFAULT 0,
    sample_count    INTEGER DEFAULT 0,
    supplier_id     INTEGER,
    updated_at      TEXT DEFAULT (datetime('now')),
    UNIQUE(category, brand, supplier_id)
);

CREATE TABLE IF NOT EXISTS data_quality_errors (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id     INTEGER NOT NULL,
    error_type      TEXT NOT NULL,
    error_count     INTEGER DEFAULT 1,
    sample_model    TEXT,
    sample_brand    TEXT,
    first_seen_at   TEXT DEFAULT (datetime('now')),
    last_seen_at   TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sp_brand_cat ON std_products(brand, category);
CREATE INDEX IF NOT EXISTS idx_sq_cat ON supplier_quotes(category);
CREATE INDEX IF NOT EXISTS idx_sq_quality ON supplier_quotes(quality_tier);
CREATE INDEX IF NOT EXISTS idx_sb_supplier ON supplier_brand_dist(supplier_id);
CREATE INDEX IF NOT EXISTS idx_cpb_cat ON category_price_bands(category);

-- ─────────────────────────────────────────
-- 1. std_products: 标准化商品目录（国补标准型号）
--    全局唯一标识 = UNIQUE(model_code, brand, category)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS std_products (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_uuid    CHAR(36) NOT NULL DEFAULT (UUID()),  -- 全局唯一标识

    brand           VARCHAR(64) NOT NULL COMMENT '品牌',
    category        VARCHAR(32) NOT NULL COMMENT '品类: ac/refrigerator/washer/tv/...',
    model_std       VARCHAR(128) NOT NULL COMMENT '标准型号（去营销化）',
    model_raw       VARCHAR(256) COMMENT '原始型号',

    -- 品类规格
    horsepower      VARCHAR(32) COMMENT '空调匹数',
    volume_l        VARCHAR(16) COMMENT '冰箱容积(L)',
    capacity_kg     VARCHAR(16) COMMENT '洗衣机容量(kg)',
    screen_size     VARCHAR(16) COMMENT '电视尺寸',

    -- 营销陷阱标签
    is_trap         TINYINT DEFAULT 0 COMMENT '是否有营销陷阱: 0=正常, 1=疑似陷阱',
    trap_type       VARCHAR(64) COMMENT '陷阱类型',
    trap_desc       VARCHAR(256) COMMENT '陷阱说明',

    -- 来源
    source_file     VARCHAR(256) COMMENT '来源文件名',
    subsidy_code    VARCHAR(64) COMMENT '国补商品编码',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_brand_category (brand, category),
    INDEX idx_category (category),
    INDEX idx_model_std (model_std),
    UNIQUE KEY uk_product (model_std, brand, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标准化商品目录';

-- ─────────────────────────────────────────
-- 2. suppliers: 供应商主档
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_code   VARCHAR(64) NOT NULL COMMENT '供应商编码（文件路径/日期哈希）',
    supplier_name   VARCHAR(128) NOT NULL COMMENT '供应商简称',
    source_file     VARCHAR(256) COMMENT '报价文件路径',
    file_date       DATE COMMENT '报价日期',

    -- 供应商情报指标
    data_quality_score  DECIMAL(4,1) DEFAULT 0.0 COMMENT '数据质量评分: 0-100',
    parse_success_rate   DECIMAL(5,2) DEFAULT 0.0 COMMENT '解析成功率: 0-100%',
    price_tier          ENUM('high','mid','low','unknown') DEFAULT 'unknown' COMMENT '价格带定位',
    freshness           ENUM('live','valid','pending','archived') DEFAULT 'pending' COMMENT '新鲜度标签',

    -- 统计
    total_records  INT UNSIGNED DEFAULT 0 COMMENT '总报价条数',
    total_brands   INT UNSIGNED DEFAULT 0 COMMENT '代理品牌数',
    avg_price      DECIMAL(10,2) DEFAULT 0 COMMENT '平均报价',

    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_supplier_code (supplier_code),
    INDEX idx_file_date (file_date),
    INDEX idx_freshness (freshness)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商主档';

-- ─────────────────────────────────────────
-- 3. supplier_quotes: 供应商报价明细
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_quotes (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    supplier_id     BIGINT UNSIGNED NOT NULL,
    product_uuid    CHAR(36) COMMENT '关联标准化商品UUID（未匹配则为NULL）',

    brand           VARCHAR(64) COMMENT '品牌',
    category        VARCHAR(32) COMMENT '品类',
    model_raw       VARCHAR(256) COMMENT '原始型号',
    model_std       VARCHAR(128) COMMENT '标准化型号',

    price           DECIMAL(10,2) COMMENT '报价',
    price_type      VARCHAR(32) COMMENT '价格类型: 供货价/批发价/零售价...',

    -- 质量路由
    quality_tier    ENUM('HIGH','MEDIUM','LOW') DEFAULT 'MEDIUM',
    confidence      DECIMAL(5,1) DEFAULT 0.0 COMMENT '置信度: 0-100',
    is_low_quality  TINYINT DEFAULT 0 COMMENT '自动标记低质数据: 1=低质(置信度<65), 0=正常',

    -- 错误标签
    error_type      VARCHAR(64) COMMENT '错误类型: no_model/no_price/ambiguous/...',

    raw_row         JSON COMMENT '原始行数据（JSON）',

    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    INDEX idx_supplier (supplier_id),
    INDEX idx_category (category),
    INDEX idx_quality (quality_tier),
    INDEX idx_model_std (model_std)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商报价明细';

-- ─────────────────────────────────────────
-- 4. supplier_brand_dist: 供应商品牌分布
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_brand_dist (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_id     BIGINT UNSIGNED NOT NULL,
    brand           VARCHAR(64) NOT NULL,
    category        VARCHAR(32) DEFAULT 'unknown',
    record_count    INT UNSIGNED DEFAULT 0 COMMENT '该品牌报价条数',
    avg_price       DECIMAL(10,2) DEFAULT 0 COMMENT '该品牌平均报价',
    share_pct       DECIMAL(5,2) DEFAULT 0.0 COMMENT '占供应商总条数比例%',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    UNIQUE KEY uk_supplier_brand (supplier_id, brand),
    INDEX idx_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='供应商品牌分布';

-- ─────────────────────────────────────────
-- 5. category_price_bands: 品类价格区间
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS category_price_bands (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category        VARCHAR(32) NOT NULL,
    brand           VARCHAR(64) DEFAULT '*' COMMENT '*表示全品牌',
    price_min       DECIMAL(10,2) DEFAULT 0 COMMENT '最低价',
    price_max       DECIMAL(10,2) DEFAULT 0 COMMENT '最高价',
    price_avg       DECIMAL(10,2) DEFAULT 0 COMMENT '平均价',
    price_p25       DECIMAL(10,2) DEFAULT 0 COMMENT '25分位数',
    price_p75       DECIMAL(10,2) DEFAULT 0 COMMENT '75分位数',
    sample_count    INT UNSIGNED DEFAULT 0 COMMENT '样本数',
    supplier_id     BIGINT UNSIGNED DEFAULT NULL COMMENT 'NULL=全局',
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_cat_brand (category, brand, supplier_id),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='品类价格区间';

-- ─────────────────────────────────────────
-- 6. data_quality_errors: 数据质量错误记录
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_quality_errors (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_id     BIGINT UNSIGNED NOT NULL,
    error_type      VARCHAR(64) NOT NULL COMMENT '错误类型',
    error_count     INT UNSIGNED DEFAULT 1 COMMENT '错误次数',
    sample_model    VARCHAR(256) COMMENT '示例型号',
    sample_brand    VARCHAR(64) COMMENT '示例品牌',
    first_seen_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    INDEX idx_supplier_error (supplier_id, error_type),
    INDEX idx_error_type (error_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据质量错误记录';

-- ─────────────────────────────────────────
-- 7. correction_logs: 学习闭环-纠正记录
--    记录规则/模型纠错全流程，支持质量提升闭环
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS correction_logs (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- 关联主体
    entity_type     VARCHAR(32) NOT NULL COMMENT '关联类型: rule/supplier/product',
    entity_id       VARCHAR(128) NOT NULL COMMENT '关联实体标识',

    -- 纠错上下文
    rule_id         BIGINT UNSIGNED COMMENT '关联规则ID（若有）',
    supplier_id     BIGINT UNSIGNED COMMENT '关联供应商ID（若有）',

    -- 原始 vs 纠正后
    original_value  TEXT COMMENT '原始值（JSON）',
    corrected_value TEXT COMMENT '纠正后值（JSON）',
    correction_desc VARCHAR(512) COMMENT '纠错说明',

    -- 流程状态
    status          ENUM('applied','verified','reverted','failed') DEFAULT 'applied' COMMENT '纠正状态',
    applied_at      DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '应用时间',
    verified_at     DATETIME COMMENT '验收时间',
    reverted_at     DATETIME COMMENT '回滚时间',

    -- 效果评估
    quality_before  DECIMAL(5,2) COMMENT '纠正前质量分',
    quality_after   DECIMAL(5,2) COMMENT '纠正后质量分',
    error_reduced   INT COMMENT '错误数减少量',
    notes           TEXT COMMENT '备注',

    -- 操作审计
    operator        VARCHAR(64) COMMENT '操作人',
    source          VARCHAR(32) DEFAULT 'manual' COMMENT '来源: manual/auto/batch',

    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_rule (rule_id),
    INDEX idx_supplier (supplier_id),
    INDEX idx_status (status),
    INDEX idx_applied_at (applied_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习闭环-纠正记录';
