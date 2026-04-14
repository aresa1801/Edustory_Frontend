import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')
    const tutorId = searchParams.get('tutor_id')
    const status = searchParams.get('status')

    let query = supabase.from('sessions').select('*')

    if (studentId) {
      query = query.eq('student_id', studentId)
    }
    if (tutorId) {
      query = query.eq('tutor_id', tutorId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('scheduled_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('sessions')
      .insert([
        {
          tutor_id: body.tutor_id,
          student_id: body.student_id,
          scheduled_at: body.scheduled_at,
          duration_minutes: body.duration_minutes || 60,
          status: 'scheduled',
          notes: body.notes || null,
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')
    const body = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('sessions')
      .update(body)
      .eq('id', sessionId)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
