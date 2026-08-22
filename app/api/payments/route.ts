import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// ===== SUPABASE CLIENT (pakai Service Role Key) =====
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ===== AMBIL USER DARI TOKEN =====
async function getAuthUser(request: NextRequest) {
  const supabase = getSupabase()
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// ============================================================
// GET  – ambil riwayat top-up
// ============================================================
export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

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
      .eq('payment_type', 'topup')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[Payments GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch top-ups' }, { status: 500 })
  }
}

// ============================================================
// POST – rekam top-up & tambah saldo wallet
// ============================================================
export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // === 1. Baca body ===
    const { 
      amount, 
      paymentMethod, 
      transactionRef, 
      qrisDynamicString, 
      isTopup,
      isDummy,
      transactionId // 👈 TERIMA transactionId
    } = await request.json()

    // === 2. Validasi ===
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number' },
        { status: 400 }
      )
    }

    const VALID_METHODS = [
      'qris', 'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja',
      'bca', 'bni', 'bri', 'mandiri', 'permata', 'cimb', 'dummy'
    ]
    if (!paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `paymentMethod must be one of: ${VALID_METHODS.join(', ')}` },
        { status: 400 }
      )
    }

    // === 3. Ambil student ===
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student profile not found. Complete onboarding first.' },
        { status: 404 }
      )
    }

    // ============================================================
    // 4. Jika ada transactionId → UPDATE status pending → paid
    // ============================================================
    if (transactionId) {
      // 4a. Cek apakah transaksi ada dan statusnya pending
      const { data: existing, error: checkError } = await supabase
        .from('payment_deposits')
        .select('id, payment_status, amount, student_id')
        .eq('id', transactionId)
        .eq('student_id', student.id)
        .single()

      if (checkError || !existing) {
        console.error('[Payments POST] Transaksi tidak ditemukan:', checkError)
        return NextResponse.json(
          { error: 'Transaksi tidak ditemukan' },
          { status: 404 }
        )
      }

      if (existing.payment_status === 'paid') {
        // Sudah lunas, return saldo terbaru
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('student_id', student.id)
          .single()
        return NextResponse.json({
          message: 'Transaksi sudah lunas',
          newBalance: wallet?.balance || 0,
        }, { status: 200 })
      }

      // 4b. Update status menjadi paid
      const { error: updateError } = await supabase
        .from('payment_deposits')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', transactionId)

      if (updateError) {
        console.error('[Payments POST] Update status error:', updateError)
        return NextResponse.json(
          { error: 'Gagal update status transaksi' },
          { status: 500 }
        )
      }

      // 4c. Gunakan amount dari existing (atau dari request)
      const finalAmount = existing.amount || amount

      // === TAMBAH SALDO WALLET ===
      // 5a. Pastikan wallet ada (buat jika belum)
      const { data: existingWallet, error: walletCheckError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('student_id', student.id)
        .maybeSingle()

      if (walletCheckError) {
        console.error('[Payments POST] Wallet check error:', walletCheckError)
        return NextResponse.json(
          { error: 'Failed to check wallet: ' + walletCheckError.message },
          { status: 500 }
        )
      }

      let walletId = existingWallet?.id
      let oldBalance = existingWallet?.balance || 0
      const newBalance = oldBalance + finalAmount

      if (!existingWallet) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({
            student_id: student.id,
            balance: finalAmount,
          })
          .select('id, balance')
          .single()

        if (createError) {
          console.error('[Payments POST] Create wallet error:', createError)
          return NextResponse.json(
            { error: 'Failed to create wallet: ' + createError.message },
            { status: 500 }
          )
        }
        walletId = newWallet.id
      } else {
        const { error: updateError } = await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('id', walletId)

        if (updateError) {
          console.error('[Payments POST] Update wallet error:', updateError)
          return NextResponse.json(
            { error: 'Failed to update wallet: ' + updateError.message },
            { status: 500 }
          )
        }
      }

      // 5b. Catat ke wallet_transactions
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          student_id: student.id,
          amount: finalAmount,
          type: 'topup',
          status: 'completed',
          reference: transactionId,
          description: `Top-up via ${paymentMethod} (manual confirm) - ${transactionRef || ''}`,
          balance_after: newBalance,
        })

      if (txError) {
        console.error('[Payments POST] Transaction log error:', txError)
      }

      return NextResponse.json({
        newBalance,
        walletId,
        transactionId,
        message: 'Top-up berhasil! Saldo telah ditambahkan.',
      }, { status: 201 })
    }

    // ============================================================
    // 5. Jika TIDAK ada transactionId → INSERT baru (seperti biasa)
    // ============================================================
    const paymentStatus = isTopup ? 'paid' : 'pending'
    const paymentType = isTopup ? 'topup' : 'session'
    const paidAt = isTopup ? new Date().toISOString() : null

    const payload = {
      student_id: student.id,
      amount,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      payment_type: paymentType,
      paid_at: paidAt,
      transaction_ref: transactionRef || `TRX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      qris_dynamic_string: paymentMethod === 'qris' ? (qrisDynamicString || null) : null,
    }

    const { data: inserted, error: insertError } = await supabase
      .from('payment_deposits')
      .insert([payload])
      .select()
      .single()

    if (insertError) {
      console.error('[Payments POST] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to record payment: ' + insertError.message },
        { status: 500 }
      )
    }

    // === 6. Jika top-up / dummy, tambah saldo wallet ===
    if (isTopup && inserted) {
      const { data: existingWallet, error: walletCheckError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('student_id', student.id)
        .maybeSingle()

      if (walletCheckError) {
        console.error('[Payments POST] Wallet check error:', walletCheckError)
        return NextResponse.json(
          { error: 'Failed to check wallet: ' + walletCheckError.message },
          { status: 500 }
        )
      }

      let walletId = existingWallet?.id
      let oldBalance = existingWallet?.balance || 0
      const newBalance = oldBalance + amount

      if (!existingWallet) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({
            student_id: student.id,
            balance: amount,
          })
          .select('id, balance')
          .single()

        if (createError) {
          console.error('[Payments POST] Create wallet error:', createError)
          return NextResponse.json(
            { error: 'Failed to create wallet: ' + createError.message },
            { status: 500 }
          )
        }
        walletId = newWallet.id
      } else {
        const { error: updateError } = await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('id', walletId)

        if (updateError) {
          console.error('[Payments POST] Update wallet error:', updateError)
          return NextResponse.json(
            { error: 'Failed to update wallet: ' + updateError.message },
            { status: 500 }
          )
        }
      }

      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          student_id: student.id,
          amount: amount,
          type: 'topup',
          status: 'completed',
          reference: inserted.id,
          description: `Top-up via ${paymentMethod} - ${inserted.transaction_ref}`,
          balance_after: newBalance,
        })

      if (txError) {
        console.error('[Payments POST] Transaction log error:', txError)
      }

      return NextResponse.json({
        ...inserted,
        newBalance,
        walletId,
        message: 'Top-up berhasil! Saldo telah ditambahkan.',
      }, { status: 201 })
    }

    return NextResponse.json(inserted, { status: 201 })
  } catch (error) {
    console.error('[Payments POST] Unhandled error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}