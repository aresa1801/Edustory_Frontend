import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
    const body = await req.json()
    const { rating, comment } = body

    if (
      typeof rating !== 'number' ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        { error: 'Rating harus 1-5' },
        { status: 400 }
      )
    }

    // Ambil match_schedule
    const { data: schedule, error: sErr } = await supabaseAdmin
      .from('match_schedules')
      .select(`
        id,
        tutor_id,
        student_id,
        ulasan,
        matches!inner(
          student_full_name,
          student_avatar
        )
      `)
      .eq('match_id', matchId)
      .single()

    if (sErr || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    const matchData = (schedule as any).matches

    const newReview = {
      match_id: matchId,
      student_id: schedule.student_id,
      student_name: matchData?.student_full_name || 'Siswa',
      student_avatar: matchData?.student_avatar || null,
      rating,
      comment: comment || '',
      created_at: new Date().toISOString(),
    }

    const currentUlasan = Array.isArray(schedule.ulasan)
      ? schedule.ulasan
      : []
    const updatedUlasan = [...currentUlasan, newReview]

    // Update ulasan di match_schedules
    const { error: updateErr } = await supabaseAdmin
      .from('match_schedules')
      .update({ ulasan: updatedUlasan })
      .eq('id', schedule.id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Recalculate rating & total_reviews tutor
    const { data: allSchedules } = await supabaseAdmin
      .from('match_schedules')
      .select('ulasan')
      .eq('tutor_id', schedule.tutor_id)

    const allReviews: any[] = []
    ;(allSchedules || []).forEach((s: any) => {
      if (Array.isArray(s.ulasan)) {
        s.ulasan.forEach((r: any) => allReviews.push(r))
      }
    })

    const totalReviews = allReviews.length
    const avgRating =
      totalReviews > 0
        ? allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
          totalReviews
        : 0

    await supabaseAdmin
      .from('tutors')
      .update({
        rating: Math.round(avgRating * 10) / 10,
        total_reviews: totalReviews,
      })
      .eq('id', schedule.tutor_id)

    return NextResponse.json({
      success: true,
      review: newReview,
      tutor_rating: avgRating,
      tutor_total_reviews: totalReviews,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}