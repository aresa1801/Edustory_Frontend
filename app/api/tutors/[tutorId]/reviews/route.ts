import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { tutorId: string } }
) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { tutorId } = params

    // Ambil semua match_schedules dengan tutor_id tersebut + kolom ulasan
    const { data: schedules, error } = await supabaseAdmin
      .from('match_schedules')
      .select('id, ulasan')
      .eq('tutor_id', tutorId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten semua ulasan dari semua match_schedules
    const allReviews: any[] = []
    ;(schedules || []).forEach((s: any) => {
      if (Array.isArray(s.ulasan)) {
        s.ulasan.forEach((r: any) => {
          allReviews.push({ ...r, match_schedule_id: s.id })
        })
      }
    })

    // Sort terbaru dulu
    allReviews.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    )

    return NextResponse.json({ reviews: allReviews })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}