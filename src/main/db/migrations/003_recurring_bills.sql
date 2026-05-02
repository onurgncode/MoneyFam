ALTER TABLE bills ADD COLUMN recurring INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bills ADD COLUMN recurring_parent_id INTEGER REFERENCES bills(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bills_recurring ON bills(recurring);
CREATE INDEX IF NOT EXISTS idx_bills_recurring_parent ON bills(recurring_parent_id);
