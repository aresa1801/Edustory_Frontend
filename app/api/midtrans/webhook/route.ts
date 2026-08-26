// app/api/midtrans/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Inisialisasi Supabase Client
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
      gross_amount,
      status_code,
      signature_key,
    } = body;

    // 1. Verifikasi Signature untuk memastikan notifikasi asli dari Midtrans
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const hash = crypto
      .createHash('sha512')
      .update(order_id + status_code + gross_amount + serverKey)
      .digest('hex');

    if (hash !== signature_key) {
      console.warn('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 2. Cari transaksi di database berdasarkan order_id
    const { data: payment, error } = await supabase
      .from('payment_deposits')
      .select('id')
      .eq('transaction_ref', order_id)
      .single();

    if (error || !payment) {
      console.warn('Transaction not found:', order_id);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // 3. Update status jika transaksi berhasil
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      await supabase
        .from('payment_deposits')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      // Fungsi trigger di database akan otomatis menambah saldo wallet
    }

    return NextResponse.json({ status: 'OK' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
  
}