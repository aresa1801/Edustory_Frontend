import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MIN_WITHDRAWAL = 10000

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

async function resolveWallet(supabase: any, userId: string) {
  const { data: tutor } = await supabase.from('tutors').select('id, full_name').eq('user_id', userId).maybeSingle()
  if (tutor) return { role: 'tutor' as const, tutorId: tutor.id, studentId: null as string | null, name: tutor.full_name }
  const { data: student } = await supabase.from('students').select('id, name').eq('user_id', userId).maybeSingle()
  if (student) return { role: 'student' as const, tutorId: null as string | null, studentId: student.id, name: student.name }
  return null
}

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = admin()
  const { data, error } = await supabase
    .from('withdrawals')
    .select('id, amount, status, created_at, processed_at, rejection_reason, midtrans_reference_no, bank_accounts(bank_code, account_number, account_name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ withdrawals: data ?? [] })
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const amount = Math.floor(Number(body.amount))
  const bankName = String(body.bank_name || '').trim()
  const accountNumber = String(body.account_number || '').replace(/\s+/g, '')
  const accountName = String(body.account_name || '').trim()

  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) {
    return NextResponse.json({ error: `Minimal penarikan Rp ${MIN_WITHDRAWAL.toLocaleString('id-ID')}` }, { status: 400 })
  }
  if (!bankName || accountNumber.length < 6 || !accountName) {
    return NextResponse.json({ error: 'Data rekening belum lengkap.' }, { status: 400 })
  }

  const supabase = admin()
  const identity = await resolveWallet(supabase, user.id)
  if (!identity) return NextResponse.json({ error: 'Profil tutor/siswa tidak ditemukan.' }, { status: 404 })

  const walletQuery = supabase.from('wallets').select('id, balance')
  const { data: wallet } = identity.role === 'tutor'
    ? await walletQuery.eq('tutor_id', identity.tutorId).maybeSingle()
    : await walletQuery.eq('student_id', identity.studentId).maybeSingle()

  const balance = Number(wallet?.balance ?? 0)

  const { data: pendingRows } = await supabase
    .from('withdrawals')
    .select('amount')
    .eq('user_id', user.id)
    .eq('status', 'pending')
  const pendingTotal = (pendingRows ?? []).reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0)

  if (amount > balance - pendingTotal) {
    return NextResponse.json(
      {
        error: `Saldo yang bisa ditarik Rp ${Math.max(0, balance - pendingTotal).toLocaleString('id-ID')} (sudah dikurangi permintaan yang masih diproses).`,
        balance,
        pending: pendingTotal,
      },
      { status: 400 },
    )
  }

  // Simpan / perbarui rekening
  let bankAccountId: string | null = null
  const { data: existingBank } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('bank_code', bankName.toLowerCase())
    .eq('account_number', accountNumber)
    .maybeSingle()

  if (existingBank) {
    bankAccountId = existingBank.id
  } else {
    const { data: created, error: bankError } = await supabase
      .from('bank_accounts')
      .insert({ user_id: user.id, bank_code: bankName.toLowerCase(), account_number: accountNumber, account_name: accountName, is_primary: true })
      .select('id')
      .single()
    if (bankError) return NextResponse.json({ error: 'Gagal menyimpan rekening.' }, { status: 500 })
    bankAccountId = created.id
  }

  const { data: withdrawal, error } = await supabase
    .from('withdrawals')
    .insert({ user_id: user.id, bank_account_id: bankAccountId, amount, status: 'pending' })
    .select('id, amount, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    withdrawal,
    balance,
    availableAfter: Math.max(0, balance - pendingTotal - amount),
    message: `Permintaan penarikan Rp ${amount.toLocaleString('id-ID')} dikirim ke admin. Dana diproses setelah 1 hari kerja.`,
  })
}
