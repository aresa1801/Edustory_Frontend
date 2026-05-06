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
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

/**
 * PATCH /api/payments/confirm
 * Body: { paymentId: string, status: 'paid' | 'rejected', notes?: string }
 * Admin only — confirms or rejects a student payment.
 */
export async function PATCH(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { paymentId, status, notes } = await request.json()

    if (!paymentId || !['paid', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'paymentId and status (paid|rejected) are required' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {
      payment_status: status,
      updated_at: new Date().toISOString(),
    }
    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString()
    }
    if (notes) {
      updateData.notes = notes
    }

    const { data, error } = await supabase
      .from('payment_deposits')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error confirming payment:', error)
    return NextResponse.json({ error: 'Gagal mengupdate pembayaran' }, { status: 500 })
  }
}
