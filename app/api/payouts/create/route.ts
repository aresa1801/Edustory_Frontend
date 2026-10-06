// app/api/payouts/create/route.ts
//
// ⚠️ Sebelumnya endpoint ini TERBUKA (siapa pun bisa memicu payout Midtrans
// hanya dengan menebak withdrawalId). Sekarang wajib:
//   - Authorization: Bearer <token admin>, atau
//   - header x-payout-key yang cocok dengan env PAYOUT_INTERNAL_KEY.
//
// Admin panel sekarang memakai POST /api/admin/withdrawals (action=approve).
// Endpoint ini dipertahankan untuk pemanggil internal/cron.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createIrisPayout, MIDTRANS_IRIS_ENABLED } from '@/lib/payouts';

export const runtime = 'nodejs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@edustory.com';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function authorize(req: NextRequest, supabaseAdmin: ReturnType<typeof admin>) {
  const internalKey = process.env.PAYOUT_INTERNAL_KEY;
  const headerKey = req.headers.get('x-payout-key');
  if (internalKey && headerKey && headerKey === internalKey) return true;

  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!token) return false;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return false;

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();

  return profile?.role === 'admin' || profile?.email === ADMIN_EMAIL;
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = admin();

    if (!(await authorize(req, supabaseAdmin))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!MIDTRANS_IRIS_ENABLED) {
      return NextResponse.json(
        { error: 'Midtrans Payouts belum dikonfigurasi (MIDTRANS_IRIS_API_KEY kosong)' },
        { status: 409 }
      );
    }

    const { withdrawalId } = await req.json();
    if (!withdrawalId) {
      return NextResponse.json({ error: 'withdrawalId wajib' }, { status: 400 });
    }

    // 1. Ambil detail penarikan & rekening bank
    const { data: withdrawal, error } = await supabaseAdmin
      .from('withdrawals')
      .select(`
        id, amount, user_id, status,
        bank_accounts (bank_code, account_number, account_name)
      `)
      .eq('id', withdrawalId)
      .single();

    if (error || !withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    const account: any = Array.isArray((withdrawal as any).bank_accounts)
      ? (withdrawal as any).bank_accounts[0]
      : (withdrawal as any).bank_accounts;

    if (!account) {
      return NextResponse.json({ error: 'Rekening bank tidak ditemukan' }, { status: 400 });
    }

    // 2. Kirim ke Midtrans Iris
    const result = await createIrisPayout({
      withdrawalId: withdrawal.id,
      amount: Number(withdrawal.amount),
      bankCode: account.bank_code,
      accountNumber: account.account_number,
      accountName: account.account_name,
    });

    if (!result.ok) {
      return NextResponse.json({ error: 'Gagal membuat payout', detail: result.error }, { status: 502 });
    }

    // 3. Simpan reference_no dari Midtrans
    await supabaseAdmin
      .from('withdrawals')
      .update({ status: 'processing', midtrans_reference_no: result.referenceNo })
      .eq('id', withdrawalId);

    await supabaseAdmin
      .from('wallet_transactions')
      .update({ status: 'processing' })
      .eq('reference', withdrawalId)
      .eq('type', 'withdrawal')
      .in('status', ['pending', 'processing']);

    return NextResponse.json({ success: true, reference_no: result.referenceNo });
  } catch (error: any) {
    console.error('[payouts/create] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
