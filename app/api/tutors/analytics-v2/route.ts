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

    // ===== 2. Semua matches tutor (untuk total murid + filter contract_history) =====
    const { data: tutorMatches } = await supabase
      .from('matches')
      .select('id, student_id, status')
      .eq('tutor_id', tutor.id)

    const matchIds = (tutorMatches || []).map((m) => m.id)

    // Total murid = unique student_id dari matches status 'completed' atau 'matched'
    const studentIdSet = new Set<string>()
    for (const m of tutorMatches || []) {
      if (['completed', 'matched'].includes(m.status) && m.student_id) {
        studentIdSet.add(m.student_id)
      }
    }
    const totalStudents = studentIdSet.size

    // ===== 3. Stats paralel =====
    const [
      activeContractsRes,
      sessionsCompletedRes,
      sessionsMissedRes,
      completedSchedulesRes,
    ] = await Promise.all([
      // Kontrak aktif → match_schedules status 'active'
      supabase
        .from('match_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('tutor_id', tutor.id)
        .eq('status', 'active'),

      // Sesi selesai → sessions status 'completed'
      supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('tutor_id', tutor.id)
        .eq('status', 'completed'),

      // Sesi hangus → sessions status 'cancelled' DAN moved_at NULL
      supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('tutor_id', tutor.id)
        .eq('status', 'cancelled')
        .is('moved_at', null),

      // Kontrak selesai dari match_schedules
      supabase
        .from('match_schedules')
        .select('match_id')
        .eq('tutor_id', tutor.id)
        .eq('status', 'completed'),
    ])

    // Kontrak selesai dari contract_history (hanya jika ada matches)
    const completedHistoryRes = matchIds.length > 0
      ? await supabase
          .from('contract_history')
          .select('match_id')
          .in('match_id', matchIds)
          .not('completion_type', 'is', null)
      : { data: [] as { match_id: string }[] }

    const activeContracts = activeContractsRes.count || 0
    const sessionsCompleted = sessionsCompletedRes.count || 0
    const sessionsMissed = sessionsMissedRes.count || 0

    // Kontrak selesai = UNION unique match_id dari 2 sumber
    const completedMatchIdSet = new Set<string>()
    for (const s of completedSchedulesRes.data || []) {
      if (s.match_id) completedMatchIdSet.add(s.match_id)
    }
    for (const h of completedHistoryRes.data || []) {
      if (h.match_id) completedMatchIdSet.add(h.match_id)
    }
    const completedContracts = completedMatchIdSet.size

    // ===== 4. Reviews =====
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

    // ===== 5. Credit log =====
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

    return NextResponse.json(
      {
        _marker: 'V2_BUILD_' + Date.now(), 
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
        stats: {
          totalStudents,
          activeContracts,
          sessionsCompleted,
          sessionsMissed,
          completedContracts,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (err) {
    console.error('[tutor/analytics]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}