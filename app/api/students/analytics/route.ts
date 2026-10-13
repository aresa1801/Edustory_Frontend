import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/security/sanitize'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get('user_id')
    if (!isValidUUID(userId)) {
      return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
        },
      }
    )

    // 1. Cari student.id
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!student) {
      return NextResponse.json({ error: 'Student tidak ditemukan' }, { status: 404 })
    }

    // 2. Hitung stats paralel
    const [totalSessionsRes, completedSessionsRes, activeTutorsRes] = await Promise.all([
      // Total Sesi
      supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', student.id),

      // Sesi Selesai
      supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', student.id)
        .eq('status', 'completed'),

      // Tutor Aktif (kontrak aktif)
      supabase
        .from('match_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', student.id)
        .eq('status', 'active'),
    ])

    return NextResponse.json(
      {
        stats: {
          totalSessions: totalSessionsRes.count || 0,
          completedSessions: completedSessionsRes.count || 0,
          activeTutors: activeTutorsRes.count || 0,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (err) {
    console.error('[students/analytics]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}