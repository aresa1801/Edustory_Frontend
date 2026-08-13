// app/api/matches/[id]/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      console.error('[API] Auth error:', userErr)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    console.log('[API] Fetching match with id:', id)

    // 1. Ambil match utama
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select(`
        id,
        subject,
        matched_subjects,
        status,
        lesson_frequency,
        start_date,
        tutor_id,
        student_id
      `)
      .eq('id', id)
      .single()

    if (matchErr) {
      console.error('[API] Fetch match error:', matchErr)
      return NextResponse.json({ error: matchErr.message }, { status: 500 })
    }

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // 2. Ambil data tutor
    let tutorData: any = null
    const { data: tutor, error: tutorErr } = await supabase
      .from('tutors')
      .select('id, hourly_rate, user_id')
      .eq('id', match.tutor_id)
      .single()

    if (!tutorErr && tutor) {
      tutorData = tutor
      // Ambil profil tutor
      const { data: tutorProfile, error: tpErr } = await supabase
        .from('user_profiles')
        .select('full_name, avatar_url')
        .eq('id', tutor.user_id)
        .single()
      if (!tpErr && tutorProfile) {
        tutorData.user_profiles = tutorProfile
      }
    }

    // 3. Ambil data student
    let studentData: any = null
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id, grade_level, user_id')
      .eq('id', match.student_id)
      .single()

    if (!studentErr && student) {
      studentData = student
      // Ambil profil student
      const { data: studentProfile, error: spErr } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', student.user_id)
        .single()
      if (!spErr && studentProfile) {
        studentData.user_profiles = studentProfile
      }
    }

    // 4. Buat response object baru
    const response = {
      id: match.id,
      subject: match.subject,
      matched_subjects: match.matched_subjects,
      status: match.status,
      lesson_frequency: match.lesson_frequency,
      start_date: match.start_date,
      tutor_id: match.tutor_id,
      student_id: match.student_id,
      tutors: tutorData,
      students: studentData
    }

    console.log('[API] Match fetched successfully')
    return NextResponse.json(response)
  } catch (err) {
    console.error('[API] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}