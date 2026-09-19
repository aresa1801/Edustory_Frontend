import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/security/sanitize'

export const dynamic = 'force-dynamic'

// ============================================================
// HELPER — Anonimkan nama: "Haikal Wardana" → "H***"
// ============================================================
function anonymizeName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return 'Anonim'
  const trimmed = name.trim()
  if (trimmed.length === 0) return 'Anonim'
  const first = trimmed.charAt(0).toUpperCase()
  return `${first}***`
}

// ============================================================
// GET — List reviews untuk tutor tertentu
// ============================================================
export async function GET(
  req: NextRequest,
  { params }: { params: { tutorId: string } }
) {
  try {
    const { tutorId } = params

    // 1. Validasi UUID
    if (!isValidUUID(tutorId)) {
      return NextResponse.json({ error: 'tutorId tidak valid' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Query reviews + join matches (filter tutor) + students (nama)
    const { data: reviews, error } = await supabaseAdmin
      .from('reviews')
      .select(`
        id,
        match_id,
        rating,
        comment,
        created_at,
        matches!inner(tutor_id),
        students!inner(name)
      `)
      .eq('matches.tutor_id', tutorId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[tutor reviews GET] error:', error)
      return NextResponse.json(
        { error: 'Gagal memuat ulasan' },
        { status: 500 }
      )
    }

    // 3. Map ke format yang dipakai frontend + anonimkan nama
    const mapped = (reviews || []).map((r: any) => ({
      id: r.id,
      match_schedule_id: r.match_id,   // biar cocok dgn key yg dipakai frontend
      student_name: anonymizeName(r.students?.name),   // ← "H***"
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
    }))

    return NextResponse.json({ reviews: mapped })
  } catch (err) {
    console.error('[tutor reviews GET] unexpected:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}