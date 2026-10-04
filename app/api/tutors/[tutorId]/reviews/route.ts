import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/security/sanitize'

export const dynamic = 'force-dynamic'

function anonymizeName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return 'Anonim'
  const trimmed = name.trim()
  if (trimmed.length === 0) return 'Anonim'
  const first = trimmed.charAt(0).toUpperCase()
  return `${first}***`
}

export async function GET(
  req: NextRequest,
  { params }: { params: { tutorId: string } }
) {
  try {
    const { tutorId } = params
    if (!isValidUUID(tutorId)) {
      return NextResponse.json({ error: 'tutorId tidak valid' }, { status: 400 })
    }

    // ⬇️ BARU: raw mode (untuk tutor view sendiri)
    const raw = new URL(req.url).searchParams.get('raw') === 'true'

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: reviews, error } = await supabaseAdmin
      .from('reviews')
      .select(`
        id,
        match_id,
        rating,
        comment,
        created_at,
        matches!inner(tutor_id, student_full_name)
      `)
      .eq('matches.tutor_id', tutorId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[tutor reviews GET] error:', error)
      return NextResponse.json({ error: 'Gagal memuat ulasan' }, { status: 500 })
    }

    const mapped = (reviews || []).map((r: any) => {
      const fullName = r.matches?.student_full_name
      return {
        id: r.id,
        match_schedule_id: r.match_id,
        match_id: r.match_id,
        student_name: raw ? (fullName || 'Anonim') : anonymizeName(fullName),
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      }
    })

    return NextResponse.json({ reviews: mapped })
  } catch (err) {
    console.error('[tutor reviews GET] unexpected:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}