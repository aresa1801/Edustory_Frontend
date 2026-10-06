// app/api/payouts/webhook/route.ts
//
// Webhook dari Midtrans Iris (Payouts).
// Model saldo: saat pengajar mengajukan penarikan, saldo DITAHAN
// (wallet_transactions type='withdrawal', status='pending'). Saldo
// wallets.balance baru dikurangi saat payout benar-benar selesai.
//
// CATATAN PERBAIKAN: versi sebelumnya meng-insert kolom `user_id`/`reference_id`
// yang TIDAK ADA di tabel wallet_transactions, dan memanggil RPC
// `increment_wallet_balance` yang rusak — jadi webhook selalu gagal.

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
    const rawBody = await req.text(); // raw body untuk verifikasi signature
    const signature = req.headers.get('Iris-Signature');
    const merchantKey = process.env.MIDTRANS_IRIS_MERCHANT_KEY || '';

    // 1. Verifikasi signature
    const expectedSignature = crypto
      .createHash('sha512')
      .update(rawBody + merchantKey)
      .digest('hex');

    if (!merchantKey || signature !== expectedSignature) {
      console.warn('[payouts/webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { reference_no, status, error_message } = body;

    console.log(`[payouts/webhook] Payout ${reference_no} status: ${status}`);

    // 2. Cari withdrawal berdasarkan reference_no
    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .select('id, user_id, amount, status')
      .eq('midtrans_reference_no', reference_no)
      .single();

    if (error || !withdrawal) {
      console.warn('[payouts/webhook] Withdrawal not found:', reference_no);
      return NextResponse.json({ status: 'OK' }); // OK agar Midtrans tidak retry
    }

    // Idempotency: sudah final → abaikan
    if (['completed', 'failed', 'rejected', 'cancelled'].includes(withdrawal.status)) {
      return NextResponse.json({ status: 'OK' });
    }

    const { data: tutor } = await supabase
      .from('tutors')
      .select('id')
      .eq('user_id', withdrawal.user_id)
      .maybeSingle();

    // 3. Update status berdasarkan notifikasi
    if (status === 'completed') {
      await supabase
        .from('withdrawals')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('id', withdrawal.id);

      // Realisasikan potongan saldo + tutup penahan
      if (tutor) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('tutor_id', tutor.id)
          .maybeSingle();

        const newBalance = Math.max(0, (Number(wallet?.balance) || 0) - Number(withdrawal.amount));

        if (wallet) {
          await supabase.from('wallets').update({ balance: newBalance }).eq('id', wallet.id);
        }

        const { data: hold } = await supabase
          .from('wallet_transactions')
          .select('id')
          .eq('reference', withdrawal.id)
          .eq('type', 'withdrawal')
          .in('status', ['pending', 'processing'])
          .maybeSingle();

        if (hold) {
          await supabase
            .from('wallet_transactions')
            .update({ status: 'completed', balance_after: newBalance })
            .eq('id', hold.id);
        } else {
          await supabase.from('wallet_transactions').insert({
            tutor_id: tutor.id,
            amount: -Number(withdrawal.amount),
            type: 'withdrawal',
            status: 'completed',
            reference: withdrawal.id,
            description: 'Penarikan saldo berhasil',
            balance_after: newBalance,
          });
        }
      }
    } else if (status === 'failed' || status === 'rejected') {
      // Gagal → cukup buka penahan saldo (balance tidak pernah dikurangi)
      await supabase
        .from('withdrawals')
        .update({ status: 'failed', rejection_reason: error_message || 'Payout gagal' })
        .eq('id', withdrawal.id);

      await supabase
        .from('wallet_transactions')
        .update({ status: 'cancelled', description: 'Penarikan gagal, saldo dikembalikan' })
        .eq('reference', withdrawal.id)
        .eq('type', 'withdrawal')
        .in('status', ['pending', 'processing']);
    }

    return NextResponse.json({ status: 'OK' });
  } catch (error) {
    console.error('[payouts/webhook] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
