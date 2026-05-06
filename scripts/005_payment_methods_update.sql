-- Migration 005: Extend payment_deposits for QRIS and E-Money support

-- Step 1: Drop the old payment_method CHECK constraint
ALTER TABLE payment_deposits
  DROP CONSTRAINT IF EXISTS payment_deposits_payment_method_check;

-- Step 2: Re-add with expanded list (QRIS + all e-money + banks)
ALTER TABLE payment_deposits
  ADD CONSTRAINT payment_deposits_payment_method_check
  CHECK (payment_method IN (
    'qris',
    'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja',
    'bca', 'bni', 'bri', 'mandiri', 'permata', 'cimb'
  ));

-- Step 3: Add QRIS-specific columns
ALTER TABLE payment_deposits
  ADD COLUMN IF NOT EXISTS qris_static_string  TEXT,
  ADD COLUMN IF NOT EXISTS qris_dynamic_string TEXT,
  ADD COLUMN IF NOT EXISTS transaction_ref      TEXT;

-- Step 4: Add e-money destination columns
ALTER TABLE payment_deposits
  ADD COLUMN IF NOT EXISTS emoney_account TEXT,
  ADD COLUMN IF NOT EXISTS emoney_name    TEXT;

-- Step 5: Admin QRIS & E-Money configuration table
--   Stores the merchant's static QRIS string and e-money account numbers
CREATE TABLE IF NOT EXISTS payment_config (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key     TEXT UNIQUE NOT NULL,
  config_value   TEXT        NOT NULL,
  description    TEXT,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default config keys (admin fills the real values via SQL editor or admin UI)
INSERT INTO payment_config (config_key, config_value, description)
VALUES
  ('qris_static_string',   '',   'Static QRIS string from your QRIS merchant sticker/PDF'),
  ('gopay_number',         '',   'GoPay merchant account number'),
  ('ovo_number',           '',   'OVO merchant account number'),
  ('dana_number',          '',   'DANA merchant account number'),
  ('shopeepay_number',     '',   'ShopeePay merchant account number'),
  ('linkaja_number',       '',   'LinkAja merchant account number'),
  ('bca_number',           '',   'BCA bank account number'),
  ('bca_name',             '',   'BCA account holder name'),
  ('bni_number',           '',   'BNI bank account number'),
  ('bni_name',             '',   'BNI account holder name'),
  ('bri_number',           '',   'BRI bank account number'),
  ('bri_name',             '',   'BRI account holder name'),
  ('mandiri_number',       '',   'Mandiri bank account number'),
  ('mandiri_name',         '',   'Mandiri account holder name')
ON CONFLICT (config_key) DO NOTHING;

-- Enable RLS on payment_config
ALTER TABLE payment_config ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can READ config (needed to show payment accounts to students)
CREATE POLICY "Authenticated can read payment_config" ON payment_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admin can write config
CREATE POLICY "Admin can manage payment_config" ON payment_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Step 6: Index for transaction_ref lookups
CREATE INDEX IF NOT EXISTS idx_payment_deposits_transaction_ref
  ON payment_deposits(transaction_ref);
