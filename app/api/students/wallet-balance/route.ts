import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { autoCompleteExpiredSessions } from '@/lib/auto-complete'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // 🔥 Lazy healing — paling atas
    try {
      await autoCompleteExpiredSessions()
    } catch (e) {
      console.error('[wallet-balance] heal error:', e)
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ... sisa kode lama tetap sama

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    if (!studentId) {
      return NextResponse.json({ balance: 0, frozen: 0, available: 0 })
    }

    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('student_id', studentId)
      .maybeSingle()

    const balance = Number(wallet?.balance) || 0

    const { data: frozenTx } = await supabase
      .from('wallet_transactions')
      .select('amount')
      .eq('student_id', studentId)
      .eq('type', 'session_hold')
      .in('status', ['pending', 'active', 'moved'])

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