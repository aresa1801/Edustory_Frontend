import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthUser(request: NextRequest) {
  const supabase = getSupabase()
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// GET /api/payments — list top-up payments for the current student
export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Hanya ambil top-up, atau semua? Kita filter untuk top-up saja (payment_type = 'topup')
    // Namun jika ingin semua, hilangkan filter .eq('payment_type', 'topup')
    const { data, error } = await supabase
      .from('payment_deposits')
      .select(`
        id,
        amount,
        payment_method,
        payment_status,
        created_at,
        transaction_ref
      `)
      .eq('student_id', student.id)
      .eq('payment_type', 'topup') // hanya top-up
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching top-ups:', error)
    return NextResponse.json({ error: 'Failed to fetch top-ups' }, { status: 500 })
  }
}

// POST /api/payments — record a top-up (or session payment later)
export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount, paymentMethod, transactionRef, qrisDynamicString, isTopup } =
      await request.json()

    const VALID_METHODS = [
      'qris',
      'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja',
      'bca', 'bni', 'bri', 'mandiri', 'permata', 'cimb',
    ]

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number' },
        { status: 400 }
      )
    }

    if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `paymentMethod must be one of: ${VALID_METHODS.join(', ')}` },
        { status: 400 }
      )
    }

    // Ambil student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    // Jika isTopup true, langsung dianggap paid
    const paymentStatus = isTopup ? 'paid' : 'pending'
    const paymentType = isTopup ? 'topup' : 'session'
    const paidAt = isTopup ? new Date().toISOString() : null

    // Siapkan payload
    const payload: any = {
      student_id: student.id,
      amount,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      payment_type: paymentType,
      paid_at: paidAt,
      transaction_ref: transactionRef || `TRX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      qris_dynamic_string: paymentMethod === 'qris' ? (qrisDynamicString || null) : null,
    }

    // Insert ke payment_deposits
    let { data: inserted, error: insertError } = await supabase
      .from('payment_deposits')
      .insert([payload])
      .select()

    if (insertError) {
      // Coba minimal payload jika kolom belum ada (fallback)
      if (insertError.code === '42703') {
        const minimalPayload = {
          student_id: student.id,
          amount,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          paid_at: paidAt,
          transaction_ref: payload.transaction_ref,
        }
        const retryResult = await supabase
          .from('payment_deposits')
          .insert([minimalPayload])
          .select()
        if (retryResult.error) throw retryResult.error
        inserted = retryResult.data
      } else {
        throw insertError
      }
    }

    // Jika top-up sukses, tambahkan saldo ke wallet
    if (isTopup && inserted && inserted.length > 0) {
      // Panggil fungsi add_wallet_balance (pastikan sudah dibuat di Supabase)
      const { data: walletResult, error: walletError } = await supabase.rpc(
        'add_wallet_balance',
        {
          p_student_id: student.id,
          p_amount: amount,
        }
      )

      if (walletError) {
        console.error('Gagal menambah saldo wallet:', walletError)
        // Jika gagal, sebaiknya throw agar transaksi dibatalkan? Atau tetap return sukses tapi warning.
        // Kita bisa return error agar frontend tahu ada masalah.
        return NextResponse.json(
          { error: 'Top-up berhasil di catat, namun gagal menambah saldo. Hubungi admin.' },
          { status: 500 }
        )
      }

      // Return data lengkap dengan informasi saldo baru
      return NextResponse.json({
        ...inserted[0],
        newBalance: walletResult,
      }, { status: 201 })
    }

    return NextResponse.json(inserted?.[0] ?? {}, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
}