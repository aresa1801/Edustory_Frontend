import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // ===== Auth check =====
  const authHeader = req.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()

    // ===== 1. Ambil semua session ongoing =====
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select('id, started_at, duration_minutes, match_id')
      .eq('status', 'ongoing')
      .not('started_at', 'is', null)
      .is('completed_at', null)

    if (error) {
      console.error('[CRON] fetch sessions error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ===== 2. Cek mana yang sudah lewat durasi =====
    const toComplete: { id: string; exactCompleteAt: string; matchId: string }[] = []

    for (const s of sessions || []) {
      const startMs = new Date(s.started_at).getTime()
      const durationMs = (s.duration_minutes || 60) * 60 * 1000
      const deadlineMs = startMs + durationMs

      if (now.getTime() >= deadlineMs) {
        toComplete.push({
          id: s.id,
          exactCompleteAt: new Date(deadlineMs).toISOString(),
          matchId: s.match_id,
        })
      }
    }

    if (toComplete.length === 0) {
      return NextResponse.json({
        sessionsCompleted: 0,
        matchesCompleted: 0,
        message: 'Tidak ada session yang perlu di-complete',
      })
    }

    // ===== 3. Update session → completed =====
    let sessionCount = 0
    for (const item of toComplete) {
      const { error: updateErr } = await supabaseAdmin
        .from('sessions')
        .update({
          status: 'completed',
          completed_at: item.exactCompleteAt,
        })
        .eq('id', item.id)

      if (updateErr) {
        console.error('[CRON] session update error:', item.id, updateErr)
      } else {
        sessionCount++
      }
    }

    // ===== 4. Cek match yang semua sessionnya selesai → auto-complete =====
    const matchIds = [...new Set(toComplete.map((s) => s.matchId))]
    let matchCompletedCount = 0

    for (const matchId of matchIds) {
      const { data: allSessions } = await supabaseAdmin
        .from('sessions')
        .select('id, started_at, cancelled_at, completed_at, duration_minutes')
        .eq('match_id', matchId)

      if (!allSessions || allSessions.length === 0) continue

      const allDone = allSessions.every((s: any) => {
        if (s.cancelled_at || s.completed_at) return true
        if (s.started_at) {
          const startMs = new Date(s.started_at).getTime()
          const durationMs = (s.duration_minutes || 60) * 60 * 1000
          return now.getTime() >= startMs + durationMs
        }
        return false
      })

      if (!allDone) continue

      const { data: schedule } = await supabaseAdmin
        .from('match_schedules')
        .select('id, status, termination_request')
        .eq('match_id', matchId)
        .maybeSingle()

      if (!schedule) continue
      if (schedule.status === 'completed') continue
      if (schedule.termination_request) continue

      await supabaseAdmin
        .from('match_schedules')
        .update({
          status: 'completed',
          completion_notification: {
            type: 'natural',
            at: now.toISOString(),
          },
        })
        .eq('id', schedule.id)

      await supabaseAdmin
        .from('matches')
        .update({ status: 'completed', ended_at: now.toISOString() })
        .eq('id', matchId)

      matchCompletedCount++
    }

    console.log(
      `[CRON auto-complete] Sessions: ${sessionCount}, Matches: ${matchCompletedCount}`
    )

    return NextResponse.json({
      sessionsCompleted: sessionCount,
      matchesCompleted: matchCompletedCount,
      timestamp: now.toISOString(),
    })
  } catch (err) {
    console.error('[CRON auto-complete] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}