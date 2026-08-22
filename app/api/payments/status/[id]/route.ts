import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  try {
    const { id } = params
    const { data, error } = await supabase
      .from('payment_deposits')
      .select('id, payment_status, amount, student_id')
      .eq('id', id)
      .single()

    if (error) throw error

    // Jika status paid, ambil wallet balance terbaru
    let walletBalance = null
    if (data?.payment_status === 'paid') {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('student_id', data.student_id)
        .single()
      walletBalance = wallet?.balance || 0
    }

    return NextResponse.json({
      ...data,
      walletBalance,
    })
  } catch (error) {
    console.error('[Payment Status] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}