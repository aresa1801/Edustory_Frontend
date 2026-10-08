import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getTutorBalances } from '@/lib/payouts'

export const runtime = 'nodejs'

const MIN_WITHDRAWAL = 10000

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthUser(supabase: SupabaseClient, request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

/** Resolve tutor row (tutors.id) untuk user yang login. */
async function resolveTutor(supabase: SupabaseClient, userId: string) {
  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return tutor as { id: string; user_id: string } | null
}

/** GET /api/withdrawals — riwayat penarikan + saldo pengajar yang login */
export async function GET(request: NextRequest) {
  const supabase = admin()
  const user = await getAuthUser(supabase, request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('withdrawals')
    .select(`
      id, amount, status, midtrans_reference_no, rejection_reason, processed_at, created_at,
      bank_accounts (id, bank_code, account_number, account_name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[withdrawals] list error:', error)
    return NextResponse.json({ error: 'Gagal memuat riwayat penarikan' }, { status: 500 })
  }

  const tutor = await resolveTutor(supabase, user.id)
  const balances = tutor
    ? await getTutorBalances(supabase, tutor.id)
    : { balance: 0, hold: 0, available: 0 }

  return NextResponse.json({
    withdrawals: data || [],
    balances,
    minWithdrawal: MIN_WITHDRAWAL,
  })
}

/** POST /api/withdrawals — ajukan penarikan saldo */
export async function POST(request: NextRequest) {
  const supabase = admin()
  const user = await getAuthUser(supabase, request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tutor = await resolveTutor(supabase, user.id)
    if (!tutor) {
      return NextResponse.json({ error: 'Hanya pengajar yang bisa menarik saldo' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const amount = Math.round(Number(body.amount))
    const bankAccountId = String(body.bank_account_id || '')

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Jumlah penarikan tidak valid' }, { status: 400 })
    }
    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimal penarikan Rp ${MIN_WITHDRAWAL.toLocaleString('id-ID')}` },
        { status: 400 }
      )
    }

    // Rekening harus milik user ini
    const { data: account } = await supabase
      .from('bank_accounts')
      .select('id, bank_code, account_number, account_name')
      .eq('id', bankAccountId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!account) {
      return NextResponse.json({ error: 'Rekening tidak ditemukan' }, { status: 404 })
    }

    // Tidak boleh ada penarikan berjalan lain (satu per satu, biar rapi)
    const { count: activeCount } = await supabase
      .from('withdrawals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])

    if (activeCount) {
      return NextResponse.json(
        { error: 'Masih ada penarikan yang sedang diproses. Tunggu sampai selesai.' },
        { status: 400 }
      )
    }

    const balances = await getTutorBalances(supabase, tutor.id)
    if (amount > balances.available) {
      return NextResponse.json(
        {
          error: `Saldo tersedia tidak cukup. Tersedia Rp ${balances.available.toLocaleString('id-ID')}.`,
          available: balances.available,
        },
        { status: 400 }
      )
    }

    // 1. Buat request penarikan
    const { data: withdrawal, error: wErr } = await supabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        bank_account_id: bankAccountId,
        amount,
        status: 'pending',
      })
      .select('id, amount, status, created_at')
      .single()

    if (wErr || !withdrawal) {
      console.error('[withdrawals] insert error:', wErr)
      return NextResponse.json({ error: 'Gagal membuat penarikan: ' + (wErr?.message || '') }, { status: 500 })
    }

    // 2. Tahan saldo (pending hold) — saldo wallets.balance baru dikurangi saat selesai
    const { error: txErr } = await supabase.from('wallet_transactions').insert({
      tutor_id: tutor.id,
      amount: -amount,
      type: 'withdrawal',
      status: 'pending',
      reference: withdrawal.id,
      description: `Penarikan Saldo — ${account.bank_code.toUpperCase()} ${account.account_number}`,
      balance_after: balances.balance,
    })

    if (txErr) {
      console.error('[withdrawals] hold error:', txErr)
      // rollback request biar tidak menggantung
      await supabase.from('withdrawals').delete().eq('id', withdrawal.id)
      return NextResponse.json({ error: 'Gagal menahan saldo: ' + txErr.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        withdrawal,
        balances: { ...balances, hold: balances.hold + amount, available: Math.max(0, balances.available - amount) },
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('[withdrawals] POST error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}

/** PATCH /api/withdrawals — batalkan penarikan yang masih pending */
export async function PATCH(request: NextRequest) {
  const supabase = admin()
  const user = await getAuthUser(supabase, request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json().catch(() => ({ id: '' }))
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

  const { data: w } = await supabase
    .from('withdrawals')
    .select('id, user_id, amount, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!w) return NextResponse.json({ error: 'Penarikan tidak ditemukan' }, { status: 404 })
  if (w.status !== 'pending') {
    return NextResponse.json({ error: 'Penarikan sudah diproses, tidak bisa dibatalkan' }, { status: 400 })
  }

  await supabase.from('withdrawals').update({ status: 'cancelled' }).eq('id', w.id)

  // Buka penahan saldo
  await supabase
    .from('wallet_transactions')
    .update({ status: 'cancelled', description: 'Penarikan dibatalkan oleh pengajar' })
    .eq('reference', w.id)
    .eq('type', 'withdrawal')
    .in('status', ['pending', 'processing'])

  return NextResponse.json({ success: true })
}
