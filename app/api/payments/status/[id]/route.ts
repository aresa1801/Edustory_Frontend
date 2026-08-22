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
    // === VERIFIKASI TOKEN ===
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    }

    // === AMBIL DATA TRANSAKSI ===
    const { data: payment, error: paymentError } = await supabase
      .from('payment_deposits')
      .select('id, payment_status, amount, student_id, transaction_ref')
      .eq('id', id)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // === CEK APAKAH MILIK USER INI ===
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (studentError || !student || student.id !== payment.student_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // === AMBIL SALDO WALLET (jika sudah paid) ===
    let walletBalance = null
    if (payment.payment_status === 'paid') {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('student_id', payment.student_id)
        .single()
      walletBalance = wallet?.balance || 0
    }

    return NextResponse.json({
      id: payment.id,
      payment_status: payment.payment_status,
      amount: payment.amount,
      transaction_ref: payment.transaction_ref,
      walletBalance,
    })
  } catch (error) {
    console.error('[Payment Status] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}