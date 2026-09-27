import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    // 1. Cari student
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (studentErr) {
      console.error('[wallet-balance] student error:', studentErr)
      return NextResponse.json({ error: studentErr.message }, { status: 500 })
    }

    if (!student) {
      console.warn('[wallet-balance] no student for user:', userId)
      return NextResponse.json({ balance: 0 })
    }

    // 2. Cari wallet
    const { data: wallet, error: walletErr } = await supabase
      .from('wallets')
      .select('balance')
      .eq('student_id', student.id)
      .maybeSingle()

    if (walletErr) {
      console.error('[wallet-balance] wallet error:', walletErr)
      return NextResponse.json({ error: walletErr.message }, { status: 500 })
    }

    return NextResponse.json({
      balance: Number(wallet?.balance) || 0,
    })
  } catch (err) {
    console.error('[wallet-balance] unexpected:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}