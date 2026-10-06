import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createIrisPayout, MIDTRANS_IRIS_ENABLED } from '@/lib/payouts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@edustory.com'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Cek bahwa pemanggil adalah admin. */
async function requireAdmin(supabase: SupabaseClient, request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin' && profile?.email !== ADMIN_EMAIL) {
    return { ok: false as const, status: 403, error: 'Hanya admin' }
  }
  return { ok: true as const, userId: user.id }
}

/** GET /api/admin/withdrawals?status=pending — daftar permintaan penarikan */
export async function GET(request: NextRequest) {
  const supabase = admin()
  const auth = await requireAdmin(supabase, request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const status = new URL(request.url).searchParams.get('status')

  let query = supabase
    .from('withdrawals')
    .select(`
      id, user_id, amount, status, midtrans_reference_no, rejection_reason, processed_at, created_at,
      bank_accounts (id, bank_code, account_number, account_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    console.error('[admin/withdrawals] list error:', error)
    return NextResponse.json({ error: 'Gagal memuat data' }, { status: 500 })
  }

  // Lengkapi dengan nama & email pengaju
  const ids = Array.from(new Set((data || []).map((w: any) => w.user_id).filter(Boolean)))
  let profiles: Record<string, { name: string | null; email: string | null }> = {}
  if (ids.length) {
    const { data: ps } = await supabase
      .from('user_profiles')
      .select('id, name, email')
      .in('id', ids)
    for (const p of ps || []) profiles[p.id] = { name: p.name, email: p.email }
  }

  const items = (data || []).map((w: any) => ({
    ...w,
    requester: profiles[w.user_id] || { name: null, email: null },
  }))

  const summary = {
    pending: items.filter((w: any) => w.status === 'pending').length,
    processing: items.filter((w: any) => w.status === 'processing').length,
    completed: items.filter((w: any) => w.status === 'completed').length,
    pendingAmount: items
      .filter((w: any) => w.status === 'pending' || w.status === 'processing')
      .reduce((s: number, w: any) => s + (Number(w.amount) || 0), 0),
  }

  return NextResponse.json({
    withdrawals: items,
    summary,
    irisEnabled: MIDTRANS_IRIS_ENABLED,
  })
}

/** PATCH /api/admin/withdrawals — { id, action: 'approve' | 'reject' | 'complete', reason? } */
export async function PATCH(request: NextRequest) {
  const supabase = admin()
  const auth = await requireAdmin(supabase, request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json().catch(() => ({}))
    const id = String(body.id || '')
    const action = String(body.action || '')
    const reason = body.reason ? String(body.reason) : null

    if (!id || !['approve', 'reject', 'complete'].includes(action)) {
      return NextResponse.json({ error: 'id & action tidak valid' }, { status: 400 })
    }

    const { data: w } = await supabase
      .from('withdrawals')
      .select(`
        id, user_id, amount, status, midtrans_reference_no,
        bank_accounts (id, bank_code, account_number, account_name)
      `)
      .eq('id', id)
      .maybeSingle()

    if (!w) return NextResponse.json({ error: 'Penarikan tidak ditemukan' }, { status: 404 })

    const account: any = Array.isArray((w as any).bank_accounts)
      ? (w as any).bank_accounts[0]
      : (w as any).bank_accounts

    // ---------- APPROVE ----------
    if (action === 'approve') {
      if (w.status !== 'pending') {
        return NextResponse.json({ error: `Status saat ini "${w.status}", tidak bisa di-approve` }, { status: 400 })
      }

      if (!MIDTRANS_IRIS_ENABLED) {
        return NextResponse.json(
          {
            error:
              'Midtrans Payouts belum dikonfigurasi. Transfer manual ke rekening pengajar, lalu tandai "Selesai".',
            needsManualTransfer: true,
          },
          { status: 409 }
        )
      }

      const result = await createIrisPayout({
        withdrawalId: w.id,
        amount: Number(w.amount),
        bankCode: account?.bank_code || '',
        accountNumber: account?.account_number || '',
        accountName: account?.account_name || '',
      })

      if (!result.ok) {
        return NextResponse.json({ error: 'Midtrans gagal: ' + result.error, detail: result.raw }, { status: 502 })
      }

      await supabase
        .from('withdrawals')
        .update({ status: 'processing', midtrans_reference_no: result.referenceNo })
        .eq('id', w.id)

      await supabase
        .from('wallet_transactions')
        .update({ status: 'processing' })
        .eq('reference', w.id)
        .eq('type', 'withdrawal')
        .in('status', ['pending', 'processing'])

      return NextResponse.json({ success: true, status: 'processing', reference_no: result.referenceNo })
    }

    // ---------- REJECT ----------
    if (action === 'reject') {
      if (!['pending', 'processing'].includes(w.status)) {
        return NextResponse.json({ error: `Status saat ini "${w.status}", tidak bisa ditolak` }, { status: 400 })
      }

      await supabase
        .from('withdrawals')
        .update({ status: 'rejected', rejection_reason: reason || 'Ditolak admin' })
        .eq('id', w.id)

      // Buka penahan saldo
      await supabase
        .from('wallet_transactions')
        .update({ status: 'cancelled', description: `Penarikan ditolak${reason ? `: ${reason}` : ''}` })
        .eq('reference', w.id)
        .eq('type', 'withdrawal')
        .in('status', ['pending', 'processing'])

      return NextResponse.json({ success: true, status: 'rejected' })
    }

    // ---------- COMPLETE (transfer manual sudah dilakukan) ----------
    if (!['pending', 'processing'].includes(w.status)) {
      return NextResponse.json({ error: `Status saat ini "${w.status}", tidak bisa diselesaikan` }, { status: 400 })
    }

    // Cari penahan & saldo tutor
    const { data: hold } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('reference', w.id)
      .eq('type', 'withdrawal')
      .in('status', ['pending', 'processing'])
      .maybeSingle()

    const { data: tutor } = await supabase
      .from('tutors')
      .select('id')
      .eq('user_id', w.user_id)
      .maybeSingle()

    const { data: wallet } = tutor
      ? await supabase.from('wallets').select('id, balance').eq('tutor_id', tutor.id).maybeSingle()
      : { data: null as any }

    const currentBalance = Number(wallet?.balance) || 0
    const newBalance = Math.max(0, currentBalance - Number(w.amount))

    // 1. Tandai selesai
    await supabase
      .from('withdrawals')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('id', w.id)

    // 2. Realisasi potongan saldo + tutup penahan
    if (wallet) {
      await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id)
    }

    if (hold) {
      await supabase
        .from('wallet_transactions')
        .update({ status: 'completed', balance_after: newBalance })
        .eq('id', hold.id)
    } else {
      // tidak ada penahan (data lama) → catat langsung
      if (tutor) {
        await supabase.from('wallet_transactions').insert({
          tutor_id: tutor.id,
          amount: -Number(w.amount),
          type: 'withdrawal',
          status: 'completed',
          reference: w.id,
          description: 'Penarikan saldo diselesaikan admin',
          balance_after: newBalance,
        })
      }
    }

    return NextResponse.json({ success: true, status: 'completed', balance: newBalance })
  } catch (err: any) {
    console.error('[admin/withdrawals] PATCH error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
