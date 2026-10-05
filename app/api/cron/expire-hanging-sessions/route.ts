import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { adjustCredit, DELTA } from '@/lib/credit'

export const dynamic = 'force-dynamic'

const READY_WINDOW_MINUTES = 20

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const cutoff = new Date(now.getTime() - READY_WINDOW_MINUTES * 60 * 1000)

  // ⬇️ CUTOFF: sistem credit cuma berlaku untuk session >= 1 Nov 2026
  // Data historis (Agustus-Oktober) JANGAN di-penalty
  const CREDIT_SYSTEM_START = new Date('2026-11-01T00:00:00+07:00')

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(
      'id, scheduled_at, tutor_ready_at, student_ready_at, tutor_id, student_id, match_id, status, cancelled_at, moved_at'
    )
    .eq('status', 'scheduled')
    .is('cancelled_at', null)
    .is('completed_at', null)
    .is('moved_at', null)
    .lt('scheduled_at', cutoff.toISOString())
    .gte('scheduled_at', CREDIT_SYSTEM_START.toISOString())  // ⬅️ BARU

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({
      expired: 0,
      penalized: 0,
      message: 'No hanging sessions',
    })
  }

  let expired = 0
  let penalized = 0
  const details: any[] = []

  for (const s of sessions) {
    // Guard race dengan ready endpoint
    const { error: updErr } = await supabase
      .from('sessions')
      .update({ status: 'cancelled', cancelled_at: now.toISOString() })
      .eq('id', s.id)
      .eq('status', 'scheduled')

    if (updErr) continue
    expired++

    // Cek apakah udah pernah di-penalty (biar gak dobel)
    const { data: existingLog } = await supabase
      .from('credit_log')
      .select('id')
      .eq('ref_id', s.id)
      .eq('reason', 'session_expired')
      .limit(1)

    if (existingLog && existingLog.length > 0) {
      // Udah pernah di-penalty, skip
      continue
    }

    const tasks: Promise<any>[] = []

    // Tutor gak klik Siap → -7
    if (!s.tutor_ready_at) {
      tasks.push(
        adjustCredit({
          profileId: s.tutor_id,
          role: 'tutor',
          delta: DELTA.session_expired,
          reason: 'session_expired',
          refId: s.id,
        })
      )
    }

    // Student gak klik Siap → -7
    if (!s.student_ready_at) {
      tasks.push(
        adjustCredit({
          profileId: s.student_id,
          role: 'student',
          delta: DELTA.session_expired,
          reason: 'session_expired',
          refId: s.id,
        })
      )
    }

    if (tasks.length) {
      const results = await Promise.all(tasks)
      penalized += results.filter((r) => r.ok).length
    }

    details.push({
      sessionId: s.id,
      tutorPenalized: !s.tutor_ready_at,
      studentPenalized: !s.student_ready_at,
    })
  }

  return NextResponse.json({
    expired,
    penalized,
    details,
    timestamp: now.toISOString(),
  })
}