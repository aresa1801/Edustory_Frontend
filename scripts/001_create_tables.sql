-- ============================================================
-- Migration 001: Core Tables  (idempotent – safe to re-run)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enum types  (skip silently if they already exist)
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'tutor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('pending', 'accepted', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('submitted', 'reviewing', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- 2. SECURITY DEFINER helper – avoids infinite recursion in RLS
--    policies that need to check the current user's role.
--    SECURITY DEFINER runs as the function owner (postgres),
--    so it bypasses RLS on user_profiles safely.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- 3. user_profiles  (named to match the rest of the app)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT        UNIQUE NOT NULL,
  name                TEXT        NOT NULL,
  phone_number        TEXT,
  role                user_role   NOT NULL DEFAULT 'student',
  profile_picture_url TEXT,
  bio                 TEXT,
  gender              TEXT        CHECK (gender IN ('laki-laki', 'perempuan')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. students
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID         NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  grade_level        TEXT,
  subjects           TEXT[]       DEFAULT '{}',
  subjects_needed    TEXT[]       DEFAULT '{}',
  learning_goals     TEXT,
  preferred_schedule TEXT,
  budget_per_month   DECIMAL(10,2),
  address            TEXT,
  city               TEXT,
  status             TEXT         DEFAULT 'active'
                       CHECK (status IN ('active','inactive','suspended')),
  parent_name        TEXT,
  parent_email       TEXT,
  parent_phone       TEXT,
  verified           BOOLEAN      DEFAULT FALSE,
  created_at         TIMESTAMPTZ  DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. tutors
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutors (
  id                            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       UUID           NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  educational_background        TEXT,
  subjects_taught               TEXT[]         DEFAULT '{}',
  years_experience              INTEGER,
  certification_url             TEXT,
  hourly_rate                   DECIMAL(10,2),
  availability                  TEXT,
  teaching_method               TEXT,
  bio_extended                  TEXT,
  verified                      BOOLEAN        DEFAULT FALSE,
  approval_status               application_status DEFAULT 'submitted',
  approval_notes                TEXT,
  approved_by                   UUID           REFERENCES user_profiles(id) ON DELETE SET NULL,
  approved_at                   TIMESTAMPTZ,
  profile_completion_percentage INTEGER        DEFAULT 0,
  rating                        DECIMAL(3,2)   DEFAULT 0,
  total_reviews                 INTEGER        DEFAULT 0,
  active_matches                INTEGER        DEFAULT 0,
  created_at                    TIMESTAMPTZ    DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ    DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. matches
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tutor_id           UUID         NOT NULL REFERENCES tutors(id)   ON DELETE CASCADE,
  subject            TEXT,
  status             match_status DEFAULT 'pending',
  student_applied_at TIMESTAMPTZ  DEFAULT NOW(),
  tutor_accepted_at  TIMESTAMPTZ,
  lessons_completed  INTEGER      DEFAULT 0,
  total_hours        DECIMAL(10,2) DEFAULT 0,
  notes              TEXT,
  created_at         TIMESTAMPTZ  DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(student_id, tutor_id)
);

-- ------------------------------------------------------------
-- 7. tutor_applications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutor_applications (
  id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id        UUID             NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  status          application_status DEFAULT 'submitted',
  submission_data JSONB,
  reviewed_by     UUID             REFERENCES user_profiles(id) ON DELETE SET NULL,
  review_notes    TEXT,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ      DEFAULT NOW(),
  updated_at      TIMESTAMPTZ      DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 8. reviews
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID    NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reviewer_id UUID    NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating      INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 9. Enable Row Level Security
-- ------------------------------------------------------------
ALTER TABLE user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE students           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews            ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 10. RLS Policies
--     Always DROP IF EXISTS first so the script is safe to
--     re-run without "policy already exists" errors.
-- ------------------------------------------------------------

-- user_profiles -----------------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile"    ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"  ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile"  ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"        ON user_profiles;
DROP POLICY IF EXISTS "Anyone can view tutor profiles"      ON user_profiles;
DROP POLICY IF EXISTS "Tutor profiles are publicly viewable" ON user_profiles;

-- Own row (no subquery → no recursion)
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Tutor profiles visible to everyone (needed for tutor browsing)
CREATE POLICY "Tutor profiles are publicly viewable" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tutors
      WHERE tutors.user_id = user_profiles.id
        AND tutors.approval_status = 'approved'
    )
  );

-- Admin sees all – uses SECURITY DEFINER helper, not a recursive subquery
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- students ----------------------------------------------------
DROP POLICY IF EXISTS "Students can view their own profile"            ON students;
DROP POLICY IF EXISTS "Students can insert their own profile"          ON students;
DROP POLICY IF EXISTS "Students can update their own profile"          ON students;
DROP POLICY IF EXISTS "Tutors can view student profiles they matched with" ON students;
DROP POLICY IF EXISTS "Admins can view all students"                   ON students;

