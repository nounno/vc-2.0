-- P-002: Add indexes to supplier_quotes table
-- Migration executed: 2026-05-27
-- Added indexes for common query patterns

-- Single column indexes
ALTER TABLE supplier_quotes ADD INDEX idx_brand (brand);
ALTER TABLE supplier_quotes ADD INDEX idx_created_at (created_at);

-- Composite index for common query pattern: supplier + brand + category
ALTER TABLE supplier_quotes ADD INDEX idx_supplier_brand_category (supplier_id, brand, category);

-- Verify indexes
SHOW INDEX FROM supplier_quotes;
