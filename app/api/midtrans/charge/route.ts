// app/api/midtrans/charge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Body
    const body = await req.json();
    const { amount, customerName, customerEmail } = body;
    const parsedAmount = Math.round(Number(amount));

    if (!parsedAmount || parsedAmount < 1000) {
      return NextResponse.json({ error: 'Minimal top-up Rp 1.000' }, { status: 400 });
    }
    if (parsedAmount > 10_000_000) {
      return NextResponse.json({ error: 'Maksimal top-up Rp 10.000.000' }, { status: 400 });
    }

    // 3. Order ID unik (max 50 char)
    const orderId = `TOPUP-${Date.now()}-${user.id.slice(0, 8)}`;

    // 4. Simpan payment_deposits (status pending)
    //    ⚠️ Kalau nama kolom user-mu bukan `user_id`, ubah di sini.
    const { data: deposit, error: insertError } = await supabase
      .from('payment_deposits')
      .insert({
        user_id: user.id,
        amount: parsedAmount,
        payment_method: 'midtrans',
        payment_status: 'pending',
        payment_type: 'topup',
        transaction_ref: orderId,
      })
      .select('id')
      .single();

    if (insertError || !deposit) {
      console.error('[charge] insert deposit error:', insertError);
      return NextResponse.json({ error: 'Gagal membuat transaksi' }, { status: 500 });
    }

    // 5. Minta Snap Token ke Midtrans
    const snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://v0-edustory.vercel.app';

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: parsedAmount,
      },
      customer_details: {
        first_name: customerName || user.email?.split('@')[0] || 'Student',
        email: customerEmail || user.email || 'student@edustory.id',
      },
      item_details: [
        {
          id: 'TOPUP',
          price: parsedAmount,
          quantity: 1,
          name: 'Top Up Saldo EduStory',
        },
      ],
      callbacks: {
        finish: `${appUrl}/dashboard/student/payment/success`,
        error: `${appUrl}/dashboard/student/payment/error`,
        pending: `${appUrl}/dashboard/student/payment/pending`,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    return NextResponse.json({
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
      orderId,
      depositId: deposit.id,
    });
  } catch (error: any) {
    console.error('[charge] error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}