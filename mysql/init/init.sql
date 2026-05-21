CREATE DATABASE IF NOT EXISTS valuecube CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'valuecube'@'%' IDENTIFIED BY 'Vc@2026#db';
GRANT ALL PRIVILEGES ON valuecube.* TO 'valuecube'@'%';
FLUSH PRIVILEGES;

USE valuecube;

-- ============================================================
-- Phase 4.5: 规则泛化Rule表
-- 三次纠正后自动从 correction_logs 聚合生成，存储泛化的标准化规则
-- ============================================================
CREATE TABLE IF NOT EXISTS rules (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    rule_text       VARCHAR(512) NOT NULL COMMENT '规则描述文本',
    field           VARCHAR(64)  NOT NULL COMMENT '字段名: category/brand/price/model等',
    trigger_pattern VARCHAR(256)  DEFAULT NULL COMMENT '触发模式/原始值',
    target_value    VARCHAR(256)  DEFAULT NULL COMMENT '目标值/标准值',
    supplier_id     INT           DEFAULT NULL COMMENT '所属供应商NULL=全局规则',
    occurrence_count INT          NOT NULL DEFAULT 0 COMMENT '累计触发次数',
    correction_count INT          NOT NULL DEFAULT 0 COMMENT '纠正次数(达到3次后激活)',
    source          ENUM('auto','manual') NOT NULL DEFAULT 'auto' COMMENT '规则来源',
    status          ENUM('learning','active','disabled') NOT NULL DEFAULT 'learning' COMMENT '状态',
    confidence_boost DECIMAL(5,2) DEFAULT 0.00 COMMENT '置信度提升值',
    created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    activated_at    DATETIME      DEFAULT NULL COMMENT '激活时间',
    INDEX idx_field (field),
    INDEX idx_supplier (supplier_id),
    INDEX idx_status (status),
    INDEX idx_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
