-- ============================================================
-- EDUSTORY DATABASE REDESIGN – SKRIP LENGKAP & IDEMPOTEN
-- Versi: 007
-- Jalankan seluruh skrip ini di Supabase SQL Editor.
-- Aman dijalankan ulang (idempoten).
--
-- Yang dilakukan skrip ini:
--   1. Menghapus semua tabel selain user_profiles (CASCADE).
--   2. Memodifikasi user_profiles agar kolom-kolomnya sesuai
--      dengan yang dipakai frontend (phone, avatar_url, dll.).
--   3. Membuat ulang semua tabel dengan nama kolom yang tepat.
--   4. Menambahkan RLS, indexes, dan triggers.
--   5. Mengisi seed data payment_config.
-- ============================================================

-- ============================================================
-- BAGIAN 1 – HAPUS TABEL (urutan dari paling bergantung)
-- ============================================================

DROP TABLE IF EXISTS payment_deposits          CASCADE;
DROP TABLE IF EXISTS payment_config            CASCADE;
DROP TABLE IF EXISTS curation_results          CASCADE;
DROP TABLE IF EXISTS ai_interview_assessments  CASCADE;
DROP TABLE IF EXISTS handwriting_assessments   CASCADE;
DROP TABLE IF EXISTS microteaching_assessments CASCADE;
DROP TABLE IF EXISTS academic_assessments      CASCADE;
DROP TABLE IF EXISTS psychology_assessments    CASCADE;
DROP TABLE IF EXISTS curation_progress         CASCADE;
DROP TABLE IF EXISTS reviews                   CASCADE;
DROP TABLE IF EXISTS sessions                  CASCADE;
DROP TABLE IF EXISTS programs                  CASCADE;
DROP TABLE IF EXISTS matches                   CASCADE;
DROP TABLE IF EXISTS tutor_applications        CASCADE;
DROP TABLE IF EXISTS tutors                    CASCADE;
DROP TABLE IF EXISTS students                  CASCADE;

-- ============================================================
-- BAGIAN 2 – HAPUS ENUM LAMA (tidak dipakai lagi)
-- ============================================================

DROP TYPE IF EXISTS match_status       CASCADE;
DROP TYPE IF EXISTS application_status CASCADE;

-- ============================================================
-- BAGIAN 3 – MODIFIKASI user_profiles
-- Tabel ini dipertahankan agar auth.users tidak terganggu.
-- ============================================================

-- 3a. Jika kolom role masih enum, konversi ke TEXT dulu
ALTER TABLE user_profiles
  ALTER COLUMN role TYPE TEXT USING role::TEXT;

-- 3b. Sekarang aman untuk drop enum user_role
DROP TYPE IF EXISTS user_role;

-- 3c. Kolom name boleh NULL (OAuth signup tidak selalu kirim nama)
ALTER TABLE user_profiles ALTER COLUMN name DROP NOT NULL;

-- 3d. Tambah kolom yang dibutuhkan frontend (jika belum ada)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone      TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender     TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3e. Migrasi data dari kolom lama (phone_number → phone)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_profiles'
      AND column_name  = 'phone_number'
  ) THEN
    UPDATE public.user_profiles
    SET phone = phone_number
    WHERE phone IS NULL AND phone_number IS NOT NULL;
    ALTER TABLE public.user_profiles DROP COLUMN phone_number;
  END IF;
END;
$$;

-- 3f. Migrasi data dari kolom lama (profile_picture_url → avatar_url)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_profiles'
      AND column_name  = 'profile_picture_url'
  ) THEN
    UPDATE public.user_profiles
    SET avatar_url = profile_picture_url
    WHERE avatar_url IS NULL AND profile_picture_url IS NOT NULL;
    ALTER TABLE public.user_profiles DROP COLUMN profile_picture_url;
  END IF;
END;
$$;

-- 3g. Hapus kolom lama yang tidak dipakai (bio_extended, dll.)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS bio_extended;

-- 3h. Perbarui CHECK constraint role (siswa | tutor | admin)
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('siswa', 'tutor', 'admin'));

-- 3i. Perbarui CHECK constraint gender
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_gender_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_gender_check
  CHECK (gender IN ('laki-laki', 'perempuan'));

-- ============================================================
-- BAGIAN 4 – FUNGSI HELPER (buat ulang supaya selalu terkini)
-- ============================================================

-- is_admin(): cek apakah user yang sedang login adalah admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- handle_updated_at(): trigger untuk kolom updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- BAGIAN 5 – BUAT TABEL BARU
-- ============================================================

