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

    // Get tutor ID from user
    const { data: tutorData, error: tutorErr } = await supabase
      .from('tutors')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (tutorErr || !tutorData) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    // Fetch matches for this tutor with complete student data
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
        students:student_id(
          id,
          grade_level,
          subjects,
          budget_per_month,
          sessions_per_month,
          preferred_schedule,
          address,
          avatar_url,
          users_profile:user_id(
            full_name,
            phone
          )
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