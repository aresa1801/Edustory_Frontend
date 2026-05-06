-- ============================================================
-- Migration 006: Complete Payment Setup (Idempotent)
-- ============================================================
-- Safe to run in the Supabase SQL Editor on a fresh database
-- OR on top of any earlier migration (001-005).
-- Uses IF NOT EXISTS, DROP CONSTRAINT IF EXISTS, and DO $$ blocks
-- so every statement is a no-op if it has already been applied.
-- ============================================================

-- ------------------------------------------------------------
-- 1. PAYMENT_DEPOSITS table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_deposits (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID        NOT NULL REFERENCES students(id)  ON DELETE CASCADE,
  tutor_id          UUID        NOT NULL REFERENCES tutors(id)    ON DELETE CASCADE,
  match_id          UUID                 REFERENCES matches(id)   ON DELETE SET NULL,
  amount            DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method    TEXT        NOT NULL,
  payment_status    TEXT        NOT NULL DEFAULT 'pending',
  payment_proof_url TEXT,
  notes             TEXT,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  -- QRIS columns
  qris_static_string  TEXT,
  qris_dynamic_string TEXT,
  -- E-money / bank destination snapshot
  emoney_account    TEXT,
  emoney_name       TEXT,
  -- Transaction reference
  transaction_ref   TEXT
);

-- Drop old CHECK constraints so we can re-add the correct ones
-- (handles both the original narrow list and the 005 extended list)
ALTER TABLE payment_deposits
  DROP CONSTRAINT IF EXISTS payment_deposits_payment_method_check;

ALTER TABLE payment_deposits
  DROP CONSTRAINT IF EXISTS payment_deposits_payment_status_check;

-- Add updated CHECK constraints
ALTER TABLE payment_deposits
  ADD CONSTRAINT payment_deposits_payment_method_check
  CHECK (payment_method IN (
    'qris',
    'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja',
    'bca', 'bni', 'bri', 'mandiri', 'permata', 'cimb'
  ));

ALTER TABLE payment_deposits
  ADD CONSTRAINT payment_deposits_payment_status_check
  CHECK (payment_status IN (
    'pending', 'paid', 'rejected', 'expired', 'refunded'
  ));

-- Add optional columns idempotently (older DBs may not have them)
ALTER TABLE payment_deposits ADD COLUMN IF NOT EXISTS qris_static_string  TEXT;
ALTER TABLE payment_deposits ADD COLUMN IF NOT EXISTS qris_dynamic_string TEXT;
ALTER TABLE payment_deposits ADD COLUMN IF NOT EXISTS emoney_account       TEXT;
ALTER TABLE payment_deposits ADD COLUMN IF NOT EXISTS emoney_name          TEXT;
ALTER TABLE payment_deposits ADD COLUMN IF NOT EXISTS transaction_ref      TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_deposits_student_id
  ON payment_deposits(student_id);

CREATE INDEX IF NOT EXISTS idx_payment_deposits_tutor_id
  ON payment_deposits(tutor_id);

CREATE INDEX IF NOT EXISTS idx_payment_deposits_match_id
  ON payment_deposits(match_id);

CREATE INDEX IF NOT EXISTS idx_payment_deposits_status
  ON payment_deposits(payment_status);

CREATE INDEX IF NOT EXISTS idx_payment_deposits_method
  ON payment_deposits(payment_method);

CREATE INDEX IF NOT EXISTS idx_payment_deposits_transaction_ref
  ON payment_deposits(transaction_ref);

CREATE INDEX IF NOT EXISTS idx_payment_deposits_created_at
  ON payment_deposits(created_at DESC);

-- Enable RLS
ALTER TABLE payment_deposits ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies before recreating (avoids "already exists" errors)
DROP POLICY IF EXISTS "Students can view their own deposits"  ON payment_deposits;
DROP POLICY IF EXISTS "Students can create deposits"          ON payment_deposits;
DROP POLICY IF EXISTS "Admin can view all deposits"           ON payment_deposits;
DROP POLICY IF EXISTS "Admin can update deposits"             ON payment_deposits;

