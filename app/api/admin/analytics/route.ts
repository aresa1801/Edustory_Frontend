import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = admin()
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const count = async (table: string, apply?: (q: any) => any) => {
    let query = supabase.from(table).select('*', { count: 'exact', head: true })
    if (apply) query = apply(query)
    const { count: value } = await query
    return value ?? 0
  }

  const [
    students, tutors, approvedTutors, pendingTutors,
    matchesTotal, matchesActive, matchesCompleted,
    sessionsMonth, payments, wallets, withdrawalsPending,
    feedback, recentUsers, matchesRows, ratingRows,
  ] = await Promise.all([
    count('students'),
    count('tutors'),
    count('tutors', (q) => q.eq('approval_status', 'approved')),
    count('tutors', (q) => q.eq('approval_status', 'pending')),
    count('matches'),
    count('matches', (q) => q.in('status', ['matched', 'active'])),
    count('matches', (q) => q.eq('status', 'completed')),
    count('match_schedules', (q) => q.gte('created_at', monthStart.toISOString())),
    supabase.from('payment_deposits').select('amount, payment_status, paid_at, created_at'),
    supabase.from('wallets').select('balance, student_id, tutor_id'),
    supabase.from('withdrawals').select('id, amount, status, created_at').eq('status', 'pending'),
    supabase.from('analytics_feedback').select('id, role, user_name, category, message, status, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('user_profiles').select('id, name, role, created_at').order('created_at', { ascending: false }).limit(6),
    supabase.from('matches').select('subject, matched_subjects, created_at, status').limit(1000),
    supabase.from('matches').select('student_rating').not('student_rating', 'is', null).limit(1000),
  ])

  const paid = (payments.data ?? []).filter((row: any) => row.payment_status === 'paid')
  const revenueTotal = paid.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0)
  const revenueMonth = paid
    .filter((row: any) => new Date(row.paid_at ?? row.created_at).getTime() >= monthStart.getTime())
    .reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0)

  const walletTotal = (wallets.data ?? []).reduce((sum: number, row: any) => sum + Number(row.balance ?? 0), 0)

  const subjectCount = new Map<string, number>()
  for (const row of matchesRows.data ?? []) {
    const subjects = Array.isArray(row.matched_subjects) && row.matched_subjects.length > 0
      ? row.matched_subjects
      : row.subject ? [row.subject] : []
    for (const subject of subjects) subjectCount.set(subject, (subjectCount.get(subject) ?? 0) + 1)
  }
  const topSubjects = [...subjectCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([subject, total]) => ({ subject, total }))

  const ratings = (ratingRows.data ?? []).map((row: any) => Number(row.student_rating)).filter((value) => value > 0)
  const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null

  const growth: { date: string; users: number; matches: number }[] = []
  for (let index = 6; index >= 0; index -= 1) {
    const day = new Date()
    day.setDate(day.getDate() - index)
    day.setHours(0, 0, 0, 0)
    const next = new Date(day)
    next.setDate(next.getDate() + 1)
    const label = day.toISOString().slice(0, 10)
    growth.push({
      date: label,
      users: (recentUsers.data ?? []).filter((row: any) => new Date(row.created_at) >= day && new Date(row.created_at) < next).length,
      matches: (matchesRows.data ?? []).filter((row: any) => new Date(row.created_at) >= day && new Date(row.created_at) < next).length,
    })
  }

  const feedbackRows = feedback.error ? [] : (feedback.data ?? [])

  return NextResponse.json({
    stats: {
      students, tutors, approvedTutors, pendingTutors,
      matchesTotal, matchesActive, matchesCompleted,
      sessionsMonth,
      revenueTotal, revenueMonth,
      walletTotal,
      avgRating,
      pendingWithdrawals: (withdrawalsPending.data ?? []).length,
      pendingWithdrawalAmount: (withdrawalsPending.data ?? []).reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0),
      newFeedback: feedbackRows.filter((row: any) => row.status === 'new').length,
    },
    topSubjects,
    growth,
    recentUsers: recentUsers.data ?? [],
    feedback: feedbackRows,
    feedbackAvailable: !feedback.error,
  })
}
