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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ambil data match berdasarkan ID dengan join ke tutor dan student
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
        student_id,
        tutors:tutor_id (
          id,
          hourly_rate,
          user_id,
          user_profiles:user_id (
            full_name,
            avatar_url
          )
        ),
        students:student_id (
          id,
          grade_level,
          user_id,
          user_profiles:user_id (
            full_name
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (matchErr) {
      console.error('[API] Fetch match error:', matchErr)
      return NextResponse.json({ error: matchErr.message }, { status: 500 })
    }

    return NextResponse.json(match)
  } catch (err) {
    console.error('[API] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}