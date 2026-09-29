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
      return NextResponse.json({ balance: 0, frozen: 0, available: 0 })
    }

    // 1. Cari student
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!student) {
      return NextResponse.json({ balance: 0, frozen: 0, available: 0 })
    }

    // 2. Wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('student_id', student.id)
      .maybeSingle()

    const balance = Number(wallet?.balance) || 0

    // 3. Hitung frozen — pending ATAU active
    const { data: frozenTx } = await supabase
      .from('wallet_transactions')
      .select('amount')
      .eq('student_id', student.id)
      .eq('type', 'session_hold')
      .in('status', ['pending', 'active'])     // ← include 'active'

    const frozen = (frozenTx || []).reduce(
      (sum, tx) => sum + Math.abs(Number(tx.amount) || 0),
      0
    )

    return NextResponse.json({
      balance,
      frozen,
      available: Math.max(0, balance - frozen),
    })
  } catch (err) {
    console.error('[wallet-balance] unexpected:', err)
    return NextResponse.json({ balance: 0, frozen: 0, available: 0 })
  }
}