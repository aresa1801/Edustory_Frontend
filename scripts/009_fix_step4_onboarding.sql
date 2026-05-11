-- ============================================================
-- Migration 009: Fix step-4 onboarding deposit (idempotent)
-- Safe to re-run. Run AFTER 001–008 (or in place of 008 if
-- migration 008 has not been applied yet).
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Make payment_deposits.tutor_id nullable so onboarding deposits
--    (placed before a specific tutor is chosen) can be stored.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE payment_deposits
  ALTER COLUMN tutor_id DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add payment_type column to distinguish onboarding deposits from
--    per-session payments.  DROP CONSTRAINT first so the script is
--    idempotent (re-adding a CHECK with IF NOT EXISTS for the column is not
--    enough because the constraint name would conflict).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE payment_deposits
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'session';

-- Re-apply the CHECK constraint idempotently
ALTER TABLE payment_deposits
  DROP CONSTRAINT IF EXISTS payment_deposits_payment_type_check;

ALTER TABLE payment_deposits
  ADD CONSTRAINT payment_deposits_payment_type_check
    CHECK (payment_type IN ('onboarding_deposit', 'session'));

-- Index for payment_type lookups
CREATE INDEX IF NOT EXISTS idx_payment_deposits_type
  ON payment_deposits(payment_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add birth_date to students so the onboarding form can persist it.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS birth_date DATE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Add birth_date to user_profiles as well (some pages read it from there).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Ensure all columns needed by the onboarding saveProfile call exist.
--    These were introduced in migrations 004 and 007 but are repeated here
--    idempotently in case those migrations were not applied.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS sessions_per_month  INTEGER,
  ADD COLUMN IF NOT EXISTS school_name         TEXT,
  ADD COLUMN IF NOT EXISTS school_type         TEXT,
  ADD COLUMN IF NOT EXISTS school_city         TEXT,
  ADD COLUMN IF NOT EXISTS school_address      TEXT,
  ADD COLUMN IF NOT EXISTS parent_relation     TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Widen gender check to accept both Indonesian and English values
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_gender_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_gender_check
    CHECK (gender IN ('laki-laki', 'perempuan', 'male', 'female'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Ensure INSERT RLS policy exists on students (some installs were missing it)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'students'
      AND policyname = 'Students can insert their own profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students can insert their own profile" ON students
        FOR INSERT WITH CHECK (auth.uid() = user_id)
    $policy$;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Ensure payment_deposits INSERT RLS allows service-role inserts on behalf
--    of authenticated students (the API route uses the service role key, which
--    bypasses RLS anyway, but this keeps the policy correct for direct inserts).
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Students can create deposits" ON payment_deposits;
CREATE POLICY "Students can create deposits" ON payment_deposits
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- ============================================================
-- Done!  After running this migration:
--   - Step-4 onboarding deposits can be saved without a tutor_id.
--   - The birth_date entered in the form will be persisted.
--   - All onboarding columns are guaranteed to exist.
-- ============================================================
