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

    // Ambil QRIS statis
    const { data: config, error: configError } = await supabase
      .from('payment_config')
      .select('config_value')
      .eq('config_key', 'qris_static_string')
      .single()

    if (configError || !config?.config_value) {
      return NextResponse.json({ error: 'QRIS belum dikonfigurasi' }, { status: 503 })
    }

    const staticQris = config.config_value.trim()
    const dynamicQris = convertToDynamic(staticQris, Math.round(amount))

    // === BUAT PENDING TRANSACTION ===
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const { data: inserted, error: insertError } = await supabase
      .from('payment_deposits')
      .insert({
        student_id: student.id,
        amount: Math.round(amount),
        payment_method: 'qris',
        payment_status: 'pending',
        payment_type: 'topup',
        transaction_ref: `QRIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        qris_dynamic_string: dynamicQris,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[QRIS] Insert pending error:', insertError)
      return NextResponse.json({ error: 'Gagal membuat transaksi' }, { status: 500 })
    }

    return NextResponse.json({
      dynamicQris,
      transactionId: inserted.id,
    })
  } catch (error) {
    console.error('[QRIS] Error:', error)
    return NextResponse.json({ error: 'Gagal membuat QRIS dinamis' }, { status: 500 })
  }
}