import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { adjustCredit, DELTA } from '@/lib/credit'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const READY_WINDOW_MINUTES = 20

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { sessionId } = params
    const body = await req.json()
    const { role } = body

    if (!role || !['tutor', 'student'].includes(role)) {
      return NextResponse.json(
        { error: 'role harus "tutor" atau "student"' },
        { status: 400 }
      )
    }

    // ⬇️ Tambah tutor_id, student_id, match_id
    const { data: session, error: sErr } = await supabaseAdmin
      .from('sessions')
      .select(
        'id, scheduled_at, tutor_ready_at, student_ready_at, started_at, cancelled_at, status, tutor_id, student_id, match_id'
      )
      .eq('id', sessionId)
      .single()

    if (sErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.cancelled_at) {
      return NextResponse.json(
        { error: 'Sesi sudah hangus/dibatalkan.', state: 'cancelled' },
        { status: 410 }
      )
    }

    if (session.started_at) {
      return NextResponse.json({
        success: true,
        both_ready: true,
        state: 'started',
        started_at: session.started_at,
        tutor_ready_at: session.tutor_ready_at,
        student_ready_at: session.student_ready_at,
      })
    }

    // ===== Cek window 20 menit =====
    const scheduledAt = new Date(session.scheduled_at)
    const now = new Date()
    const diffMinutes = (now.getTime() - scheduledAt.getTime()) / 1000 / 60

    if (diffMinutes > READY_WINDOW_MINUTES) {
      // Auto-cancel (guard status biar gak race sama cron)
      await supabaseAdmin
        .from('sessions')
        .update({ cancelled_at: now.toISOString(), status: 'cancelled' })
        .eq('id', sessionId)
        .eq('status', 'scheduled')

      // ⬇️ -7 untuk pihak yang belum klik Siap
      await applyExpiredPenalty(session)

      return NextResponse.json(
        { error: 'Waktu siap sudah habis. Sesi ditandai hangus.', state: 'expired' },
        { status: 410 }
      )
    }

    // ===== Set ready_at =====
    const readyField = `${role}_ready_at`
    const nowIso = now.toISOString()
    const updatePayload: Record<string, any> = { [readyField]: nowIso }

    const otherReadyAt =
      role === 'tutor' ? session.student_ready_at : session.tutor_ready_at

    let bothReady = false
    if (otherReadyAt && !session.started_at) {
      updatePayload.started_at = nowIso
      updatePayload.status = 'ongoing'
      bothReady = true
    }

    const { error: uErr } = await supabaseAdmin
      .from('sessions')
      .update(updatePayload)
      .eq('id', sessionId)

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 })
    }

    // ⬇️ +2 untuk tutor & student saat both_ready
    if (bothReady) {
      await Promise.all([
        adjustCredit({
          profileId: session.tutor_id,
          role: 'tutor',
          delta: DELTA.both_ready,
          reason: 'both_ready',
          refId: session.match_id,
        }),
        adjustCredit({
          profileId: session.student_id,
          role: 'student',
          delta: DELTA.both_ready,
          reason: 'both_ready',
          refId: session.match_id,
        }),
      ])
    }

    return NextResponse.json({
      success: true,
      both_ready: bothReady,
      state: bothReady ? 'started' : 'waiting',
      role,
      ready_at: nowIso,
      tutor_ready_at: role === 'tutor' ? nowIso : session.tutor_ready_at,
      student_ready_at: role === 'student' ? nowIso : session.student_ready_at,
      started_at: updatePayload.started_at || null,
    })
  } catch (err) {
    console.error('[API session ready] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// ===== Helper: -7 untuk pihak yang ready_at null =====
async function applyExpiredPenalty(session: {
  tutor_id: string
  student_id: string
  match_id: string
  tutor_ready_at: string | null
  student_ready_at: string | null
}) {
  const tasks: Promise<any>[] = []
  if (!session.tutor_ready_at) {
    tasks.push(
      adjustCredit({
        profileId: session.tutor_id,
        role: 'tutor',
        delta: DELTA.session_expired,
        reason: 'session_expired',
        refId: session.match_id,
      })
    )
  }
  if (!session.student_ready_at) {
    tasks.push(
      adjustCredit({
        profileId: session.student_id,
        role: 'student',
        delta: DELTA.session_expired,
        reason: 'session_expired',
        refId: session.match_id,
      })
    )
  }
  if (tasks.length) await Promise.all(tasks)
}