-- ----------------------------------------------------------
-- 5.1  students
-- ----------------------------------------------------------
CREATE TABLE students (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL UNIQUE
                        REFERENCES user_profiles(id) ON DELETE CASCADE,
  grade_level         TEXT,
  subjects            TEXT[]        DEFAULT '{}',
  learning_goals      TEXT,
  preferred_schedule  TEXT,
  budget_per_month    DECIMAL(12,2),
  sessions_per_month  INTEGER,
  address             TEXT,
  city                TEXT,
  status              TEXT          DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'suspended')),
  parent_name         TEXT,
  parent_email        TEXT,
  parent_phone        TEXT,
  parent_relation     TEXT,
  school_name         TEXT,
  school_type         TEXT,
  school_city         TEXT,
  school_address      TEXT,
  onboarding_complete BOOLEAN       DEFAULT FALSE,
  created_at          TIMESTAMPTZ   DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 5.2  tutors
-- ----------------------------------------------------------
CREATE TABLE tutors (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID          NOT NULL UNIQUE
                          REFERENCES user_profiles(id) ON DELETE CASCADE,
  specializations       TEXT[]        DEFAULT '{}',
  qualifications        TEXT,
  experience_years      INTEGER       DEFAULT 0,
  hourly_rate           DECIMAL(12,2),
  rating                DECIMAL(3,2)  DEFAULT 0.00,
  total_reviews         INTEGER       DEFAULT 0,
  verified              BOOLEAN       DEFAULT FALSE,
  approval_status       TEXT          DEFAULT 'pending'
                          CHECK (approval_status IN (
                            'pending', 'reviewing', 'approved', 'rejected'
                          )),
  target_grade_level    TEXT,
  verified_grade_levels TEXT[]        DEFAULT '{}',
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 5.3  tutor_applications
-- ----------------------------------------------------------
CREATE TABLE tutor_applications (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id             UUID          NOT NULL
                         REFERENCES tutors(id) ON DELETE CASCADE,
  education_background TEXT,
  why_teach            TEXT,
  tutor_references     TEXT,
  status               TEXT          DEFAULT 'pending'
                         CHECK (status IN (
                           'pending', 'reviewing', 'approved', 'rejected'
                         )),
  reviewed_by          UUID          REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at          TIMESTAMPTZ,
  rejection_reason     TEXT,
  created_at           TIMESTAMPTZ   DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 5.4  matches
-- ----------------------------------------------------------
CREATE TABLE matches (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID          NOT NULL
                        REFERENCES students(id) ON DELETE CASCADE,
  tutor_id            UUID          NOT NULL
                        REFERENCES tutors(id)   ON DELETE CASCADE,
  subject             TEXT,
  status              TEXT          DEFAULT 'pending'
                        CHECK (status IN (
                          'pending', 'matched', 'active', 'completed', 'cancelled'
                        )),
  student_selected_at TIMESTAMPTZ   DEFAULT NOW(),
  tutor_confirmed_at  TIMESTAMPTZ,
  lesson_frequency    TEXT,
  start_date          DATE,
  initiated_by        TEXT          DEFAULT 'student'
                        CHECK (initiated_by IN ('student', 'tutor')),
  created_at          TIMESTAMPTZ   DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 5.5  reviews
-- ----------------------------------------------------------
CREATE TABLE reviews (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID    NOT NULL REFERENCES matches(id)       ON DELETE CASCADE,
  reviewer_id UUID    NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 5.6  sessions
-- ----------------------------------------------------------
CREATE TABLE sessions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id         UUID          NOT NULL REFERENCES tutors(id)   ON DELETE CASCADE,
  student_id       UUID          NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  match_id         UUID          REFERENCES matches(id)           ON DELETE SET NULL,
  scheduled_at     TIMESTAMPTZ   NOT NULL,
  duration_minutes INTEGER       DEFAULT 60,
  status           TEXT          DEFAULT 'scheduled'
                     CHECK (status IN (
                       'scheduled', 'completed', 'cancelled', 'no_show'
                     )),
  notes            TEXT,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 5.7  programs
-- ----------------------------------------------------------
CREATE TABLE programs (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT          NOT NULL,
  description     TEXT,
  price           DECIMAL(12,2),
  duration_months INTEGER,
  features        TEXT[]        DEFAULT '{}',
  status          TEXT          DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'draft')),
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 5.8  curation_progress
-- ----------------------------------------------------------
CREATE TABLE curation_progress (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id        UUID          NOT NULL UNIQUE
                    REFERENCES tutors(id) ON DELETE CASCADE,
  current_step    TEXT          DEFAULT 'psychology'
                    CHECK (current_step IN (
                      'psychology', 'academic', 'microteaching',
                      'handwriting', 'interview', 'completed'
                    )),
  completed_steps TEXT[]        DEFAULT '{}',
  status          TEXT          DEFAULT 'in_progress'
                    CHECK (status IN (
                      'in_progress', 'completed', 'expired', 'rejected'
                    )),
  overall_score   DECIMAL(5,2),
  started_at      TIMESTAMPTZ   DEFAULT NOW(),
  expires_at      TIMESTAMPTZ   DEFAULT NOW() + INTERVAL '7 days',
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 5.9  psychology_assessments  (bobot 20%)
-- ----------------------------------------------------------
CREATE TABLE psychology_assessments (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id             UUID          NOT NULL
                         REFERENCES tutors(id)            ON DELETE CASCADE,
  curation_progress_id UUID          NOT NULL
                         REFERENCES curation_progress(id) ON DELETE CASCADE,
  answers              JSONB         DEFAULT '{}',
  questions_answered   INTEGER       DEFAULT 0,
  total_questions      INTEGER       DEFAULT 30,
  score                DECIMAL(5,2),
  passed               BOOLEAN       DEFAULT FALSE,
  submitted_at         TIMESTAMPTZ,
  started_at           TIMESTAMPTZ   DEFAULT NOW(),
  time_spent_seconds   INTEGER,
  created_at           TIMESTAMPTZ   DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (tutor_id, curation_progress_id)
);

-- ----------------------------------------------------------
-- 5.10  academic_assessments  (bobot 30%)
-- ----------------------------------------------------------
CREATE TABLE academic_assessments (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id             UUID          NOT NULL
                         REFERENCES tutors(id)            ON DELETE CASCADE,
  curation_progress_id UUID          NOT NULL
                         REFERENCES curation_progress(id) ON DELETE CASCADE,
  answers              JSONB         DEFAULT '{}',
  questions_answered   INTEGER       DEFAULT 0,
  total_questions      INTEGER       DEFAULT 20,
  score                DECIMAL(5,2),
  passed               BOOLEAN       DEFAULT FALSE,
  level_targeted       TEXT,
  submitted_at         TIMESTAMPTZ,
  started_at           TIMESTAMPTZ   DEFAULT NOW(),
  time_spent_seconds   INTEGER,
  created_at           TIMESTAMPTZ   DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (tutor_id, curation_progress_id)
);

-- ----------------------------------------------------------
-- 5.11  microteaching_assessments  (bobot 25%)
-- ----------------------------------------------------------
CREATE TABLE microteaching_assessments (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id             UUID          NOT NULL
                         REFERENCES tutors(id)            ON DELETE CASCADE,
  curation_progress_id UUID          NOT NULL
                         REFERENCES curation_progress(id) ON DELETE CASCADE,
  topic_selected       TEXT,
  video_url            TEXT,
  explanation          TEXT,
  overall_score        DECIMAL(5,2),
  passed               BOOLEAN       DEFAULT FALSE,
  admin_notes          TEXT,
  reviewed_by          UUID          REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at          TIMESTAMPTZ,
  submitted_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ   DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (tutor_id, curation_progress_id)
);

-- ----------------------------------------------------------
-- 5.12  handwriting_assessments  (bobot 15%)
-- ----------------------------------------------------------
CREATE TABLE handwriting_assessments (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id              UUID          NOT NULL
                          REFERENCES tutors(id)            ON DELETE CASCADE,
  curation_progress_id  UUID          NOT NULL
                          REFERENCES curation_progress(id) ON DELETE CASCADE,
  problem_1_image_url   TEXT,
  problem_1_explanation TEXT,
  problem_2_image_url   TEXT,
  problem_2_explanation TEXT,
  overall_score         DECIMAL(5,2),
  passed                BOOLEAN       DEFAULT FALSE,
  admin_notes           TEXT,
  reviewed_by           UUID          REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  submitted_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (tutor_id, curation_progress_id)
);

-- ----------------------------------------------------------
-- 5.13  ai_interview_assessments  (bobot 10%)
-- ----------------------------------------------------------
CREATE TABLE ai_interview_assessments (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id             UUID          NOT NULL
                         REFERENCES tutors(id)            ON DELETE CASCADE,
  curation_progress_id UUID          NOT NULL
                         REFERENCES curation_progress(id) ON DELETE CASCADE,
  responses            JSONB         DEFAULT '{}',
  questions_answered   INTEGER       DEFAULT 0,
  total_questions      INTEGER       DEFAULT 10,
  overall_score        DECIMAL(5,2),
  passed               BOOLEAN       DEFAULT FALSE,
  submitted_at         TIMESTAMPTZ,
  started_at           TIMESTAMPTZ   DEFAULT NOW(),
  time_spent_seconds   INTEGER,
  created_at           TIMESTAMPTZ   DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (tutor_id, curation_progress_id)
);

-- ----------------------------------------------------------
-- 5.14  curation_results
-- ----------------------------------------------------------
CREATE TABLE curation_results (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id             UUID          NOT NULL
                         REFERENCES tutors(id)            ON DELETE CASCADE,
  curation_progress_id UUID          NOT NULL
                         REFERENCES curation_progress(id) ON DELETE CASCADE,
  psychology_score     DECIMAL(5,2),
  academic_score       DECIMAL(5,2),
  microteaching_score  DECIMAL(5,2),
  handwriting_score    DECIMAL(5,2),
  interview_score      DECIMAL(5,2),
  weighted_score       DECIMAL(5,2),
  status               TEXT          DEFAULT 'pending_review'
                         CHECK (status IN ('pending_review', 'approved', 'rejected')),
  reviewed_by          UUID          REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at          TIMESTAMPTZ,
  admin_notes          TEXT,
  rejection_reason     TEXT,
  completed_at         TIMESTAMPTZ   DEFAULT NOW(),
  created_at           TIMESTAMPTZ   DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (tutor_id, curation_progress_id)
);

-- ----------------------------------------------------------
-- 5.15  payment_deposits
-- ----------------------------------------------------------
CREATE TABLE payment_deposits (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID          NOT NULL
                        REFERENCES students(id) ON DELETE CASCADE,
  tutor_id            UUID          NOT NULL
                        REFERENCES tutors(id)   ON DELETE CASCADE,
  match_id            UUID
                        REFERENCES matches(id)  ON DELETE SET NULL,
  amount              DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method      TEXT          NOT NULL
                        CHECK (payment_method IN (
                          'qris',
                          'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja',
                          'bca', 'bni', 'bri', 'mandiri', 'permata', 'cimb'
                        )),
  payment_status      TEXT          NOT NULL DEFAULT 'pending'
                        CHECK (payment_status IN (
                          'pending', 'paid', 'rejected', 'expired', 'refunded'
                        )),
  payment_proof_url   TEXT,
  notes               TEXT,
  paid_at             TIMESTAMPTZ,
  qris_static_string  TEXT,
  qris_dynamic_string TEXT,
  emoney_account      TEXT,
  emoney_name         TEXT,
  transaction_ref     TEXT,
  created_at          TIMESTAMPTZ   DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 5.16  payment_config
-- ----------------------------------------------------------
CREATE TABLE payment_config (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key   TEXT          UNIQUE NOT NULL,
  config_value TEXT          NOT NULL DEFAULT '',
  description  TEXT,
  is_secret    BOOLEAN       NOT NULL DEFAULT FALSE,
  updated_at   TIMESTAMPTZ   DEFAULT NOW(),
  updated_by   UUID          REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================
-- BAGIAN 6 – ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE students               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_applications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches                ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE curation_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychology_assessments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_assessments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE microteaching_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE handwriting_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interview_assessments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE curation_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_deposits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_config         ENABLE ROW LEVEL SECURITY;

-- ── user_profiles ──────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own profile"      ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"    ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile"    ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"          ON user_profiles;
DROP POLICY IF EXISTS "Tutor profiles are publicly viewable"  ON user_profiles;
DROP POLICY IF EXISTS "Anyone can view tutor profiles"        ON user_profiles;

CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Tutor profiles are publicly viewable" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tutors
      WHERE tutors.user_id = user_profiles.id
        AND tutors.approval_status = 'approved'
    )
  );

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── students ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Students can view their own profile"           ON students;
DROP POLICY IF EXISTS "Students can insert their own profile"         ON students;
DROP POLICY IF EXISTS "Students can update their own profile"         ON students;
DROP POLICY IF EXISTS "Tutors can view student profiles they matched" ON students;
DROP POLICY IF EXISTS "Tutors can view student profiles they matched with" ON students;
DROP POLICY IF EXISTS "Admins can view all students"                  ON students;

CREATE POLICY "Students can view their own profile" ON students
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can insert their own profile" ON students
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own profile" ON students
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Tutors can view matched student profiles" ON students
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

-- ── tutors ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Tutors can view their own profile"   ON tutors;
DROP POLICY IF EXISTS "Tutors can insert their own profile" ON tutors;
DROP POLICY IF EXISTS "Tutors can update their own profile" ON tutors;
DROP POLICY IF EXISTS "Students can view approved tutors"   ON tutors;
DROP POLICY IF EXISTS "Admins can view all tutors"          ON tutors;
DROP POLICY IF EXISTS "Admin can view all tutors"           ON tutors;

CREATE POLICY "Tutors can view their own profile" ON tutors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Tutors can insert their own profile" ON tutors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tutors can update their own profile" ON tutors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Students can view approved tutors" ON tutors
  FOR SELECT USING (approval_status = 'approved');

CREATE POLICY "Admins can view all tutors" ON tutors
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update tutors" ON tutors
  FOR UPDATE USING (public.is_admin());

-- ── tutor_applications ─────────────────────────────────────
DROP POLICY IF EXISTS "Tutors can view their own applications"  ON tutor_applications;
DROP POLICY IF EXISTS "Tutors can create applications"          ON tutor_applications;
DROP POLICY IF EXISTS "Admins can view all applications"        ON tutor_applications;
DROP POLICY IF EXISTS "Admin can view all applications"         ON tutor_applications;
DROP POLICY IF EXISTS "Admins can update applications"          ON tutor_applications;
DROP POLICY IF EXISTS "Admin can update applications"           ON tutor_applications;

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

-- ── matches ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own matches" ON matches;
DROP POLICY IF EXISTS "Students can create matches"      ON matches;
DROP POLICY IF EXISTS "Tutors can update matches"        ON matches;
DROP POLICY IF EXISTS "Admins can view all matches"      ON matches;
DROP POLICY IF EXISTS "Students can update matches"      ON matches;

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

CREATE POLICY "Students can update matches" ON matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM students WHERE id = student_id AND user_id = auth.uid())
  );

CREATE POLICY "Tutors can update matches" ON matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM tutors WHERE id = tutor_id AND user_id = auth.uid())
    OR public.is_admin()
  );

