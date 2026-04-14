import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'student' | 'tutor' | 'admin'

export interface User {
  id: string
  email: string
  role: UserRole
  createdAt: string
}

export interface Student {
  id: string
  userId: string
  fullName: string
  phone: string
  dateOfBirth: string
  educationLevel: string
  subjectsInterested: string[]
  preferredSchedule: string
  location: string
  bio: string
  profilePictureUrl: string
  status: 'active' | 'inactive'
  createdAt: string
}

export interface Tutor {
  id: string
  userId: string
  fullName: string
  phone: string
  dateOfBirth: string
  educationLevel: string
  educationInstitution: string
  subjects: string[]
  experienceYears: number
  bio: string
  profilePictureUrl: string
  hourlyRate: number
  availability: Record<string, string[]>
  certifications: string[]
  status: 'pending_curation' | 'approved' | 'rejected' | 'active' | 'inactive'
  curationNotes: string
  curationReviewedBy: string
  curationReviewedAt: string
  createdAt: string
  updatedAt: string
}

export interface Match {
  id: string
  studentId: string
  tutorId: string
  subject: string
  status: 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled'
  matchedAt: string
  acceptedAt: string
  startDate: string
  endDate: string
  notes: string
  rating: number
}

export interface TutorApplication {
  id: string
  tutorId: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
  documents: string[]
  curationFeedback: string
  reviewedBy: string
  reviewedAt: string
  createdAt: string
}
