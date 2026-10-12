import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/security/sanitize'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const role = searchParams.get('role')
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100)

    if (!isValidUUID(userId)) {
      return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
    }
    if (!role || !['tutor', 'student'].includes(role)) {
      return NextResponse.json({ error: 'role tidak valid' }, { status: 400 })
    }

    // ⬇️ CACHE-BUSTER: global.fetch override
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

    const { data, error } = await supabase
      .from('credit_log')
      .select('id, delta, balance_after, reason, ref_id, created_at')
      .eq('user_id', userId)
      .eq('role', role)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ⬇️ Response dengan Cache-Control header
    return NextResponse.json(
      {
        logs: (data || []).map((r) => ({
          id: r.id,
          delta: r.delta,
          balanceAfter: r.balance_after,
          reason: r.reason,
          refId: r.ref_id,
          createdAt: r.created_at,
        })),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (err) {
    console.error('[credit/log]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}