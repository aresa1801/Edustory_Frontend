import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestUser } from '@/lib/api-auth'

/**
 * DUMMY withdrawal endpoint.
 * Records a pending withdrawal request without moving money.
 * TODO: replace with Flip disbursement once FLIP_SECRET_KEY is available.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const amount = Number(body.amount)
    const bankName = String(body.bank_name || '').trim()
    const accountNumber = String(body.account_number || '').trim()
    const accountName = String(body.account_name || '').trim()

    if (!Number.isFinite(amount) || amount < 10000) {
      return NextResponse.json({ error: 'Minimal penarikan Rp 10.000' }, { status: 400 })
    }
    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json({ error: 'Data rekening belum lengkap' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data, error } = await supabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        amount,
        status: 'pending',
        midtrans_reference_no: `DUMMY-${Date.now()}`,
        rejection_reason: null,
      })
      .select('id, amount, status, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      mode: 'dummy',
      withdrawal: data,
      message: `Permintaan penarikan Rp ${amount.toLocaleString('id-ID')} ke ${bankName} ${accountNumber} dicatat (dummy).`,
    })
  } catch (err) {
    console.error('[withdrawals/dummy]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
