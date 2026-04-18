-- Migration 004: Fix students table structure and add parent fields
-- Run this in the Supabase SQL Editor

-- 1. Ensure students.id has a default value (gen_random_uuid) so new rows
--    can be inserted without providing an explicit id.
--    If your id column already has a DEFAULT, this ALTER is a no-op.
ALTER TABLE students
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Add subjects column (TEXT[]) if the table still uses subjects_needed.
--    If it already has subjects, this is safely skipped.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}';

-- 3. Add status column used throughout the frontend
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended'));

-- 4. Add preferred_schedule if missing (also added in 003, kept idempotent)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS preferred_schedule TEXT;

-- 5. Add budget_per_month if missing (also added in 003, kept idempotent)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS budget_per_month DECIMAL(10, 2);

-- 6. Add city if missing (also added in 003, kept idempotent)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS city TEXT;

-- 7. New parent / guardian fields
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS parent_name TEXT;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS parent_email TEXT;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS parent_phone TEXT;

-- 8. RLS – INSERT policy so that a logged-in student can create their own row.
--    The original 001_create_tables.sql forgot this policy.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_policies
    WHERE  tablename = 'students'
    AND    policyname = 'Students can insert their own profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students can insert their own profile" ON students
        FOR INSERT WITH CHECK (auth.uid() = user_id)
    $policy$;
  END IF;
END;
$$;

-- 9. RLS – UPDATE policy by user_id in case it targets id instead of user_id.
--    Drop the old policy (targets id) and recreate targeting user_id.
DROP POLICY IF EXISTS "Students can update their own profile" ON students;
CREATE POLICY "Students can update their own profile" ON students
  FOR UPDATE USING (auth.uid() = user_id);

-- 10. (Optional) If you previously used subjects_needed and want to migrate data:
-- UPDATE students SET subjects = subjects_needed WHERE subjects_needed IS NOT NULL AND subjects = '{}';
-- ALTER TABLE students DROP COLUMN IF EXISTS subjects_needed;

-- Indexes for new columns (if not already present)
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
