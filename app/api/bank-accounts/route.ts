import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { BANK_CODES } from '@/lib/banks'

export const runtime = 'nodejs'

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

/** GET /api/bank-accounts — daftar rekening milik user yang login */
export async function GET(request: NextRequest) {
  const supabase = admin()
  const user = await getAuthUser(supabase, request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('bank_accounts')
    .select('id, bank_code, account_number, account_name, is_primary, created_at')
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[bank-accounts] list error:', error)
    return NextResponse.json({ error: 'Gagal memuat rekening' }, { status: 500 })
  }

  return NextResponse.json({ accounts: data || [] })
}

/** POST /api/bank-accounts — tambah rekening */
export async function POST(request: NextRequest) {
  const supabase = admin()
  const user = await getAuthUser(supabase, request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const bankCode = String(body.bank_code || '').trim().toLowerCase()
    const accountNumber = String(body.account_number || '').replace(/[^0-9]/g, '')
    const accountName = String(body.account_name || '').trim()
    const makePrimary = Boolean(body.is_primary)

    if (!BANK_CODES.includes(bankCode)) {
      return NextResponse.json({ error: 'Bank tidak didukung' }, { status: 400 })
    }
    if (accountNumber.length < 6 || accountNumber.length > 20) {
      return NextResponse.json({ error: 'Nomor rekening tidak valid' }, { status: 400 })
    }
    if (accountName.length < 3) {
      return NextResponse.json({ error: 'Nama pemilik rekening minimal 3 karakter' }, { status: 400 })
    }

    // Berapa rekening yang sudah ada → rekening pertama otomatis jadi utama
    const { count } = await supabase
      .from('bank_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const isPrimary = makePrimary || !count

    // Cek duplikat
    const { data: dup } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('bank_code', bankCode)
      .eq('account_number', accountNumber)
      .maybeSingle()

    if (dup) {
      return NextResponse.json({ error: 'Rekening ini sudah terdaftar' }, { status: 400 })
    }

    if (isPrimary) {
      await supabase.from('bank_accounts').update({ is_primary: false }).eq('user_id', user.id)
    }

    const { data, error } = await supabase
      .from('bank_accounts')
      .insert({
        user_id: user.id,
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
        is_primary: isPrimary,
      })
      .select('id, bank_code, account_number, account_name, is_primary, created_at')
      .single()

    if (error) {
      console.error('[bank-accounts] insert error:', error)
      return NextResponse.json({ error: 'Gagal menyimpan rekening: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, account: data }, { status: 201 })
  } catch (err: any) {
    console.error('[bank-accounts] POST error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}

/** PATCH /api/bank-accounts — jadikan sebuah rekening sebagai utama */
export async function PATCH(request: NextRequest) {
  const supabase = admin()
  const user = await getAuthUser(supabase, request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json().catch(() => ({ id: '' }))
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

  const { data: owned } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!owned) return NextResponse.json({ error: 'Rekening tidak ditemukan' }, { status: 404 })

  await supabase.from('bank_accounts').update({ is_primary: false }).eq('user_id', user.id)
  await supabase.from('bank_accounts').update({ is_primary: true }).eq('id', id)

  return NextResponse.json({ success: true })
}

/** DELETE /api/bank-accounts?id=... */
export async function DELETE(request: NextRequest) {
  const supabase = admin()
  const user = await getAuthUser(supabase, request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

  const { data: owned } = await supabase
    .from('bank_accounts')
    .select('id, is_primary')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!owned) return NextResponse.json({ error: 'Rekening tidak ditemukan' }, { status: 404 })

  // Jangan hapus rekening yang masih dipakai penarikan berjalan
  const { count: usedCount } = await supabase
    .from('withdrawals')
    .select('id', { count: 'exact', head: true })
    .eq('bank_account_id', id)
    .in('status', ['pending', 'processing'])

  if (usedCount) {
    return NextResponse.json(
      { error: 'Rekening masih dipakai penarikan yang sedang diproses' },
      { status: 400 }
    )
  }

  const { error } = await supabase.from('bank_accounts').delete().eq('id', id)
  if (error) {
    console.error('[bank-accounts] delete error:', error)
    return NextResponse.json({ error: 'Gagal menghapus rekening' }, { status: 500 })
  }

  // Kalau yang dihapus rekening utama, promosikan salah satu sisanya
  if (owned.is_primary) {
    const { data: rest } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
    if (rest?.[0]) {
      await supabase.from('bank_accounts').update({ is_primary: true }).eq('id', rest[0].id)
    }
  }

  return NextResponse.json({ success: true })
}
