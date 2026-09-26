// app/api/payouts/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text(); // Ambil raw body untuk verifikasi signature
    const signature = req.headers.get('Iris-Signature');
    const merchantKey = process.env.MIDTRANS_IRIS_MERCHANT_KEY;

    // 1. Verifikasi Signature
    const expectedSignature = crypto
      .createHash('sha512')
      .update(rawBody + merchantKey)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('[payouts/webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { reference_no, status, error_message } = body;

    console.log(`[payouts/webhook] Payout ${reference_no} status: ${status}`);

    // 2. Cari withdrawal berdasarkan reference_no
    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .select('id, user_id, amount')
      .eq('midtrans_reference_no', reference_no)
      .single();

    if (error || !withdrawal) {
      console.warn('[payouts/webhook] Withdrawal not found:', reference_no);
      return NextResponse.json({ status: 'OK' }); // Tetap OK agar Midtrans tidak retry
    }

    // 3. Update status berdasarkan notifikasi
    if (status === 'completed') {
      // Payout sukses! Saldo sudah di-freeze saat request, jadi tidak perlu update wallet lagi.
      // Cukup catat di ledger sebagai "penarikan selesai".
      await supabase
        .from('withdrawals')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('id', withdrawal.id);

      await supabase.from('wallet_transactions').insert({
        user_id: withdrawal.user_id,
        amount: -withdrawal.amount,
        type: 'withdrawal_completed',
        description: 'Penarikan saldo berhasil',
        reference_id: withdrawal.id,
      });

    } else if (status === 'failed' || status === 'rejected') {
      // Payout gagal. Kembalikan saldo ke wallet user.
      await supabase
        .from('withdrawals')
        .update({ status: 'failed', rejection_reason: error_message })
        .eq('id', withdrawal.id);

      // Kembalikan saldo yang di-freeze
      await supabase.rpc('increment_wallet_balance', {
        p_user_id: withdrawal.user_id,
        p_amount: withdrawal.amount,
      });

      await supabase.from('wallet_transactions').insert({
        user_id: withdrawal.user_id,
        amount: withdrawal.amount,
        type: 'withdrawal_refund',
        description: 'Penarikan gagal, saldo dikembalikan',
        reference_id: withdrawal.id,
      });
    }

    return NextResponse.json({ status: 'OK' });

  } catch (error) {
    console.error('[payouts/webhook] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}