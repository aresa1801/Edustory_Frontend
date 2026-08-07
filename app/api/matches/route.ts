import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

    // Get tutor ID
    const { data: tutorData, error: tutorErr } = await supabase
      .from('tutors')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (tutorErr || !tutorData) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    // Fetch matches with complete student data (from matches static fields, no join needed)
    // For backward compatibility, we still join, but we can also fetch from matches directly.
    // We'll keep join for now.
    const { data: matches, error: matchErr } = await supabase
      .from('matches')
      .select(`
        id,
        status,
        subject,
        lesson_frequency,
        start_date,
        created_at,
        initiated_by,
        student_full_name,
        student_grade,
        student_subjects,
        student_budget_per_month,
        student_sessions_per_month,
        student_schedule,
        student_address,
        student_avatar,
        student_phone,
        student_latitude,
        student_longitude,
        student_is_online,
        students:student_id(
          id,
          name,
          grade_level,
          subjects,
          budget_per_month,
          sessions_per_month,
          preferred_schedule,
          address,
          avatar_url,
          phone,
          latitude,
          longitude,
          is_online
        )
      `)
      .eq('tutor_id', tutorData.id)
      .order('created_at', { ascending: false })

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

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { tutor_id, student_id, subject, status, initiated_by, lesson_frequency, start_date } = body

    if (!tutor_id || !student_id) {
      return NextResponse.json({ error: 'tutor_id and student_id are required' }, { status: 400 })
    }

    // Ambil data student untuk diisi ke kolom statis
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('name, grade_level, subjects, budget_per_month, sessions_per_month, preferred_schedule, address, avatar_url, phone, latitude, longitude, is_online')
      .eq('id', student_id)
      .single()

    if (studentError || !student) {
      console.error('[API] Student not found:', studentError)
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Insert ke matches dengan data statis
    const { data, error } = await supabase
      .from('matches')
      .insert({
        tutor_id,
        student_id,
        subject: subject || 'Umum',
        status: status || 'pending',
        initiated_by: initiated_by || 'tutor',
        lesson_frequency: lesson_frequency || 'flexible',
        start_date: start_date || new Date().toISOString().split('T')[0],
        student_full_name: student.name,
        student_grade: student.grade_level,
        student_subjects: student.subjects,
        student_budget_per_month: student.budget_per_month,
        student_sessions_per_month: student.sessions_per_month,
        student_schedule: student.preferred_schedule,
        student_address: student.address,
        student_avatar: student.avatar_url,
        student_phone: student.phone,
        student_latitude: student.latitude,
        student_longitude: student.longitude,
        student_is_online: student.is_online ?? true,
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