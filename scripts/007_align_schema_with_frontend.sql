-- ============================================================
-- Migration 007: Align database schema with frontend code
-- Safe to re-run (idempotent). Run AFTER 001–006.
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. user_profiles: add `phone` column used throughout the frontend
--    (migration 001 used `phone_number`; frontend code consistently uses `phone`)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. user_profiles: widen gender constraint to also accept 'male'/'female'
--    The onboarding form now writes 'laki-laki'/'perempuan', but existing rows
--    may still contain 'male'/'female' from before this fix. Both are accepted
--    so as not to break backward compatibility with any stored data.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_gender_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_gender_check
    CHECK (gender IN ('laki-laki', 'perempuan', 'male', 'female'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. students: add all missing columns used by onboarding and profile pages
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS sessions_per_month  INTEGER,
  ADD COLUMN IF NOT EXISTS school_name         TEXT,
  ADD COLUMN IF NOT EXISTS school_type         TEXT,
  ADD COLUMN IF NOT EXISTS school_city         TEXT,
  ADD COLUMN IF NOT EXISTS school_address      TEXT,
  ADD COLUMN IF NOT EXISTS parent_relation     TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. tutors: add columns used by browse-tutors and tutor offer pages
--    (migration 001 used `subjects_taught` and `years_experience`;
--     the frontend consistently uses `specializations` and `experience_years`)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE tutors
  ADD COLUMN IF NOT EXISTS specializations  TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_years INTEGER,
  ADD COLUMN IF NOT EXISTS qualifications   TEXT;

-- Copy existing data from old columns into new columns (one-time migration)
UPDATE tutors
  SET specializations = subjects_taught
  WHERE subjects_taught IS NOT NULL
    AND (specializations IS NULL OR specializations = '{}');

UPDATE tutors
  SET experience_years = years_experience
  WHERE years_experience IS NOT NULL
    AND experience_years IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. matches: extend match_status enum to include 'matched'
--    (tutor confirm route sets status = 'matched')
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'matched';
EXCEPTION WHEN others THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. matches: add all missing columns used throughout the frontend
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS lesson_frequency    TEXT,
  ADD COLUMN IF NOT EXISTS start_date          DATE,
  ADD COLUMN IF NOT EXISTS initiated_by        TEXT DEFAULT 'student'
    CHECK (initiated_by IN ('student', 'tutor')),
  ADD COLUMN IF NOT EXISTS student_selected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tutor_confirmed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS student_rating      INTEGER
    CHECK (student_rating >= 1 AND student_rating <= 5),
  ADD COLUMN IF NOT EXISTS student_review      TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. matches: drop the UNIQUE(student_id, tutor_id) constraint
--    A student may legitimately have multiple matches with the same tutor
--    (e.g., different subjects, or re-matching after completion/cancellation).
--    Application-level logic should prevent duplicate *active* matches for the
--    same student+tutor+subject combination.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_student_id_tutor_id_key;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Indexes for new columns
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_onboarding_complete
  ON students(onboarding_complete);

CREATE INDEX IF NOT EXISTS idx_tutors_specializations
  ON tutors USING GIN (specializations);

CREATE INDEX IF NOT EXISTS idx_matches_initiated_by
  ON matches(initiated_by);

CREATE INDEX IF NOT EXISTS idx_matches_start_date
  ON matches(start_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. RLS: ensure students can update their own onboarding_complete flag
--    (already covered by the existing "Students can update their own profile"
--     policy on students table, so no extra policy needed)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. RLS: allow students to update matches they own
--     (needed for accepting/rejecting tutor offers from the student side)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Students can update their own matches" ON matches;
CREATE POLICY "Students can update their own matches" ON matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM students WHERE id = student_id AND user_id = auth.uid())
  );

-- ============================================================
-- Done! Run this migration in the Supabase SQL Editor.
-- After running, the following pages should work correctly:
--   - /dashboard/student/onboarding  (save to database)
--   - /dashboard/student             (fetch matches & tutor offers)
--   - /dashboard/student/find-tutors (browse approved tutors)
--   - /dashboard/student/my-tutors   (view matches)
--   - /dashboard/student/schedule    (view lesson schedule)
--   - /dashboard/student/tutor-offers (view & respond to tutor offers)
--   - /dashboard/student/analytics   (view stats & rate tutors)
--   - /dashboard/student/payment     (payment history)
-- ============================================================
