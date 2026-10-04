import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/security/sanitize'
import { getCreditTier } from '@/lib/credit'

export const dynamic = 'force-dynamic'

function anonymizeName(name: string | null | undefined): string {
  if (!name) return 'Anonim'
  const t = name.trim()
  if (!t) return 'Anonim'
  return `${t.charAt(0).toUpperCase()}***`
}

export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get('user_id')
    if (!isValidUUID(userId)) {
      return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ===== 1. Tutor =====
    const { data: tutor, error: tutorErr } = await supabase
      .from('tutors')
      .select('id, rating, total_reviews, credit_score, suspended_until')
      .eq('user_id', userId)
      .maybeSingle()

    if (tutorErr) {
      return NextResponse.json({ error: tutorErr.message }, { status: 500 })
    }
    if (!tutor) {
      return NextResponse.json({ error: 'Tutor tidak ditemukan' }, { status: 404 })
    }

    const creditScore = Number(tutor.credit_score ?? 99)
    const tier = getCreditTier(creditScore)
    const suspendedUntil: string | null = tutor.suspended_until ?? null
    const isSuspended =
      !!suspendedUntil && new Date(suspendedUntil).getTime() > Date.now()

    // ===== 2. Reviews (via matches) =====
    const { data: reviewRows } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        matches!inner(tutor_id, student_full_name)
      `)
      .eq('matches.tutor_id', tutor.id)
      .order('created_at', { ascending: false })
      .limit(100)

    const reviews = (reviewRows || []).map((r: any) => ({
      id: r.id,
      rating: r.rating ?? 0,
      comment: r.comment ?? null,
      createdAt: r.created_at,
      studentName: anonymizeName(r.matches?.student_full_name),
    }))

    // ===== 3. Credit log =====
    const { data: logRows } = await supabase
      .from('credit_log')
      .select('id, delta, balance_after, reason, created_at')
      .eq('user_id', userId)
      .eq('role', 'tutor')
      .order('created_at', { ascending: false })
      .limit(50)

    const creditLog = (logRows || []).map((r) => ({
      id: r.id,
      delta: r.delta,
      balanceAfter: r.balance_after,
      reason: r.reason,
      createdAt: r.created_at,
    }))

    return NextResponse.json({
      profileId: tutor.id,
      creditScore,
      tier: tier.id,
      tierLabel: tier.label,
      suspendedUntil,
      isSuspended,
      rating: Number(tutor.rating ?? 0),
      totalReviews: Number(tutor.total_reviews ?? 0),
      reviews,
      creditLog,
    })
  } catch (err) {
    console.error('[tutor/analytics]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}