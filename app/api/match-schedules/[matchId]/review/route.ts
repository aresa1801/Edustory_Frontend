import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID, sanitizeText } from '@/lib/security/sanitize'

export const dynamic = 'force-dynamic'

const COMMENT_MAX_LENGTH = 1000

// ============================================================
// POST — Submit review (hanya student, hanya 1x per match)
// ============================================================
export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { matchId } = params

    // 1. Validasi UUID matchId
    if (!isValidUUID(matchId)) {
      return NextResponse.json({ error: 'matchId tidak valid' }, { status: 400 })
    }

    // 2. Parse body
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body JSON tidak valid' }, { status: 400 })
    }

    const { user_id, rating, comment } = body ?? {}

    // 3. Validasi user_id
    if (!isValidUUID(user_id)) {
      return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
    }

    // 4. Validasi rating
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating harus berupa angka bulat 1-5' },
        { status: 400 }
      )
    }

    // 5. Sanitize comment (opsional)
    let cleanComment: string | null = null
    if (comment != null && comment !== '') {
      if (typeof comment !== 'string') {
        return NextResponse.json({ error: 'Comment harus teks' }, { status: 400 })
      }
      const sanitized = sanitizeText(comment, COMMENT_MAX_LENGTH)
      if (!sanitized.ok) {
        return NextResponse.json(
          { error: sanitized.error || 'Comment tidak valid' },
          { status: 400 }
        )
      }
      cleanComment = sanitized.sanitized
    }

    // 6. Resolve user_id → students.id
    const { data: student, error: studentErr } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (studentErr || !student) {
      return NextResponse.json({ error: 'Student tidak ditemukan' }, { status: 404 })
    }

    // 7. Ambil match + verify ownership + status
    const { data: match, error: matchErr } = await supabaseAdmin
      .from('matches')
      .select('id, student_id, tutor_id, status, contract_end_date')
      .eq('id', matchId)
      .single()

    if (matchErr || !match) {
      return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 })
    }

    if (match.student_id !== student.id) {
      return NextResponse.json(
        { error: 'Kamu tidak punya akses ke match ini' },
        { status: 403 }
      )
    }

    // 8. Cek kontrak sudah selesai (2 kondisi: status completed ATAU lewat tanggal)
    const isCompleted = match.status === 'completed'
    const isExpired = match.contract_end_date
      ? new Date(match.contract_end_date) < new Date()
      : false

    if (!isCompleted && !isExpired) {
      return NextResponse.json(
        { error: 'Kontrak belum selesai. Review hanya bisa dilakukan setelah kontrak berakhir.' },
        { status: 400 }
      )
    }

    // 9. Cek belum pernah review match ini
    const { data: existingReview } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('match_id', matchId)
      .maybeSingle()

    if (existingReview) {
      return NextResponse.json(
        { error: 'Kamu sudah pernah memberikan review untuk kontrak ini' },
        { status: 400 }
      )
    }

    // 10. Insert review
    const { error: insertErr } = await supabaseAdmin
      .from('reviews')
      .insert({
        match_id: matchId,
        student_id: student.id,
        rating,
        comment: cleanComment,
      })

    if (insertErr) {
      console.error('[review POST] insert error:', insertErr)
      return NextResponse.json(
        { error: 'Gagal menyimpan review' },
        { status: 500 }
      )
    }

    // 11. Recalculate rating tutor dari tabel reviews
    const { data: allReviews, error: aggErr } = await supabaseAdmin
      .from('reviews')
      .select('rating, matches!inner(tutor_id)')
      .eq('matches.tutor_id', match.tutor_id)

    if (aggErr) {
      console.error('[review POST] aggregate error:', aggErr)
      // Insert sudah sukses, kita return sukses walau recalc gagal
      return NextResponse.json({ success: true, warning: 'Review tersimpan, gagal update rating' })
    }

    const totalReviews = allReviews?.length || 0
    const avgRating = totalReviews > 0
      ? Number(
          (allReviews!.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews).toFixed(1)
        )
      : 0

    // 12. Update tutors.rating & total_reviews
    const { error: updateTutorErr } = await supabaseAdmin
      .from('tutors')
      .update({
        rating: avgRating,
        total_reviews: totalReviews,
      })
      .eq('id', match.tutor_id)

    if (updateTutorErr) {
      console.error('[review POST] update tutor error:', updateTutorErr)
      return NextResponse.json({ success: true, warning: 'Review tersimpan, gagal update rating tutor' })
    }

    return NextResponse.json({
      success: true,
      review: { rating, comment: cleanComment },
      tutor_rating: avgRating,
      tutor_total_reviews: totalReviews,
    })
  } catch (err) {
    console.error('[review POST] unexpected error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}