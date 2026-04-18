-- Migration 003: Add gender to user_profiles and create payment_deposits table

-- Add gender field to user_profiles (run only if not already present)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('laki-laki', 'perempuan'));

-- Add city field to students (run only if not already present)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS city TEXT;

-- Add budget_per_month field to students (run only if not already present)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS budget_per_month DECIMAL(10, 2);

-- Add preferred_schedule field to students (run only if not already present)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS preferred_schedule TEXT;

-- Create payment_deposits table for recording deposit payments
CREATE TABLE IF NOT EXISTS payment_deposits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tutor_id         UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  match_id         UUID REFERENCES matches(id) ON DELETE SET NULL,
  amount           DECIMAL(10, 2) NOT NULL,
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('gopay', 'ovo', 'dana', 'bca', 'bni', 'mandiri')),
  payment_status   TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'expired', 'refunded')),
  payment_proof_url TEXT,
  notes            TEXT,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on payment_deposits
ALTER TABLE payment_deposits ENABLE ROW LEVEL SECURITY;

-- Students can view their own deposits
CREATE POLICY "Students can view their own deposits" ON payment_deposits
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Students can create deposits
CREATE POLICY "Students can create deposits" ON payment_deposits
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Admin can view all deposits
CREATE POLICY "Admin can view all deposits" ON payment_deposits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can update deposits (e.g., mark as paid)
CREATE POLICY "Admin can update deposits" ON payment_deposits
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_deposits_student_id ON payment_deposits(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_deposits_match_id ON payment_deposits(match_id);
CREATE INDEX IF NOT EXISTS idx_payment_deposits_status ON payment_deposits(payment_status);