-- ── reviews ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view reviews"  ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;

CREATE POLICY "Users can view reviews" ON reviews
  FOR SELECT USING (
    reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
        AND (
          EXISTS (SELECT 1 FROM students WHERE id = m.student_id AND user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM tutors   WHERE id = m.tutor_id  AND user_id = auth.uid())
        )
    )
    OR public.is_admin()
  );

CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- ── sessions ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Tutors can create sessions"        ON sessions;
DROP POLICY IF EXISTS "Tutors can update sessions"        ON sessions;
DROP POLICY IF EXISTS "Admins can manage sessions"        ON sessions;

CREATE POLICY "Users can view their own sessions" ON sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tutors   WHERE id = tutor_id   AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM students WHERE id = student_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Tutors can create sessions" ON sessions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tutors WHERE id = tutor_id AND user_id = auth.uid())
  );

CREATE POLICY "Tutors can update sessions" ON sessions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM tutors WHERE id = tutor_id AND user_id = auth.uid())
    OR public.is_admin()
  );

-- ── programs ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view active programs" ON programs;
DROP POLICY IF EXISTS "Admins can manage programs"      ON programs;

CREATE POLICY "Anyone can view active programs" ON programs
  FOR SELECT USING (status = 'active' OR public.is_admin());

CREATE POLICY "Admins can manage programs" ON programs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── curation_progress ──────────────────────────────────────
DROP POLICY IF EXISTS "Tutors can view their own curation progress"   ON curation_progress;
DROP POLICY IF EXISTS "Tutors can insert their own curation progress" ON curation_progress;
DROP POLICY IF EXISTS "Tutors can update their own curation progress" ON curation_progress;
DROP POLICY IF EXISTS "Admins can view all curation progress"         ON curation_progress;

