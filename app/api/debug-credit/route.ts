import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const userId = '12ec1818-8c38-4b9d-8142-56ee80ce566c'

  const { data: tutor, error: tutorErr } = await supabase
    .from('tutors')
    .select('id, credit_score, last_login_reward_at')
    .eq('user_id', userId)
    .maybeSingle()

  const { data: logs, error: logErr } = await supabase
    .from('credit_log')
    .select('id, reason, created_at')
    .eq('user_id', userId)
    .eq('role', 'tutor')
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json(
    {
      now: new Date().toISOString(),
      tutor,
      tutorErr: tutorErr?.message ?? null,
      logCount: logs?.length ?? 0,
      logs,
      logErr: logErr?.message ?? null,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    }
  )
}