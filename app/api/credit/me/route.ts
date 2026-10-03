import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/security/sanitize'
import { getCreditTier } from '@/lib/credit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const role = searchParams.get('role')

    if (!isValidUUID(userId)) {
      return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
    }
    if (!role || !['tutor', 'student'].includes(role)) {
      return NextResponse.json({ error: 'role tidak valid' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const table = role === 'tutor' ? 'tutors' : 'students'
    const { data, error } = await supabase
      .from(table)
      .select('id, credit_score, suspended_until, last_login_reward_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: `${role} tidak ditemukan` }, { status: 404 })
    }

    const score = Number(data.credit_score ?? 99)
    const tier = getCreditTier(score)
    const suspendedUntil: string | null = data.suspended_until ?? null
    const isSuspended =
      !!suspendedUntil && new Date(suspendedUntil).getTime() > Date.now()

    return NextResponse.json({
      creditScore: score,
      tier: tier.id,
      tierLabel: tier.label,
      suspendedUntil,
      isSuspended,
      lastLoginRewardAt: data.last_login_reward_at ?? null,
    })
  } catch (err) {
    console.error('[credit/me]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}