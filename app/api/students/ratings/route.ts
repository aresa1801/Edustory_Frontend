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

    // 2. Query matches yang punya rating
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id, subject, student_rating, student_review, updated_at,
        tutors:tutor_id(user_profiles:user_id(name))
      `)
      .eq('student_id', student.id)
      .not('student_rating', 'is', null)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const ratings = (matches || []).map((m: any) => ({
      matchId: m.id,
      tutorName: m.tutors?.user_profiles?.name || 'Tutor',
      subject: m.subject || '-',
      rating: m.student_rating,
      review: m.student_review,
      ratedAt: m.updated_at,
    }))

    return NextResponse.json(
      { ratings },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (err) {
    console.error('[students/ratings]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}