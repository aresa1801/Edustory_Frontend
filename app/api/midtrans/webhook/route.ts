// app/api/midtrans/webhook/route.ts
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
    const body = await req.json();
    const {
      order_id,
      transaction_status,
      fraud_status,
      gross_amount,
      status_code,
      signature_key,
    } = body;

    // 1. Verifikasi signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const hash = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');

    if (hash !== signature_key) {
      console.warn('[webhook] Invalid signature for order:', order_id);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. Cari transaksi
    const { data: payment, error } = await supabase
      .from('payment_deposits')
      .select('id, payment_status')
      .eq('transaction_ref', order_id)
      .single();

    if (error || !payment) {
      console.warn('[webhook] Transaction not found:', order_id);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // 3. Idempotency — kalau sudah paid, jangan proses lagi
    if (payment.payment_status === 'paid') {
      console.log('[webhook] Already paid, skip:', order_id);
      return NextResponse.json({ status: 'OK' });
    }

    // 4. Tentukan status baru
    let newStatus: string | null = null;

    if (transaction_status === 'capture') {
      newStatus = fraud_status === 'accept' ? 'paid' : 'pending';
    } else if (transaction_status === 'settlement') {
      newStatus = 'paid';
    } else if (transaction_status === 'pending') {
      newStatus = 'pending';
    } else if (transaction_status === 'deny' || transaction_status === 'cancel') {
      newStatus = 'rejected';
    } else if (transaction_status === 'expire') {
      newStatus = 'expired';
    } else if (transaction_status === 'refund' || transaction_status === 'partial_refund') {
      newStatus = 'refunded';
    }

    if (!newStatus) {
      console.log('[webhook] Unhandled status:', transaction_status);
      return NextResponse.json({ status: 'OK' });
    }

    const updatePayload: Record<string, any> = {
      payment_status: newStatus,
    };
    if (newStatus === 'paid') {
      updatePayload.paid_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('payment_deposits')
      .update(updatePayload)
      .eq('id', payment.id);

    if (updateError) {
      console.error('[webhook] Update error:', updateError);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    // Trigger handle_payment_deposit_topup() otomatis nambah saldo wallet
    console.log(`[webhook] ${order_id} → ${newStatus}`);
    return NextResponse.json({ status: 'OK' });
  } catch (error) {
    console.error('[webhook] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}