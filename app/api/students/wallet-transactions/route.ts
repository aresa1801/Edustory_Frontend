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
    const studentId = searchParams.get('student_id')

    if (!studentId) {
      return NextResponse.json({ error: 'student_id required' }, { status: 400 })
    }

    const { data: transactions, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[wallet-transactions] query error:', error)
      return NextResponse.json({ transactions: [] })
    }

    return NextResponse.json({ transactions: transactions || [] })
  } catch (err) {
    console.error('[wallet-transactions] unexpected:', err)
    return NextResponse.json({ transactions: [] })
  }
}