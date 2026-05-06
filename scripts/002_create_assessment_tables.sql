-- ============================================================
-- Migration 002: Assessment Tables  (idempotent – safe to re-run)
-- Run AFTER 001_create_tables.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. curation_progress
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curation_progress (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id        UUID        NOT NULL UNIQUE REFERENCES tutors(id) ON DELETE CASCADE,
  current_step    TEXT        DEFAULT 'psychology'
                    CHECK (current_step IN (
                      'psychology','academic','microteaching',
                      'handwriting','interview','completed'
                    )),
  completed_steps TEXT[]      DEFAULT '{}',
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  status          TEXT        DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress','completed','expired','rejected')),
  overall_score   DECIMAL(5,2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. psychology_assessments  (20 % weight)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS psychology_assessments (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id              UUID        NOT NULL REFERENCES tutors(id)            ON DELETE CASCADE,
  curation_progress_id  UUID        NOT NULL REFERENCES curation_progress(id) ON DELETE CASCADE,
  questions_answered    INTEGER     DEFAULT 0,
  total_questions       INTEGER     DEFAULT 30,
  answers               JSONB       DEFAULT '{}',
  score                 DECIMAL(5,2),
  passed                BOOLEAN     DEFAULT FALSE,
  submitted_at          TIMESTAMPTZ,
  started_at            TIMESTAMPTZ DEFAULT NOW(),
  time_spent_seconds    INTEGER,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, curation_progress_id)
);

-- ------------------------------------------------------------
-- 3. academic_assessments  (30 % weight)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academic_assessments (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id              UUID        NOT NULL REFERENCES tutors(id)            ON DELETE CASCADE,
  curation_progress_id  UUID        NOT NULL REFERENCES curation_progress(id) ON DELETE CASCADE,
  subjects              TEXT[]      DEFAULT '{}',
  questions_answered    INTEGER     DEFAULT 0,
  total_questions       INTEGER     DEFAULT 20,
  answers               JSONB       DEFAULT '{}',
  score                 DECIMAL(5,2),
  passed                BOOLEAN     DEFAULT FALSE,
  submitted_at          TIMESTAMPTZ,
  started_at            TIMESTAMPTZ DEFAULT NOW(),
  time_spent_seconds    INTEGER,
  cheating_flags        JSONB       DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, curation_progress_id)
);

-- ------------------------------------------------------------
-- 4. microteaching_assessments  (25 % weight)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS microteaching_assessments (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id              UUID        NOT NULL REFERENCES tutors(id)            ON DELETE CASCADE,
  curation_progress_id  UUID        NOT NULL REFERENCES curation_progress(id) ON DELETE CASCADE,
  topic_selected        TEXT        NOT NULL,
  video_url             TEXT,
  video_duration_seconds INTEGER,
  transcription         TEXT,
  clarity_score         DECIMAL(3,2),
  engagement_score      DECIMAL(3,2),
  structure_score       DECIMAL(3,2),
  visual_aids_score     DECIMAL(3,2),
  time_management_score DECIMAL(3,2),
  overall_score         DECIMAL(5,2),
  passed                BOOLEAN     DEFAULT FALSE,
  ai_analysis           JSONB       DEFAULT '{}',
  submitted_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, curation_progress_id)
);

-- ------------------------------------------------------------
-- 5. handwriting_assessments  (15 % weight)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS handwriting_assessments (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id                  UUID        NOT NULL REFERENCES tutors(id)            ON DELETE CASCADE,
  curation_progress_id      UUID        NOT NULL REFERENCES curation_progress(id) ON DELETE CASCADE,
  problem_1_image_url       TEXT,
  problem_1_explanation     TEXT,
  problem_2_image_url       TEXT,
  problem_2_explanation     TEXT,
  legibility_score          DECIMAL(3,2),
  accuracy_score            DECIMAL(3,2),
  explanation_quality_score DECIMAL(3,2),
  overall_score             DECIMAL(5,2),
  passed                    BOOLEAN     DEFAULT FALSE,
  ocr_results               JSONB       DEFAULT '{}',
  submitted_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, curation_progress_id)
);

-- ------------------------------------------------------------
-- 6. ai_interview_assessments  (10 % weight)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_interview_assessments (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id                UUID        NOT NULL REFERENCES tutors(id)            ON DELETE CASCADE,
  curation_progress_id    UUID        NOT NULL REFERENCES curation_progress(id) ON DELETE CASCADE,
  conversation            JSONB       DEFAULT '{}',
  questions_answered      INTEGER     DEFAULT 0,
  total_questions         INTEGER     DEFAULT 10,
  responses               JSONB       DEFAULT '{}',
  response_quality_score  DECIMAL(3,2),
  relevance_score         DECIMAL(3,2),
  grammar_score           DECIMAL(3,2),
  empathy_score           DECIMAL(3,2),
  consistency_score       DECIMAL(3,2),
  overall_score           DECIMAL(5,2),
  passed                  BOOLEAN     DEFAULT FALSE,
  submitted_at            TIMESTAMPTZ,
  time_spent_seconds      INTEGER,
  started_at              TIMESTAMPTZ DEFAULT NOW(),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, curation_progress_id)
);

