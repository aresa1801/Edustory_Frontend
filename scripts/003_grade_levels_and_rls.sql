-- Migration 003: Grade level verification columns + missing INSERT RLS policies
-- Run this against your Supabase database after migration 002.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add grade level columns to the tutors table
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE tutors
  ADD COLUMN IF NOT EXISTS target_grade_level TEXT,
  ADD COLUMN IF NOT EXISTS verified_grade_levels TEXT[] DEFAULT '{}';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add level_targeted column to academic_assessments
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE academic_assessments
  ADD COLUMN IF NOT EXISTS level_targeted TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. INSERT RLS policies for curation tables
--    (The previous migration only added SELECT/UPDATE policies, not INSERT.)
-- ─────────────────────────────────────────────────────────────────────────────

-- curation_progress
CREATE POLICY "Tutors can insert their own curation progress" ON curation_progress
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

-- psychology_assessments
CREATE POLICY "Tutors can insert their psychology assessments" ON psychology_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

-- academic_assessments
CREATE POLICY "Tutors can insert their academic assessments" ON academic_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

-- microteaching_assessments
CREATE POLICY "Tutors can insert their microteaching assessments" ON microteaching_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

-- handwriting_assessments
CREATE POLICY "Tutors can insert their handwriting assessments" ON handwriting_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

-- ai_interview_assessments
CREATE POLICY "Tutors can insert their interview assessments" ON ai_interview_assessments
  FOR INSERT WITH CHECK (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Allow tutors to update their own verified_grade_levels and target_grade_level
--    (The existing UPDATE policy on tutors already covers this via user_id check,
--     but if you use service-role key in API routes, no additional policy needed.)
-- ─────────────────────────────────────────────────────────────────────────────

-- No extra policy needed for tutors UPDATE since we use the service-role key
-- in assessment API routes and the existing "Tutors can update their own profile"
-- policy covers authenticated client-side updates.

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Indexes for new columns
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tutors_verified_grade_levels ON tutors USING GIN (verified_grade_levels);
CREATE INDEX IF NOT EXISTS idx_tutors_target_grade_level ON tutors (target_grade_level);
