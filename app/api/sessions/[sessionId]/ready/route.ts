import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const READY_WINDOW_MINUTES = 20

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { sessionId } = params
    const body = await req.json()
    const { role } = body // 'tutor' | 'student'

    if (!role || !['tutor', 'student'].includes(role)) {
      return NextResponse.json(
        { error: 'role harus "tutor" atau "student"' },
        { status: 400 }
      )
    }

    // 1. Ambil session
    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select('id, scheduled_at, tutor_ready_at, student_ready_at, started_at, cancelled_at')
      .eq('id', sessionId)
      .single()

    if (sErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // 2. Cek window 20 menit
    const scheduledAt = new Date(session.scheduled_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - scheduledAt.getTime()) / 1000 / 60

    if (diffMinutes > READY_WINDOW_MINUTES) {
      // Window lewat → tandai hangus
      await supabase
        .from('sessions')
        .update({ cancelled_at: now.toISOString(), status: 'cancelled' })
        .eq('id', sessionId)

      return NextResponse.json(
        { error: 'Waktu siap sudah habis. Sesi ditandai hangus.' },
        { status: 410 }
      )
    }

    // 3. Set role ready_at
    const updatePayload: any = {
      [`${role}_ready_at`]: now.toISOString(),
    }

    const otherReadyAt =
      role === 'tutor' ? session.student_ready_at : session.tutor_ready_at

    // 4. Kalau kedua sisi sudah ready → set started_at
    if (otherReadyAt && !session.started_at) {
      updatePayload.started_at = now.toISOString()
      updatePayload.status = 'ongoing'
    }

    const { error: uErr } = await supabase
      .from('sessions')
      .update(updatePayload)
      .eq('id', sessionId)

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      both_ready: !!updatePayload.started_at,
      ready_at: now.toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}