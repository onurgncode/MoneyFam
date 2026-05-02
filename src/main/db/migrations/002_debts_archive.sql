ALTER TABLE debts ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_debts_active ON debts(is_active);

-- Mevcut borçlar: kalan 0 ise arşive taşı.
UPDATE debts SET is_active = 0 WHERE remaining_amount <= 0;
