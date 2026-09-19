import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/security/sanitize'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { tutorId: string } }
) {
  try {
    const { tutorId } = params

    if (!isValidUUID(tutorId)) {
      return NextResponse.json({ error: 'tutorId tidak valid' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Query reviews + join matches (filter tutor) + students (nama)
    const { data: reviews, error } = await supabaseAdmin
      .from('reviews')
      .select(`
        id,
        match_id,
        rating,
        comment,
        created_at,
        matches!inner(tutor_id),
        students!inner(full_name)
      `)
      .eq('matches.tutor_id', tutorId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[tutor reviews GET] error:', error)
      return NextResponse.json({ error: 'Gagal memuat reviews' }, { status: 500 })
    }

    // Map ke format yang dipakai frontend
    const mapped = (reviews || []).map((r: any) => ({
      id: r.id,
      match_schedule_id: r.match_id,   // supaya cocok dengan key di frontend
      student_name: r.students?.full_name || 'Siswa',
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