CREATE POLICY "Students can view their own profile" ON students
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can insert their own profile" ON students
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own profile" ON students
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Tutors can view student profiles they matched with" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tutors t ON t.id = m.tutor_id
      WHERE m.student_id = students.id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all students" ON students
  FOR SELECT USING (public.is_admin());

-- tutors ------------------------------------------------------
DROP POLICY IF EXISTS "Tutors can view their own profile"   ON tutors;
DROP POLICY IF EXISTS "Tutors can insert their own profile" ON tutors;
DROP POLICY IF EXISTS "Tutors can update their own profile" ON tutors;
DROP POLICY IF EXISTS "Students can view approved tutors"   ON tutors;
DROP POLICY IF EXISTS "Admin can view all tutors"           ON tutors;
DROP POLICY IF EXISTS "Admins can view all tutors"          ON tutors;

CREATE POLICY "Tutors can view their own profile" ON tutors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Tutors can insert their own profile" ON tutors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tutors can update their own profile" ON tutors
  FOR UPDATE USING (auth.uid() = user_id);

-- Fixed: was 'verification_status' (column does not exist) → approval_status
CREATE POLICY "Students can view approved tutors" ON tutors
  FOR SELECT USING (approval_status = 'approved');

CREATE POLICY "Admins can view all tutors" ON tutors
  FOR SELECT USING (public.is_admin());

-- matches -----------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own matches" ON matches;
DROP POLICY IF EXISTS "Students can create matches"      ON matches;
DROP POLICY IF EXISTS "Tutors can update matches"        ON matches;
DROP POLICY IF EXISTS "Admins can view all matches"      ON matches;

CREATE POLICY "Users can view their own matches" ON matches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students WHERE id = student_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM tutors   WHERE id = tutor_id  AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Students can create matches" ON matches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM students WHERE id = student_id AND user_id = auth.uid())
  );

CREATE POLICY "Tutors can update matches" ON matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM tutors WHERE id = tutor_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can view all matches" ON matches
  FOR SELECT USING (public.is_admin());

-- tutor_applications ------------------------------------------
DROP POLICY IF EXISTS "Tutors can view their own applications"  ON tutor_applications;
DROP POLICY IF EXISTS "Tutors can create applications"          ON tutor_applications;
DROP POLICY IF EXISTS "Admin can view all applications"         ON tutor_applications;
DROP POLICY IF EXISTS "Admins can view all applications"        ON tutor_applications;
DROP POLICY IF EXISTS "Admin can update applications"           ON tutor_applications;
DROP POLICY IF EXISTS "Admins can update applications"          ON tutor_applications;

CREATE POLICY "Tutors can view their own applications" ON tutor_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tutors WHERE id = tutor_id AND user_id = auth.uid())
  );

CREATE POLICY "Tutors can create applications" ON tutor_applications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tutors WHERE id = tutor_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can view all applications" ON tutor_applications
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update applications" ON tutor_applications
  FOR UPDATE USING (public.is_admin());

-- reviews -----------------------------------------------------
DROP POLICY IF EXISTS "Users can view reviews"  ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;

CREATE POLICY "Users can view reviews" ON reviews
  FOR SELECT USING (
    reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id AND (
        EXISTS (SELECT 1 FROM students WHERE id = m.student_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM tutors   WHERE id = m.tutor_id  AND user_id = auth.uid())
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- ------------------------------------------------------------
-- 11. Indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_profiles_role             ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_students_user_id               ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_status                ON students(status);
CREATE INDEX IF NOT EXISTS idx_tutors_user_id                 ON tutors(user_id);
CREATE INDEX IF NOT EXISTS idx_tutors_approval_status         ON tutors(approval_status);
CREATE INDEX IF NOT EXISTS idx_matches_student_id             ON matches(student_id);
CREATE INDEX IF NOT EXISTS idx_matches_tutor_id               ON matches(tutor_id);
CREATE INDEX IF NOT EXISTS idx_matches_status                 ON matches(status);
CREATE INDEX IF NOT EXISTS idx_tutor_applications_tutor_id    ON tutor_applications(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_applications_status      ON tutor_applications(status);
CREATE INDEX IF NOT EXISTS idx_reviews_match_id               ON reviews(match_id);

-- ------------------------------------------------------------
-- 12. updated_at auto-update trigger
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_tutors_updated_at ON tutors;
CREATE TRIGGER trg_tutors_updated_at
  BEFORE UPDATE ON tutors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_matches_updated_at ON matches;
CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
