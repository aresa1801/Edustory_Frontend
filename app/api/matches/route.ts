// app/api/matches/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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