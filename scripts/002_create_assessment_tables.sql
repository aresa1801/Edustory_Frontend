-- Create assessment tables for comprehensive tutor curation system

-- Curation Progress Tracking
CREATE TABLE IF NOT EXISTS curation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  current_step TEXT DEFAULT 'psychology' CHECK (current_step IN ('psychology', 'academic', 'microteaching', 'handwriting', 'interview', 'completed')),
  completed_steps TEXT[] DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'expired', 'rejected')),
  overall_score DECIMAL(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id)
);

-- Psychology Test (20% weight)
CREATE TABLE IF NOT EXISTS psychology_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  curation_progress_id UUID NOT NULL REFERENCES curation_progress(id) ON DELETE CASCADE,
  questions_answered INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 30,
  answers JSONB DEFAULT '{}',
  score DECIMAL(5, 2),
  passed BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, curation_progress_id)
);

-- Academic Ability Test (30% weight)
CREATE TABLE IF NOT EXISTS academic_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  curation_progress_id UUID NOT NULL REFERENCES curation_progress(id) ON DELETE CASCADE,
  subjects TEXT[] DEFAULT '{}',
  questions_answered INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 20,
  answers JSONB DEFAULT '{}',
  score DECIMAL(5, 2),
  passed BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  time_spent_seconds INTEGER,
  cheating_flags JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, curation_progress_id)
);

-- Micro Teaching Video (25% weight)
CREATE TABLE IF NOT EXISTS microteaching_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  curation_progress_id UUID NOT NULL REFERENCES curation_progress(id) ON DELETE CASCADE,
  topic_selected TEXT NOT NULL,
  video_url TEXT,
  video_duration_seconds INTEGER,
  transcription TEXT,
  clarity_score DECIMAL(3, 2),
  engagement_score DECIMAL(3, 2),
  structure_score DECIMAL(3, 2),
  visual_aids_score DECIMAL(3, 2),
  time_management_score DECIMAL(3, 2),
  overall_score DECIMAL(5, 2),
  passed BOOLEAN DEFAULT FALSE,
  ai_analysis JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, curation_progress_id)
);

-- Handwriting & Written Explanation (15% weight)
CREATE TABLE IF NOT EXISTS handwriting_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  curation_progress_id UUID NOT NULL REFERENCES curation_progress(id) ON DELETE CASCADE,
  problem_1_image_url TEXT,
  problem_1_explanation TEXT,
  problem_2_image_url TEXT,
  problem_2_explanation TEXT,
  legibility_score DECIMAL(3, 2),
  accuracy_score DECIMAL(3, 2),
  explanation_quality_score DECIMAL(3, 2),
  overall_score DECIMAL(5, 2),
  passed BOOLEAN DEFAULT FALSE,
  ocr_results JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, curation_progress_id)
);

-- AI Interview Q&A (10% weight)
CREATE TABLE IF NOT EXISTS ai_interview_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  curation_progress_id UUID NOT NULL REFERENCES curation_progress(id) ON DELETE CASCADE,
  conversation JSONB DEFAULT '{}',
  questions_answered INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 10,
  responses JSONB DEFAULT '{}',
  response_quality_score DECIMAL(3, 2),
  relevance_score DECIMAL(3, 2),
  grammar_score DECIMAL(3, 2),
  empathy_score DECIMAL(3, 2),
  consistency_score DECIMAL(3, 2),
  overall_score DECIMAL(5, 2),
  passed BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, curation_progress_id)
);

-- Curation Final Results
CREATE TABLE IF NOT EXISTS curation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  curation_progress_id UUID NOT NULL REFERENCES curation_progress(id) ON DELETE CASCADE,
  psychology_score DECIMAL(5, 2),
  academic_score DECIMAL(5, 2),
  microteaching_score DECIMAL(5, 2),
  handwriting_score DECIMAL(5, 2),
  interview_score DECIMAL(5, 2),
  weighted_score DECIMAL(5, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'pending_review', 'rejected')),
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users_profile(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  rejection_reason TEXT,
  strengths TEXT[],
  improvement_areas TEXT[],
  can_reapply_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, curation_progress_id)
);

-- Enable RLS on assessment tables
ALTER TABLE curation_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychology_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE microteaching_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE handwriting_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interview_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE curation_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for curation_progress
CREATE POLICY "Tutors can view their own curation progress" ON curation_progress
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));
CREATE POLICY "Tutors can update their own curation progress" ON curation_progress
  FOR UPDATE USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all curation progress" ON curation_progress
  FOR SELECT USING (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for assessments (tutors can view their own, admins can view all)
CREATE POLICY "Tutors can view their psychology assessments" ON psychology_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all psychology assessments" ON psychology_assessments
  FOR SELECT USING (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Tutors can view their academic assessments" ON academic_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all academic assessments" ON academic_assessments
  FOR SELECT USING (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Tutors can view their microteaching assessments" ON microteaching_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all microteaching assessments" ON microteaching_assessments
  FOR SELECT USING (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Tutors can view their handwriting assessments" ON handwriting_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all handwriting assessments" ON handwriting_assessments
  FOR SELECT USING (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Tutors can view their interview assessments" ON ai_interview_assessments
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all interview assessments" ON ai_interview_assessments
  FOR SELECT USING (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Tutors can view their curation results" ON curation_results
  FOR SELECT USING (tutor_id IN (SELECT id FROM tutors WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all curation results" ON curation_results
  FOR SELECT USING (EXISTS (SELECT 1 FROM users_profile WHERE id = auth.uid() AND role = 'admin'));
