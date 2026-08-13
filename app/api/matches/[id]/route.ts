// app/api/matches/[id]/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  console.log(`[API] /matches/${params.id} START`)

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const authHeader = request.headers.get('authorization')
    console.log('[API] authHeader:', authHeader ? 'present' : 'missing')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('[API] token (first 10 chars):', token.substring(0, 10))

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !user) {
      console.error('[API] Auth error:', userErr)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[API] User authenticated:', user.id)

    const { id } = params
    console.log('[API] Fetching match with id:', id)

    // Ambil match
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()

    if (matchErr) {
      console.error('[API] Fetch match error:', matchErr)
      return NextResponse.json({ error: matchErr.message }, { status: 500 })
    }
    console.log('[API] Match found:', match ? 'yes' : 'no')
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Ambil tutor data
    console.log('[API] Fetching tutor for tutor_id:', match.tutor_id)
    const { data: tutor, error: tutorErr } = await supabase
      .from('tutors')
      .select('id, hourly_rate, user_id')
      .eq('id', match.tutor_id)
      .single()
    if (tutorErr) console.warn('[API] Tutor fetch error:', tutorErr)
    console.log('[API] Tutor fetched:', tutor ? 'yes' : 'no')

    let tutorProfile = null
    if (tutor) {
      console.log('[API] Fetching tutor profile for user_id:', tutor.user_id)
      const { data: tp, error: tpErr } = await supabase
        .from('user_profiles')
        .select('full_name, avatar_url')
        .eq('id', tutor.user_id)
        .single()
      if (tpErr) console.warn('[API] Tutor profile error:', tpErr)
      tutorProfile = tp
      console.log('[API] Tutor profile fetched:', tutorProfile ? 'yes' : 'no')
    }

    // Ambil student data
    console.log('[API] Fetching student for student_id:', match.student_id)
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id, grade_level, user_id')
      .eq('id', match.student_id)
      .single()
    if (studentErr) console.warn('[API] Student fetch error:', studentErr)
    console.log('[API] Student fetched:', student ? 'yes' : 'no')

    let studentProfile = null
    if (student) {
      console.log('[API] Fetching student profile for user_id:', student.user_id)
      const { data: sp, error: spErr } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', student.user_id)
        .single()
      if (spErr) console.warn('[API] Student profile error:', spErr)
      studentProfile = sp
      console.log('[API] Student profile fetched:', studentProfile ? 'yes' : 'no')
    }

    // Build response
    const response = {
      ...match,
      tutors: tutor ? { ...tutor, user_profiles: tutorProfile } : null,
      students: student ? { ...student, user_profiles: studentProfile } : null
    }

    const duration = Date.now() - startTime
    console.log(`[API] /matches/${params.id} DONE in ${duration}ms`)
    return NextResponse.json(response)

  } catch (err) {
    const duration = Date.now() - startTime
    console.error(`[API] /matches/${params.id} ERROR after ${duration}ms:`, err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}