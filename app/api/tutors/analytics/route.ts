import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/security/sanitize'
import { getCreditTier } from '@/lib/credit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')

    if (!isValidUUID(userId)) {
      return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ===== 1. Tutor base =====
    const { data: tutor, error: tutorErr } = await supabase
      .from('tutors')
      .select(
        'id, user_id, rating, total_reviews, credit_score, suspended_until, hourly_rate'
      )
      .eq('user_id', userId)
      .maybeSingle()

    if (tutorErr) {
      return NextResponse.json({ error: tutorErr.message }, { status: 500 })
    }
    if (!tutor) {
      return NextResponse.json({ error: 'Tutor tidak ditemukan' }, { status: 404 })
    }

    const tutorId = tutor.id
    const creditScore = Number(tutor.credit_score ?? 99)
    const suspendedUntil: string | null = tutor.suspended_until ?? null
    const isSuspended =
      !!suspendedUntil && new Date(suspendedUntil).getTime() > Date.now()
    const tier = getCreditTier(creditScore)

    // ===== 2. Match stats =====
    const { data: matchRows } = await supabase
      .from('matches')
      .select(
        'id, status, student_rating, student_review, student_id, updated_at'
      )
      .eq('tutor_id', tutorId)

    const matches = matchRows || []
    const completedContracts = matches.filter((m) => m.status === 'completed').length
    const activeContracts = matches.filter((m) =>
      ['matched', 'active'].includes(m.status)
    ).length

    const uniqueStudentIds = new Set(
      matches.map((m) => m.student_id).filter(Boolean) as string[]
    )
    const totalStudents = uniqueStudentIds.size

    // ===== 3. Session stats =====
    const { data: sessionRows } = await supabase
      .from('sessions')
      .select('id, status, started_at, completed_at')
      .eq('tutor_id', tutorId)

    const sessions = sessionRows || []
    const sessionsCompleted = sessions.filter((s) => s.status === 'completed').length

    // Sesi hangus — dari credit_log (paling akurat)
    const { count: sessionsMissed } = await supabase
      .from('credit_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role', 'tutor')
      .eq('reason', 'session_expired')

    // ===== 4. Earnings =====
    const { data: earningsRows } = await supabase
      .from('wallet_transactions')
      .select('amount, created_at')
      .eq('tutor_id', tutorId)
      .eq('type', 'session_earning')
      .eq('status', 'completed')

    const earnings = earningsRows || []
    const totalEarnings = earnings.reduce(
      (s, r) => s + Number(r.amount || 0),
      0
    )

    const now = new Date()
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    ).toISOString()
    const monthlyEarnings = earnings
      .filter((r) => r.created_at && r.created_at >= monthStart)
      .reduce((s, r) => s + Number(r.amount || 0), 0)

    const avgPerContract =
      completedContracts > 0
        ? Math.round(totalEarnings / completedContracts)
        : 0

    // ===== 5. Credit log =====
    const { data: creditLogRows } = await supabase
      .from('credit_log')
      .select('id, delta, balance_after, reason, ref_id, created_at')
      .eq('user_id', userId)
      .eq('role', 'tutor')
      .order('created_at', { ascending: false })
      .limit(50)

    // ===== 6. Reviews (anonim) =====
    const reviewedMatches = matches
      .filter((m) => m.student_rating != null)
      .sort((a, b) => {
        const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0
        const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0
        return tb - ta
      })
      .slice(0, 20)

    // Map student_id → label anonim, konsisten dalam 1 response
    const maskMap = new Map<string, string>()
    let letterIdx = 0
    const labelOf = (sid: string) => {
      if (!maskMap.has(sid)) {
        const letter = String.fromCharCode(65 + (letterIdx % 26))
        const suffix = letterIdx >= 26 ? String(Math.floor(letterIdx / 26)) : ''
        maskMap.set(sid, `Siswa ${letter}${suffix}`)
        letterIdx++
      }
      return maskMap.get(sid)!
    }

    const reviews = reviewedMatches.map((m) => ({
      id: m.id,
      rating: m.student_rating,
      comment: m.student_review,
      createdAt: m.updated_at,
      maskedName: m.student_id ? labelOf(m.student_id) : 'Siswa Anonim',
    }))

    return NextResponse.json({
      tutor: {
        id: tutorId,
        rating: Number(tutor.rating ?? 0),
        totalReviews: Number(tutor.total_reviews ?? 0),
        creditScore,
        suspendedUntil,
        isSuspended,
        tier: tier.id,
        tierLabel: tier.label,
      },
      stats: {
        totalStudents,
        activeStudents: activeContracts,
        completedContracts,
        sessionsCompleted,
        sessionsMissed: sessionsMissed || 0,
        totalEarnings,
        monthlyEarnings,
        avgPerContract,
      },
      creditLog: (creditLogRows || []).map((r) => ({
        id: r.id,
        delta: r.delta,
        balanceAfter: r.balance_after,
        reason: r.reason,
        refId: r.ref_id,
        createdAt: r.created_at,
      })),
      reviews,
    })
  } catch (err) {
    console.error('[tutor/analytics]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}