import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  noStore()
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
        },
      }
    )

    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, grade_level, subjects, budget_per_month, sessions_per_month, preferred_schedule, address, avatar_url, latitude, longitude, is_online, credit_score')
      .gte('credit_score', 26)   // ⬅️ BARU: exclude tier Bahaya (6-25) & Blacklist (0-5)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { students: students || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}