-- Recreate RLS policies
CREATE POLICY "Students can view their own deposits" ON payment_deposits
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Students can create deposits" ON payment_deposits
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin can view all deposits" ON payment_deposits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update deposits" ON payment_deposits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- 2. PAYMENT_CONFIG table
--    Stores QRIS static string, E-Money accounts, bank accounts,
--    and any future API credentials.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_config (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key    TEXT        UNIQUE NOT NULL,
  config_value  TEXT        NOT NULL DEFAULT '',
  description   TEXT,
  is_secret     BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Idempotently add columns that may not exist in older versions
ALTER TABLE payment_config ADD COLUMN IF NOT EXISTS is_secret  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE payment_config ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE payment_config ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated can read payment_config"   ON payment_config;
DROP POLICY IF EXISTS "Admin can manage payment_config"         ON payment_config;
DROP POLICY IF EXISTS "Admin can read payment_config"           ON payment_config;
DROP POLICY IF EXISTS "Admin can write payment_config"          ON payment_config;

-- Authenticated users can read non-secret config keys
-- (so the student payment page can show account numbers)
CREATE POLICY "Authenticated can read payment_config" ON payment_config
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      is_secret = FALSE
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Only admin can insert / update / delete config
CREATE POLICY "Admin can write payment_config" ON payment_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_payment_config_key ON payment_config(config_key);

-- ------------------------------------------------------------
-- 3. Seed default config rows
--    ON CONFLICT DO NOTHING = safe to re-run
-- ------------------------------------------------------------
INSERT INTO payment_config (config_key, config_value, description, is_secret)
VALUES
  -- QRIS
  ('qris_static_string',
   '',
   'String QRIS statis dari stiker / PDF merchant QRIS Anda. Paste tepat seperti yang tertera.',
   FALSE),

  -- E-Money / Dompet Digital
  ('gopay_number',   '', 'Nomor GoPay merchant (misal: 08xxxxxxxxxx)',  FALSE),
  ('gopay_name',     '', 'Nama pemilik akun GoPay',                     FALSE),
  ('ovo_number',     '', 'Nomor OVO merchant (misal: 08xxxxxxxxxx)',    FALSE),
  ('ovo_name',       '', 'Nama pemilik akun OVO',                       FALSE),
  ('dana_number',    '', 'Nomor DANA merchant (misal: 08xxxxxxxxxx)',   FALSE),
  ('dana_name',      '', 'Nama pemilik akun DANA',                      FALSE),
  ('shopeepay_number','','Nomor ShopeePay merchant',                    FALSE),
  ('shopeepay_name', '', 'Nama pemilik akun ShopeePay',                 FALSE),
  ('linkaja_number', '', 'Nomor LinkAja merchant',                      FALSE),
  ('linkaja_name',   '', 'Nama pemilik akun LinkAja',                   FALSE),

  -- Bank Transfer
  ('bca_number',     '', 'Nomor rekening BCA',   FALSE),
  ('bca_name',       '', 'Nama pemilik rekening BCA',   FALSE),
  ('bni_number',     '', 'Nomor rekening BNI',   FALSE),
  ('bni_name',       '', 'Nama pemilik rekening BNI',   FALSE),
  ('bri_number',     '', 'Nomor rekening BRI',   FALSE),
  ('bri_name',       '', 'Nama pemilik rekening BRI',   FALSE),
  ('mandiri_number', '', 'Nomor rekening Mandiri', FALSE),
  ('mandiri_name',   '', 'Nama pemilik rekening Mandiri', FALSE),
  ('permata_number', '', 'Nomor rekening Permata', FALSE),
  ('permata_name',   '', 'Nama pemilik rekening Permata', FALSE),
  ('cimb_number',    '', 'Nomor rekening CIMB Niaga', FALSE),
  ('cimb_name',      '', 'Nama pemilik rekening CIMB Niaga', FALSE)

ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- Done! All payment tables and config are ready.
-- Next steps:
--   1. Go to Dashboard Admin → Pengaturan Pembayaran
--   2. Isi string QRIS statis, nomor e-money, dan rekening bank
--   3. Klik Simpan untuk setiap bagian
-- ============================================================
