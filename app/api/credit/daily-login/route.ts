import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/security/sanitize'
import { claimDailyLogin } from '@/lib/credit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body JSON tidak valid' }, { status: 400 })
    }

    const { user_id, role } = body ?? {}
    if (!isValidUUID(user_id)) {
      return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
    }
    if (!['tutor', 'student'].includes(role)) {
      return NextResponse.json({ error: 'role tidak valid' }, { status: 400 })
    }

    const table = role === 'tutor' ? 'tutors' : 'students'
    const { data: profile } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: `${role} tidak ditemukan` }, { status: 404 })
    }

    const result = await claimDailyLogin({
      profileId: profile.id,
      role,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Gagal' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      claimed: result.claimed,
      newScore: result.newScore,
    })
  } catch (err) {
    console.error('[credit/daily-login]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}