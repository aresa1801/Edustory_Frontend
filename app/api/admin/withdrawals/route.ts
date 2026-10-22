import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const HOLD_MS = 24 * 60 * 60 * 1000

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

async function requireAdmin(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const supabase = admin()
  const { data: profile } = await supabase.from('user_profiles').select('role, name').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { supabase, user }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  const supabase = auth.supabase!

  const { data: rows, error } = await supabase
    .from('withdrawals')
    .select('id, user_id, amount, status, created_at, processed_at, rejection_reason, bank_accounts(bank_code, account_number, account_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = [...new Set((rows ?? []).map((row: any) => row.user_id))]
  const [{ data: profiles }, { data: tutors }, { data: students }] = await Promise.all([
    supabase.from('user_profiles').select('id, name, email, role').in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']),
    supabase.from('tutors').select('id, user_id, full_name').in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']),
    supabase.from('students').select('id, user_id, name').in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']),
  ])

  const profileById = new Map((profiles ?? []).map((row: any) => [row.id, row]))
  const tutorByUser = new Map((tutors ?? []).map((row: any) => [row.user_id, row]))
  const studentByUser = new Map((students ?? []).map((row: any) => [row.user_id, row]))

  const withdrawals = (rows ?? []).map((row: any) => {
    const tutor = tutorByUser.get(row.user_id)
    const student = studentByUser.get(row.user_id)
    const profile = profileById.get(row.user_id)
    return {
      ...row,
      user_name: profile?.name || tutor?.full_name || student?.name || 'Pengguna',
      user_email: profile?.email ?? null,
      role: tutor ? 'tutor' : student ? 'student' : profile?.role ?? 'user',
      available_at: new Date(new Date(row.created_at).getTime() + HOLD_MS).toISOString(),
    }
  })

  return NextResponse.json({ withdrawals })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) return auth.error
  const supabase = auth.supabase!

  const body = await request.json().catch(() => ({}))
  const id = String(body.id || '')
  const action = String(body.action || '')
  const reason = String(body.reason || '').trim()
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 })
  }

  const { data: withdrawal } = await supabase
    .from('withdrawals')
    .select('id, user_id, amount, status, created_at')
    .eq('id', id)
    .maybeSingle()

  if (!withdrawal) return NextResponse.json({ error: 'Permintaan tidak ditemukan.' }, { status: 404 })
  if (withdrawal.status !== 'pending') return NextResponse.json({ error: 'Permintaan ini sudah diproses.' }, { status: 409 })

  if (action === 'reject') {
    const { error } = await supabase
      .from('withdrawals')
      .update({ status: 'rejected', rejection_reason: reason || 'Ditolak admin', processed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, status: 'rejected' })
  }

  // Minimal 1 hari sejak pengajuan
  const readyAt = new Date(withdrawal.created_at).getTime() + HOLD_MS
  if (Date.now() < readyAt) {
    const hoursLeft = Math.ceil((readyAt - Date.now()) / (60 * 60 * 1000))
    return NextResponse.json(
      { error: `Belum bisa dicairkan. Tunggu ${hoursLeft} jam lagi (aturan minimal 1 hari).`, readyAt: new Date(readyAt).toISOString() },
      { status: 403 },
    )
  }

  const { data: tutor } = await supabase.from('tutors').select('id').eq('user_id', withdrawal.user_id).maybeSingle()
  const { data: student } = await supabase.from('students').select('id').eq('user_id', withdrawal.user_id).maybeSingle()
  if (!tutor && !student) return NextResponse.json({ error: 'Profil pengguna tidak ditemukan.' }, { status: 404 })

  const walletQuery = supabase.from('wallets').select('id, balance')
  const { data: wallet } = tutor
    ? await walletQuery.eq('tutor_id', tutor.id).maybeSingle()
    : await walletQuery.eq('student_id', student!.id).maybeSingle()

  const balance = Number(wallet?.balance ?? 0)
  if (balance < Number(withdrawal.amount)) {
    return NextResponse.json({ error: `Saldo wallet tidak cukup (Rp ${balance.toLocaleString('id-ID')}).` }, { status: 400 })
  }

  const nextBalance = balance - Number(withdrawal.amount)

  const { error: walletError } = await supabase.from('wallets').update({ balance: nextBalance, updated_at: new Date().toISOString() }).eq('id', wallet!.id)
  if (walletError) return NextResponse.json({ error: 'Gagal memotong saldo wallet.' }, { status: 500 })

  await supabase.from('wallet_transactions').insert({
    tutor_id: tutor?.id ?? null,
    student_id: student?.id ?? null,
    amount: -Number(withdrawal.amount),
    type: 'withdrawal',
    status: 'completed',
    reference: withdrawal.id,
    description: 'Penarikan saldo disetujui admin',
    balance_after: nextBalance,
  })

  const { error } = await supabase
    .from('withdrawals')
    .update({ status: 'completed', processed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, status: 'completed', balanceAfter: nextBalance })
}
