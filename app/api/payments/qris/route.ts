import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { convertToDynamic, validateQris } from '@/lib/qris'

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

/**
 * POST /api/payments/qris
 * Body: { amount: number }
 * Returns: { dynamicQris: string, merchantName: string }
 *
 * Reads the static QRIS from payment_config and converts it to dynamic.
 */
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

    // Fetch the static QRIS from config
    const { data: config } = await supabase
      .from('payment_config')
      .select('config_value')
      .eq('config_key', 'qris_static_string')
      .single()

    const staticQris = config?.config_value?.trim()
    if (!staticQris) {
      return NextResponse.json(
        { error: 'QRIS belum dikonfigurasi oleh admin. Hubungi administrator.' },
        { status: 503 }
      )
    }

    if (!validateQris(staticQris)) {
      return NextResponse.json(
        { error: 'String QRIS statis tidak valid. Hubungi administrator.' },
        { status: 503 }
      )
    }

    const dynamicQris = convertToDynamic(staticQris, Math.round(amount))

    return NextResponse.json({ dynamicQris })
  } catch (error) {
    console.error('Error generating QRIS:', error)
    return NextResponse.json({ error: 'Gagal membuat QRIS dinamis' }, { status: 500 })
  }
}