-- ------------------------------------------------------------
-- 7. curation_results
--    reviewed_by references user_profiles (was mistakenly
--    written as users_profile in the original file)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS curation_results (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id              UUID        NOT NULL REFERENCES tutors(id)            ON DELETE CASCADE,
  curation_progress_id  UUID        NOT NULL REFERENCES curation_progress(id) ON DELETE CASCADE,
  psychology_score      DECIMAL(5,2),
  academic_score        DECIMAL(5,2),
  microteaching_score   DECIMAL(5,2),
  handwriting_score     DECIMAL(5,2),
  interview_score       DECIMAL(5,2),
  weighted_score        DECIMAL(5,2) NOT NULL,
  status                TEXT        NOT NULL
                          CHECK (status IN ('approved','pending_review','rejected')),
  approval_status       TEXT        DEFAULT 'pending'
                          CHECK (approval_status IN ('pending','approved','rejected')),
  reviewed_by           UUID        REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  admin_notes           TEXT,
  rejection_reason      TEXT,
  strengths             TEXT[],
  improvement_areas     TEXT[],
  can_reapply_at        TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, curation_progress_id)
);

-- ------------------------------------------------------------
-- 8. Enable RLS
-- ------------------------------------------------------------
ALTER TABLE curation_progress        ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychology_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_assessments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE microteaching_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE handwriting_assessments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interview_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE curation_results         ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 9. RLS Policies
--    Uses public.is_admin() created in 001_create_tables.sql.
--    All policies are dropped first so the script is re-runnable.
-- ------------------------------------------------------------

-- curation_progress -------------------------------------------
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

-- psychology_assessments --------------------------------------
DROP POLICY IF EXISTS "Tutors can view their psychology assessments"   ON psychology_assessments;
DROP POLICY IF EXISTS "Tutors can insert their psychology assessments" ON psychology_assessments;
DROP POLICY IF EXISTS "Admins can view all psychology assessments"     ON psychology_assessments;

CREATE POLICY "Tutors can view their psychology assessments" ON psychology_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Tutors can insert their psychology assessments" ON psychology_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all psychology assessments" ON psychology_assessments
  FOR SELECT USING (public.is_admin());

-- academic_assessments ----------------------------------------
DROP POLICY IF EXISTS "Tutors can view their academic assessments"   ON academic_assessments;
DROP POLICY IF EXISTS "Tutors can insert their academic assessments" ON academic_assessments;
DROP POLICY IF EXISTS "Admins can view all academic assessments"     ON academic_assessments;

CREATE POLICY "Tutors can view their academic assessments" ON academic_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Tutors can insert their academic assessments" ON academic_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all academic assessments" ON academic_assessments
  FOR SELECT USING (public.is_admin());

-- microteaching_assessments -----------------------------------
DROP POLICY IF EXISTS "Tutors can view their microteaching assessments"   ON microteaching_assessments;
DROP POLICY IF EXISTS "Tutors can insert their microteaching assessments" ON microteaching_assessments;
DROP POLICY IF EXISTS "Admins can view all microteaching assessments"     ON microteaching_assessments;

CREATE POLICY "Tutors can view their microteaching assessments" ON microteaching_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Tutors can insert their microteaching assessments" ON microteaching_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all microteaching assessments" ON microteaching_assessments
  FOR SELECT USING (public.is_admin());

-- handwriting_assessments -------------------------------------
DROP POLICY IF EXISTS "Tutors can view their handwriting assessments"   ON handwriting_assessments;
DROP POLICY IF EXISTS "Tutors can insert their handwriting assessments" ON handwriting_assessments;
DROP POLICY IF EXISTS "Admins can view all handwriting assessments"     ON handwriting_assessments;

CREATE POLICY "Tutors can view their handwriting assessments" ON handwriting_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Tutors can insert their handwriting assessments" ON handwriting_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all handwriting assessments" ON handwriting_assessments
  FOR SELECT USING (public.is_admin());

-- ai_interview_assessments ------------------------------------
DROP POLICY IF EXISTS "Tutors can view their interview assessments"   ON ai_interview_assessments;
DROP POLICY IF EXISTS "Tutors can insert their interview assessments" ON ai_interview_assessments;
DROP POLICY IF EXISTS "Admins can view all interview assessments"     ON ai_interview_assessments;

CREATE POLICY "Tutors can view their interview assessments" ON ai_interview_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Tutors can insert their interview assessments" ON ai_interview_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all interview assessments" ON ai_interview_assessments
  FOR SELECT USING (public.is_admin());

-- curation_results --------------------------------------------
DROP POLICY IF EXISTS "Tutors can view their curation results" ON curation_results;
DROP POLICY IF EXISTS "Admins can view all curation results"   ON curation_results;
DROP POLICY IF EXISTS "Admins can update curation results"     ON curation_results;

CREATE POLICY "Tutors can view their curation results" ON curation_results
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all curation results" ON curation_results
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update curation results" ON curation_results
  FOR UPDATE USING (public.is_admin());

-- ------------------------------------------------------------
-- 10. Indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_curation_progress_tutor_id         ON curation_progress(tutor_id);
CREATE INDEX IF NOT EXISTS idx_curation_progress_status           ON curation_progress(status);
CREATE INDEX IF NOT EXISTS idx_psychology_assessments_tutor_id    ON psychology_assessments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_academic_assessments_tutor_id      ON academic_assessments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_microteaching_assessments_tutor_id ON microteaching_assessments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_handwriting_assessments_tutor_id   ON handwriting_assessments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_assessments_tutor_id  ON ai_interview_assessments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_curation_results_tutor_id          ON curation_results(tutor_id);
CREATE INDEX IF NOT EXISTS idx_curation_results_status            ON curation_results(status);
