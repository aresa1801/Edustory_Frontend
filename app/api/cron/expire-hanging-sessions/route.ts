import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { adjustCredit, DELTA } from '@/lib/credit'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const READY_WINDOW_MINUTES = 20

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  )

  const now = new Date()
  const cutoff = new Date(now.getTime() - READY_WINDOW_MINUTES * 60 * 1000)

  // Cutoff: sistem credit cuma berlaku untuk session >= 1 Okt 2026
  const CREDIT_SYSTEM_START = new Date('2026-10-01T00:00:00+07:00')

  // ============================================================
  // FIX 1: Tambah `.not('match_id', 'is', null)` biar skip orphan
  // FIX 2: Join ke `matches` untuk cek status match & ownership
  // ============================================================
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(`
      id, scheduled_at, tutor_ready_at, student_ready_at,
      tutor_id, student_id, match_id, status, cancelled_at, moved_at,
      matches!inner(id, status, tutor_id, student_id)
    `)
    .eq('status', 'scheduled')
    .is('cancelled_at', null)
    .is('completed_at', null)
    .is('moved_at', null)
    .not('match_id', 'is', null)                              // ⬅️ BARU: skip orphan
    .lt('scheduled_at', cutoff.toISOString())
    .gte('scheduled_at', CREDIT_SYSTEM_START.toISOString())

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

  // ============================================================
  // FIX 3: Filter tambahan — cuma proses session yang match-nya valid
  // ============================================================
  const validSessions = (sessions || []).filter((s: any) => {
    const match = s.matches
    if (!match) return false                          // match gak ada (safety)
    if (match.status !== 'active') return false       // match udah selesai/cancel
    if (match.tutor_id !== s.tutor_id) return false   // mismatch tutor
    if (match.student_id !== s.student_id) return false // mismatch student
    return true
  })

  if (validSessions.length === 0) {
    return NextResponse.json({
      expired: 0,
      penalized: 0,
      message: 'No hanging sessions (setelah filter match valid)',
    })
  }

  let expired = 0
  let penalized = 0
  const details: any[] = []

  // ============================================================
  // Loop pakai validSessions (bukan sessions)
  // ============================================================
  for (const s of validSessions) {
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