CREATE POLICY "Tutors can view their own curation progress" ON curation_progress
  FOR SELECT USING (
    tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
  );

CREATE POLICY "Tutors can insert their own curation progress" ON curation_progress
  FOR INSERT WITH CHECK (
    tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
  );

CREATE POLICY "Tutors can update their own curation progress" ON curation_progress
  FOR UPDATE USING (
    tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all curation progress" ON curation_progress
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all curation progress" ON curation_progress
  FOR UPDATE USING (public.is_admin());

-- ── psychology_assessments ─────────────────────────────────
DROP POLICY IF EXISTS "Tutors can view their psychology assessments"   ON psychology_assessments;
DROP POLICY IF EXISTS "Tutors can insert their psychology assessments" ON psychology_assessments;
DROP POLICY IF EXISTS "Admins can view all psychology assessments"     ON psychology_assessments;

CREATE POLICY "Tutors can view their psychology assessments" ON psychology_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Tutors can insert their psychology assessments" ON psychology_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all psychology assessments" ON psychology_assessments
  FOR SELECT USING (public.is_admin());

-- ── academic_assessments ───────────────────────────────────
DROP POLICY IF EXISTS "Tutors can view their academic assessments"   ON academic_assessments;
DROP POLICY IF EXISTS "Tutors can insert their academic assessments" ON academic_assessments;
DROP POLICY IF EXISTS "Admins can view all academic assessments"     ON academic_assessments;

CREATE POLICY "Tutors can view their academic assessments" ON academic_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Tutors can insert their academic assessments" ON academic_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all academic assessments" ON academic_assessments
  FOR SELECT USING (public.is_admin());

-- ── microteaching_assessments ──────────────────────────────
DROP POLICY IF EXISTS "Tutors can view their microteaching assessments"   ON microteaching_assessments;
DROP POLICY IF EXISTS "Tutors can insert their microteaching assessments" ON microteaching_assessments;
DROP POLICY IF EXISTS "Admins can view all microteaching assessments"     ON microteaching_assessments;
DROP POLICY IF EXISTS "Admins can update microteaching assessments"       ON microteaching_assessments;

CREATE POLICY "Tutors can view their microteaching assessments" ON microteaching_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Tutors can insert their microteaching assessments" ON microteaching_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all microteaching assessments" ON microteaching_assessments
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update microteaching assessments" ON microteaching_assessments
  FOR UPDATE USING (public.is_admin());

-- ── handwriting_assessments ────────────────────────────────
DROP POLICY IF EXISTS "Tutors can view their handwriting assessments"   ON handwriting_assessments;
DROP POLICY IF EXISTS "Tutors can insert their handwriting assessments" ON handwriting_assessments;
DROP POLICY IF EXISTS "Admins can view all handwriting assessments"     ON handwriting_assessments;
DROP POLICY IF EXISTS "Admins can update handwriting assessments"       ON handwriting_assessments;

CREATE POLICY "Tutors can view their handwriting assessments" ON handwriting_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Tutors can insert their handwriting assessments" ON handwriting_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all handwriting assessments" ON handwriting_assessments
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update handwriting assessments" ON handwriting_assessments
  FOR UPDATE USING (public.is_admin());

-- ── ai_interview_assessments ───────────────────────────────
DROP POLICY IF EXISTS "Tutors can view their interview assessments"   ON ai_interview_assessments;
DROP POLICY IF EXISTS "Tutors can insert their interview assessments" ON ai_interview_assessments;
DROP POLICY IF EXISTS "Admins can view all interview assessments"     ON ai_interview_assessments;

CREATE POLICY "Tutors can view their interview assessments" ON ai_interview_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Tutors can insert their interview assessments" ON ai_interview_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all interview assessments" ON ai_interview_assessments
  FOR SELECT USING (public.is_admin());

-- ── curation_results ───────────────────────────────────────
DROP POLICY IF EXISTS "Tutors can view their curation results" ON curation_results;
DROP POLICY IF EXISTS "Admins can view all curation results"   ON curation_results;
DROP POLICY IF EXISTS "Admins can update curation results"     ON curation_results;
DROP POLICY IF EXISTS "Admins can insert curation results"     ON curation_results;

CREATE POLICY "Tutors can view their curation results" ON curation_results
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all curation results" ON curation_results
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage curation results" ON curation_results
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── payment_deposits ───────────────────────────────────────
DROP POLICY IF EXISTS "Students can view their own deposits" ON payment_deposits;
DROP POLICY IF EXISTS "Students can create deposits"         ON payment_deposits;
DROP POLICY IF EXISTS "Admin can view all deposits"          ON payment_deposits;
DROP POLICY IF EXISTS "Admin can update deposits"            ON payment_deposits;
DROP POLICY IF EXISTS "Tutors can view their deposits"       ON payment_deposits;

CREATE POLICY "Students can view their own deposits" ON payment_deposits
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Students can create deposits" ON payment_deposits
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Tutors can view their deposits" ON payment_deposits
  FOR SELECT USING (
    tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all deposits" ON payment_deposits
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update deposits" ON payment_deposits
  FOR UPDATE USING (public.is_admin());

-- ── payment_config ─────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated can read payment_config" ON payment_config;
DROP POLICY IF EXISTS "Admin can manage payment_config"       ON payment_config;
DROP POLICY IF EXISTS "Admin can read payment_config"         ON payment_config;
DROP POLICY IF EXISTS "Admin can write payment_config"        ON payment_config;

-- User terautentikasi bisa baca config yang tidak rahasia
CREATE POLICY "Authenticated can read payment_config" ON payment_config
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      is_secret = FALSE
      OR public.is_admin()
    )
  );

