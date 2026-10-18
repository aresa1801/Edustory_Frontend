import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const todayISO = startOfDay.toISOString()

    const count = async (table: string, apply?: (q: any) => any) => {
      let q = supabase.from(table).select('*', { count: 'exact', head: true })
      if (apply) q = apply(q)
      const { count: value } = await q
      return value ?? 0
    }

    const [
      totalUsers,
      totalStudents,
      totalTutors,
      pendingTutors,
      approvedTutors,
      rejectedTutors,
      totalMatches,
      activeMatches,
      completedMatches,
      totalPrograms,
      onlineStudents,
      newUsersToday,
      sessionsToday,
      { data: paidToday },
      { data: recentTutorData },
    ] = await Promise.all([
      count('user_profiles'),
      count('students'),
      count('tutors'),
      count('tutors', (q) => q.eq('approval_status', 'pending')),
      count('tutors', (q) => q.eq('approval_status', 'approved')),
      count('tutors', (q) => q.eq('approval_status', 'rejected')),
      count('matches'),
      count('matches', (q) => q.in('status', ['matched', 'active'])),
      count('matches', (q) => q.eq('status', 'completed')),
      count('programs'),
      count('students', (q) => q.eq('is_online', true)),
      count('user_profiles', (q) => q.gte('created_at', todayISO)),
      count('match_schedules', (q) => q.gte('created_at', todayISO)),
      supabase
        .from('payment_deposits')
        .select('amount')
        .eq('payment_status', 'paid')
        .gte('paid_at', todayISO),
      supabase
        .from('tutors')
        .select('id, approval_status, created_at, user_profiles:user_id(name, email)')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    return NextResponse.json({
      stats: {
        totalUsers,
        totalStudents,
        totalTutors,
        pendingTutors,
        approvedTutors,
        rejectedTutors,
        totalMatches,
        activeMatches,
        completedMatches,
        totalPrograms,
        onlineStudents,
        onlineTutors: 0,
        revenueToday: (paidToday ?? []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0),
        newUsersToday,
        sessionsToday,
      },
      recentTutors: (recentTutorData ?? []).map((t: any) => ({
        id: t.id,
        name: t.user_profiles?.name || 'Unknown',
        email: t.user_profiles?.email || '',
        status: t.approval_status || 'pending',
        created_at: t.created_at,
      })),
    })
  } catch (err) {
    console.error('[admin/stats]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
