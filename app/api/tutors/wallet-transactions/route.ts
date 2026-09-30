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
    const tutorId = searchParams.get('tutor_id')

    if (!tutorId) {
      return NextResponse.json({ transactions: [] })
    }

    // 🔥 Exclude session_hold — itu transaksi milik student
    const { data: transactions, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('tutor_id', tutorId)
      .in('type', ['session_earning', 'session_release', 'refund', 'withdrawal', 'withdrawal_completed', 'credit'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[tutor-wallet-transactions] error:', error)
      return NextResponse.json({ transactions: [] })
    }

    return NextResponse.json({ transactions: transactions || [] })
  } catch (err) {
    console.error('[tutor-wallet-transactions] unexpected:', err)
    return NextResponse.json({ transactions: [] })
  }
}