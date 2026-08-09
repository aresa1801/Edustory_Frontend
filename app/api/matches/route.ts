// app/api/matches/route.ts

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// GET – Mendukung tutor (default) dan student (dengan query ?student_id=...)
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token)

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    let query = supabase.from('matches').select('*')

    if (studentId) {
      // Mode student: verifikasi bahwa user ini adalah student yang sesuai
      const { data: studentData, error: studentErr } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (studentErr || !studentData) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      if (studentData.id !== studentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      query = query.eq('student_id', studentId)
    } else {
      // Mode tutor: ambil match milik tutor yang login
      const { data: tutorData, error: tutorErr } = await supabase
        .from('tutors')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (tutorErr || !tutorData) {
        return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
      }
      query = query.eq('tutor_id', tutorData.id)
    }

    const { data: matches, error: matchErr } = await query.order('created_at', { ascending: false })

    if (matchErr) {
      console.error('[API] Fetch matches error:', matchErr)
      return NextResponse.json({ error: matchErr.message }, { status: 500 })
    }

    return NextResponse.json(matches || [])
  } catch (err) {
    console.error('[API] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST – Membuat match baru (dengan data statis student + tutor)
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { tutor_id, student_id, subject, status, initiated_by, lesson_frequency, start_date, matched_subjects } = body

    if (!tutor_id || !student_id) {
      return NextResponse.json({ error: 'tutor_id and student_id are required' }, { status: 400 })
    }

    // 1. Ambil data tutor dari tabel tutors (full_name, bio, dll sudah ada di sini)
    const { data: tutor, error: tutorErr } = await supabase
      .from('tutors')
      .select('full_name, bio, experience_years, hourly_rate, rating, total_reviews, verified_grade_levels')
      .eq('id', tutor_id)
      .single()

    if (tutorErr || !tutor) {
      console.error('[API] Tutor error:', tutorErr)
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    // 2. Ambil data student dari tabel students
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('name, grade_level, subjects, budget_per_month, sessions_per_month, preferred_schedule, address, avatar_url, phone, latitude, longitude, is_online')
      .eq('id', student_id)
      .single()

    if (studentError || !student) {
      console.error('[API] Student error:', studentError)
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // 3. Insert dengan semua data statis (student + tutor)
    const { data, error } = await supabase
      .from('matches')
      .insert({
        // Kolom wajib
        tutor_id,
        student_id,
        matched_subjects: matched_subjects || [],
        status: status || 'pending',
        initiated_by: initiated_by || 'tutor',
        lesson_frequency: lesson_frequency || 'flexible',
        start_date: start_date || new Date().toISOString().split('T')[0],

        // Statis student
        student_full_name: student.name,
        student_grade: student.grade_level,
        student_budget_per_month: student.budget_per_month,
        student_sessions_per_month: student.sessions_per_month,
        student_schedule: student.preferred_schedule,
        student_address: student.address,
        student_avatar: student.avatar_url,
        student_phone: student.phone,
        student_latitude: student.latitude,
        student_longitude: student.longitude,
        student_is_online: student.is_online ?? true,

        // Statis tutor (semua dari tabel tutors)
        tutor_full_name: tutor.full_name,
        tutor_bio: tutor.bio,
        tutor_experience_years: tutor.experience_years,
        tutor_hourly_rate: tutor.hourly_rate,
        tutor_rating: tutor.rating,
        tutor_total_reviews: tutor.total_reviews,
        tutor_verified_grade_levels: tutor.verified_grade_levels,
      })
      .select()

    if (error) {
      console.error('[API] Insert match error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data?.[0] || null })
  } catch (err) {
    console.error('[API] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}