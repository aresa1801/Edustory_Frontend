import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/security/sanitize'
import { claimDailyLogin } from '@/lib/credit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
    }

    const { user_id } = body ?? {}
    if (!isValidUUID(user_id)) {
      return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Auto-detect role: coba tutor dulu, kalau gak ada coba student
    const { data: tutor } = await supabase
      .from('tutors')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle()

    let role: 'tutor' | 'student'
    let profileId: string

    if (tutor) {
      role = 'tutor'
      profileId = tutor.id
    } else {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user_id)
        .maybeSingle()

      if (!student) {
        return NextResponse.json(
          { error: 'User bukan tutor/student' },
          { status: 404 }
        )
      }
      role = 'student'
      profileId = student.id
    }

    const result = await claimDailyLogin({ profileId, role })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Gagal claim daily login' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      role,
      claimed: result.claimed,
      newScore: result.newScore,
    })
  } catch (err) {
    console.error('[daily-login]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}