-- Hanya admin yang bisa insert / update / delete
CREATE POLICY "Admins can write payment_config" ON payment_config
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- BAGIAN 7 – INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_role                    ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_students_user_id                      ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_status                       ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_onboarding                   ON students(onboarding_complete);
CREATE INDEX IF NOT EXISTS idx_tutors_user_id                        ON tutors(user_id);
CREATE INDEX IF NOT EXISTS idx_tutors_approval_status                ON tutors(approval_status);
CREATE INDEX IF NOT EXISTS idx_tutors_specializations                ON tutors USING GIN (specializations);
CREATE INDEX IF NOT EXISTS idx_tutors_verified_grade_levels          ON tutors USING GIN (verified_grade_levels);
CREATE INDEX IF NOT EXISTS idx_tutor_applications_tutor_id           ON tutor_applications(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_applications_status             ON tutor_applications(status);
CREATE INDEX IF NOT EXISTS idx_matches_student_id                    ON matches(student_id);
CREATE INDEX IF NOT EXISTS idx_matches_tutor_id                      ON matches(tutor_id);
CREATE INDEX IF NOT EXISTS idx_matches_status                        ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_initiated_by                  ON matches(initiated_by);
CREATE INDEX IF NOT EXISTS idx_reviews_match_id                      ON reviews(match_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tutor_id                     ON sessions(tutor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id                   ON sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_at                 ON sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_curation_progress_tutor_id            ON curation_progress(tutor_id);
CREATE INDEX IF NOT EXISTS idx_curation_progress_status              ON curation_progress(status);
CREATE INDEX IF NOT EXISTS idx_psychology_assessments_tutor_id       ON psychology_assessments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_academic_assessments_tutor_id         ON academic_assessments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_microteaching_assessments_tutor_id    ON microteaching_assessments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_handwriting_assessments_tutor_id      ON handwriting_assessments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_assessments_tutor_id     ON ai_interview_assessments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_curation_results_tutor_id             ON curation_results(tutor_id);
CREATE INDEX IF NOT EXISTS idx_curation_results_status               ON curation_results(status);
CREATE INDEX IF NOT EXISTS idx_payment_deposits_student_id           ON payment_deposits(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_deposits_tutor_id             ON payment_deposits(tutor_id);
CREATE INDEX IF NOT EXISTS idx_payment_deposits_match_id             ON payment_deposits(match_id);
CREATE INDEX IF NOT EXISTS idx_payment_deposits_status               ON payment_deposits(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_deposits_method               ON payment_deposits(payment_method);
CREATE INDEX IF NOT EXISTS idx_payment_deposits_transaction_ref      ON payment_deposits(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_payment_deposits_created_at           ON payment_deposits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_config_key                    ON payment_config(config_key);

-- ============================================================
-- BAGIAN 8 – TRIGGER updated_at
-- ============================================================

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at        ON user_profiles;
DROP TRIGGER IF EXISTS trg_students_updated_at             ON students;
DROP TRIGGER IF EXISTS trg_tutors_updated_at               ON tutors;
DROP TRIGGER IF EXISTS trg_tutor_applications_updated_at   ON tutor_applications;
DROP TRIGGER IF EXISTS trg_matches_updated_at              ON matches;
DROP TRIGGER IF EXISTS trg_reviews_updated_at              ON reviews;
DROP TRIGGER IF EXISTS trg_sessions_updated_at             ON sessions;
DROP TRIGGER IF EXISTS trg_programs_updated_at             ON programs;
DROP TRIGGER IF EXISTS trg_curation_progress_updated_at    ON curation_progress;
DROP TRIGGER IF EXISTS trg_psychology_updated_at           ON psychology_assessments;
DROP TRIGGER IF EXISTS trg_academic_updated_at             ON academic_assessments;
DROP TRIGGER IF EXISTS trg_microteaching_updated_at        ON microteaching_assessments;
DROP TRIGGER IF EXISTS trg_handwriting_updated_at          ON handwriting_assessments;
DROP TRIGGER IF EXISTS trg_interview_updated_at            ON ai_interview_assessments;
DROP TRIGGER IF EXISTS trg_curation_results_updated_at     ON curation_results;
DROP TRIGGER IF EXISTS trg_payment_deposits_updated_at     ON payment_deposits;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_tutors_updated_at
  BEFORE UPDATE ON tutors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_tutor_applications_updated_at
  BEFORE UPDATE ON tutor_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_curation_progress_updated_at
  BEFORE UPDATE ON curation_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_psychology_updated_at
  BEFORE UPDATE ON psychology_assessments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_academic_updated_at
  BEFORE UPDATE ON academic_assessments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_microteaching_updated_at
  BEFORE UPDATE ON microteaching_assessments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_handwriting_updated_at
  BEFORE UPDATE ON handwriting_assessments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_interview_updated_at
  BEFORE UPDATE ON ai_interview_assessments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_curation_results_updated_at
  BEFORE UPDATE ON curation_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_payment_deposits_updated_at
  BEFORE UPDATE ON payment_deposits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- BAGIAN 9 – SEED DATA: payment_config
-- (ON CONFLICT DO NOTHING = aman dijalankan ulang)
-- ============================================================

INSERT INTO payment_config (config_key, config_value, description, is_secret)
VALUES
  -- QRIS
  ('qris_static_string',  '', 'String QRIS statis dari stiker / PDF merchant Anda.',         FALSE),

  -- GoPay
  ('gopay_number',        '', 'Nomor akun GoPay merchant (08xxxxxxxxxx)',                      FALSE),
  ('gopay_name',          '', 'Nama pemilik akun GoPay',                                       FALSE),

  -- OVO
  ('ovo_number',          '', 'Nomor akun OVO merchant (08xxxxxxxxxx)',                        FALSE),
  ('ovo_name',            '', 'Nama pemilik akun OVO',                                         FALSE),

  -- DANA
  ('dana_number',         '', 'Nomor akun DANA merchant (08xxxxxxxxxx)',                       FALSE),
  ('dana_name',           '', 'Nama pemilik akun DANA',                                        FALSE),

  -- ShopeePay
  ('shopeepay_number',    '', 'Nomor akun ShopeePay merchant',                                FALSE),
  ('shopeepay_name',      '', 'Nama pemilik akun ShopeePay',                                  FALSE),

  -- LinkAja
  ('linkaja_number',      '', 'Nomor akun LinkAja merchant',                                   FALSE),
  ('linkaja_name',        '', 'Nama pemilik akun LinkAja',                                     FALSE),

  -- BCA
  ('bca_number',          '', 'Nomor rekening BCA',                                            FALSE),
  ('bca_name',            '', 'Nama pemilik rekening BCA',                                     FALSE),

  -- BNI
  ('bni_number',          '', 'Nomor rekening BNI',                                            FALSE),
  ('bni_name',            '', 'Nama pemilik rekening BNI',                                     FALSE),

  -- BRI
  ('bri_number',          '', 'Nomor rekening BRI',                                            FALSE),
  ('bri_name',            '', 'Nama pemilik rekening BRI',                                     FALSE),

  -- Mandiri
  ('mandiri_number',      '', 'Nomor rekening Mandiri',                                        FALSE),
  ('mandiri_name',        '', 'Nama pemilik rekening Mandiri',                                 FALSE),

  -- Permata
  ('permata_number',      '', 'Nomor rekening Permata',                                        FALSE),
  ('permata_name',        '', 'Nama pemilik rekening Permata',                                 FALSE),

  -- CIMB Niaga
  ('cimb_number',         '', 'Nomor rekening CIMB Niaga',                                     FALSE),
  ('cimb_name',           '', 'Nama pemilik rekening CIMB Niaga',                              FALSE)

ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- SELESAI!
-- Langkah selanjutnya:
--   1. Buka Dashboard Admin → Pengaturan Pembayaran
--   2. Isi string QRIS statis, nomor e-money, dan rekening bank
--   3. Klik Simpan untuk setiap bagian
-- ============================================================
