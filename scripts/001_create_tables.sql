-- Create enum types
CREATE TYPE user_role AS ENUM ('student', 'tutor', 'admin');
CREATE TYPE match_status AS ENUM ('pending', 'accepted', 'active', 'completed', 'cancelled');
CREATE TYPE application_status AS ENUM ('submitted', 'reviewing', 'approved', 'rejected');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role user_role NOT NULL DEFAULT 'student',
  profile_picture_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE students (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade_level TEXT,
  subjects_needed TEXT[] DEFAULT '{}',
  learning_goals TEXT,
  preferred_schedule TEXT,
  budget_per_month DECIMAL(10, 2),
  address TEXT,
  city TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tutors table
CREATE TABLE tutors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  educational_background TEXT,
  subjects_taught TEXT[] DEFAULT '{}',
  years_experience INTEGER,
  certification_url TEXT,
  hourly_rate DECIMAL(10, 2),
  availability TEXT,
  teaching_method TEXT,
  bio_extended TEXT,
  verified BOOLEAN DEFAULT FALSE,
  approval_status application_status DEFAULT 'submitted',
  approval_notes TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  profile_completion_percentage INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  active_matches INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Matches table (Fix and Match system)
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  status match_status DEFAULT 'pending',
  student_applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  tutor_accepted_at TIMESTAMP WITH TIME ZONE,
  lessons_completed INTEGER DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, tutor_id)
);

-- Tutor Applications (for curation)
CREATE TABLE tutor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  status application_status DEFAULT 'submitted',
  submission_data JSONB,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reviews/Ratings table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view tutor profiles" ON users
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'tutor'
    OR (SELECT role FROM users u2 WHERE u2.id = users.id) = 'tutor'
  );

-- RLS Policies for Students
CREATE POLICY "Students can view their own profile" ON students
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can update their own profile" ON students
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Tutors can view student profiles they matched with" ON students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.student_id = students.id
      AND matches.tutor_id = (SELECT id FROM tutors WHERE user_id = auth.uid())
    )
  );

-- RLS Policies for Tutors
CREATE POLICY "Tutors can view their own profile" ON tutors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Tutors can update their own profile" ON tutors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Students can view approved tutors" ON tutors
  FOR SELECT USING (verification_status = 'approved');

CREATE POLICY "Admin can view all tutors" ON tutors
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- RLS Policies for Matches
CREATE POLICY "Users can view their own matches" ON matches
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM students WHERE id = student_id)
    OR auth.uid() = (SELECT user_id FROM tutors WHERE id = tutor_id)
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Students can create matches" ON matches
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM students WHERE id = student_id)
  );

CREATE POLICY "Tutors can update matches" ON matches
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM tutors WHERE id = tutor_id)
  );

-- RLS Policies for Tutor Applications
CREATE POLICY "Tutors can view their own applications" ON tutor_applications
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM tutors WHERE id = tutor_id));

CREATE POLICY "Admin can view all applications" ON tutor_applications
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Tutors can create applications" ON tutor_applications
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM tutors WHERE id = tutor_id)
  );

CREATE POLICY "Admin can update applications" ON tutor_applications
  FOR UPDATE USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Create indexes for better performance
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_tutors_user_id ON tutors(user_id);
CREATE INDEX idx_tutors_approval_status ON tutors(approval_status);
CREATE INDEX idx_matches_student_id ON matches(student_id);
CREATE INDEX idx_matches_tutor_id ON matches(tutor_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_tutor_applications_tutor_id ON tutor_applications(tutor_id);
CREATE INDEX idx_tutor_applications_status ON tutor_applications(status);
CREATE INDEX idx_reviews_match_id ON reviews(match_id);
CREATE INDEX idx_users_role ON users(role);
