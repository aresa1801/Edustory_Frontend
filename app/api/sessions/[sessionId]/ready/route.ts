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
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, cache: 'no-store' }),
        },
      }
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

    // Ambil session + data match (join) untuk validasi
    const { data: session, error: sErr } = await supabaseAdmin
      .from('sessions')
      .select(`
        id, scheduled_at, tutor_ready_at, student_ready_at,
        started_at, cancelled_at, status, tutor_id, student_id, match_id, moved_at,
        matches!inner(id, status, tutor_id, student_id)
      `)
      .eq('id', sessionId)
      .single()

    if (sErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // ============================================================
    // FIX 1: Guard — tolak session invalid (match_id NULL / match gak aktif)
    // ============================================================
    const match = (session as any).matches
    if (!session.match_id || !match) {
      return NextResponse.json(
        { error: 'Session tidak valid (match_id kosong / match tidak ditemukan).' },
        { status: 400 }
      )
    }
    if (match.status !== 'active') {
      return NextResponse.json(
        { error: 'Kontrak sudah selesai/dibatalkan.' },
        { status: 400 }
      )
    }
    if (match.tutor_id !== session.tutor_id || match.student_id !== session.student_id) {
      return NextResponse.json(
        { error: 'Session tidak valid (mismatch tutor/student dengan match).' },
        { status: 400 }
      )
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

      // Apply -7 HANYA kalau:
      // 1. moved_at NULL (bukan session hasil reschedule)
      // 2. Belum ada log penalty untuk session ini (biar gak dobel sama cron)
      // 3. Session valid (match_id ada & match aktif) — sudah dijaga di atas
      if (!session.moved_at) {
        const { data: existingLog } = await supabaseAdmin
          .from('credit_log')
          .select('id')
          .eq('ref_id', sessionId)
          .eq('reason', 'session_expired')
          .limit(1)

        if (!existingLog || existingLog.length === 0) {
          await applyExpiredPenalty({
            id: session.id,                                       // ⬅️ BARU
            tutor_id: session.tutor_id,
            student_id: session.student_id,
            match_id: session.match_id,
            tutor_ready_at: session.tutor_ready_at,
            student_ready_at: session.student_ready_at,
          })
        }
      }

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
  id: string                                             // ⬅️ BARU
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
        refId: session.id,                               // ⬅️ FIX: session.id (bukan match_id)
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
        refId: session.id,                               // ⬅️ FIX: session.id (bukan match_id)
      })
    )
  }
  if (tasks.length) await Promise.all(tasks)
    
}