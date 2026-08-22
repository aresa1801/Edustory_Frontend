import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { convertToDynamic } from '@/lib/qris'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthUser(request: NextRequest) {
  const supabase = getSupabase()
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount } = await request.json()
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
    }

    // 1. Ambil QRIS statis
    const { data: config, error: configError } = await supabase
      .from('payment_config')
      .select('config_value')
      .eq('config_key', 'qris_static_string')
      .single()

    if (configError || !config?.config_value) {
      console.error('[QRIS] Config error:', configError)
      return NextResponse.json({ error: 'QRIS belum dikonfigurasi' }, { status: 503 })
    }

    const staticQris = config.config_value.trim()
    console.log('[QRIS] Static QRIS length:', staticQris.length)

    // 2. Generate dinamis
    let dynamicQris: string
    try {
      dynamicQris = convertToDynamic(staticQris, Math.round(amount))
      console.log('[QRIS] Dynamic generated, length:', dynamicQris.length)
    } catch (conversionError) {
      console.error('[QRIS] Conversion error:', conversionError)
      return NextResponse.json({ error: 'Gagal mengkonversi QRIS' }, { status: 500 })
    }

    // 3. Ambil student_id
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (studentError || !student) {
      console.error('[QRIS] Student not found:', studentError)
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // 4. Simpan pending transaction (opsional, untuk polling)
    const transactionRef = `QRIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const { data: inserted, error: insertError } = await supabase
      .from('payment_deposits')
      .insert({
        student_id: student.id,
        amount: Math.round(amount),
        payment_method: 'qris',
        payment_status: 'pending',
        payment_type: 'topup',
        transaction_ref: transactionRef,
        qris_dynamic_string: dynamicQris,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[QRIS] Insert pending error:', insertError)
      // Jika gagal insert, tetap return QRIS tanpa transactionId (polling tidak jalan)
      return NextResponse.json({
        dynamicQris,
        transactionId: null,
        warning: 'Transaksi pending gagal disimpan, tapi QRIS tetap valid.',
      })
    }

    console.log('[QRIS] Pending transaction created:', inserted.id)

    return NextResponse.json({
      dynamicQris,
      transactionId: inserted.id,
    })
  } catch (error) {
    console.error('[QRIS] Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}