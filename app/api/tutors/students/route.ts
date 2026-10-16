import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Konstanta
const MAX_PENDING_OFFERS = 5    // untuk tier 26-80 (efek bertumpuk)
const AMAN_THRESHOLD = 81        // tier Aman unlimited

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

    // 1. Ambil students eligible (>= 26, exclude Bahaya & Blacklist)
    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, grade_level, subjects, budget_per_month, sessions_per_month, preferred_schedule, address, avatar_url, latitude, longitude, is_online, credit_score')
      .gte('credit_score', 26)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ students: [] })
    }

    // 2. Hitung pending matches per student
    const studentIds = students.map(s => s.id)
    const { data: pendingMatches } = await supabase
      .from('matches')
      .select('student_id')
      .in('student_id', studentIds)
      .eq('status', 'pending')

    const pendingCountMap: Record<string, number> = {}
    ;(pendingMatches || []).forEach((m: any) => {
      pendingCountMap[m.student_id] = (pendingCountMap[m.student_id] || 0) + 1
    })

    // 3. Filter berdasarkan tier
    const filtered = students.filter((s: any) => {
      const score = Number(s.credit_score ?? 99)
      const pending = pendingCountMap[s.id] || 0

      // Tier Aman (81-100): unlimited
      if (score >= AMAN_THRESHOLD) return true

      // Tier 26-80: max 5 pending
      return pending < MAX_PENDING_OFFERS
    })

    return NextResponse.json(
      { students: filtered },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (err) {
    console.error('[tutors/students]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}