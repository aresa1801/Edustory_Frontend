import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/security/sanitize'
import { getCreditTier } from '@/lib/credit'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

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
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, cache: 'no-store' }),
        },
      }
    )

    let data: any = null
    let error: any = null

    if (role === 'tutor') {
      const res = await supabase
    .from('tutors')
    .select('id, credit_score, suspended_until, last_login_reward_at, rating, total_reviews, last_profile_edit_at')
    .eq('user_id', userId)
    .maybeSingle()
      data = res.data
      error = res.error
    } else {
      const res = await supabase
        .from('students')
        .select('id, credit_score, suspended_until, last_login_reward_at')
        .eq('user_id', userId)
        .maybeSingle()
      data = res.data
      error = res.error
    }

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

    return NextResponse.json(
      {
        profileId: data.id,
        creditScore: score,
        tier: tier.id,
        tierLabel: tier.label,
        suspendedUntil,
        isSuspended,
        lastLoginRewardAt: data.last_login_reward_at ?? null,
        rating: role === 'tutor' ? Number(data.rating ?? 0) : null,
        totalReviews: role === 'tutor' ? Number(data.total_reviews ?? 0) : null,
        catalogCooldownSeconds: tier.features.catalogCooldownSeconds,
        maxSessionRate: tier.features.maxSessionRate,
        profileEditLockDays: tier.features.profileEditLockDays,
        lastProfileEditAt: role === 'tutor' ? (data.last_profile_edit_at ?? null) : null,
        accountHeld: tier.features.accountHeld,   // ⬅️ BARU
        banned: tier.features.banned,             // ⬅️ BARU
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (err) {
    console.error('[credit/me]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}