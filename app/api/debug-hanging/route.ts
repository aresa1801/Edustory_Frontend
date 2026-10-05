import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const READY_WINDOW_MINUTES = 20

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const cutoff = new Date(now.getTime() - READY_WINDOW_MINUTES * 60 * 1000)

  // Query PERSIS sama dengan cron
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(
      'id, scheduled_at, status, cancelled_at, completed_at, moved_at, tutor_ready_at, student_ready_at'
    )
    .eq('status', 'scheduled')
    .is('cancelled_at', null)
    .is('completed_at', null)
    .is('moved_at', null)
    .lt('scheduled_at', cutoff.toISOString())

  // Cek juga tanpa filter waktu biar keliatan bedanya
  const { data: allScheduled } = await supabase
    .from('sessions')
    .select('id, scheduled_at, status, cancelled_at, moved_at')
    .eq('status', 'scheduled')
    .is('cancelled_at', null)
    .is('moved_at', null)
    .order('scheduled_at', { ascending: false })
    .limit(10)

  return NextResponse.json(
    {
      now_utc: now.toISOString(),
      cutoff_utc: cutoff.toISOString(),
      ready_window_minutes: READY_WINDOW_MINUTES,
      sessions_yang_harusnya_ke_detect: sessions,
      query_error: error?.message ?? null,
      semua_scheduled_sessions_10_terakhir: allScheduled,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}