-- ============================================================
-- Migration 008: Make tutor_id optional in payment_deposits
-- Safe to re-run (idempotent). Run AFTER 001-007.
-- ============================================================
-- During student onboarding the deposit is placed before a
-- specific tutor is selected, so tutor_id must be nullable.
-- ============================================================

-- 1. Drop the NOT NULL constraint on tutor_id
ALTER TABLE payment_deposits
  ALTER COLUMN tutor_id DROP NOT NULL;

-- 2. Add a payment_type column to distinguish deposit types
ALTER TABLE payment_deposits
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'session'
    CHECK (payment_type IN ('onboarding_deposit', 'session'));

-- 3. Index for payment_type
CREATE INDEX IF NOT EXISTS idx_payment_deposits_type
  ON payment_deposits(payment_type);

-- ============================================================
-- Done! Onboarding deposits can now be stored without a
-- specific tutor_id. The payment_type='onboarding_deposit'
-- marks these initial deposits.
-- ============================================================
