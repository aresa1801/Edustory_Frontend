// app/api/midtrans/charge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // ===== 0. Cek env vars =====
    const requiredEnvs = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY,
      NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    };

    const missingEnvs = Object.entries(requiredEnvs)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    if (missingEnvs.length > 0) {
      console.error('[charge] MISSING ENV VARS:', missingEnvs);
      return NextResponse.json(
        { error: `Env vars missing: ${missingEnvs.join(', ')}`, stage: 'env_check' },
        { status: 500 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ===== 1. Auth =====
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: no bearer token', stage: 'auth' },
        { status: 401 }
      );
    }
    const token = authHeader.slice(7);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('[charge] auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized: ' + (authError?.message || 'invalid token'), stage: 'auth' },
        { status: 401 }
      );
    }

    // ===== 2. Body =====
    const body = await req.json();
    const { amount, customerName, customerEmail } = body;
    const parsedAmount = Math.round(Number(amount));

    if (!parsedAmount || parsedAmount < 1000) {
      return NextResponse.json(
        { error: 'Minimal top-up Rp 1.000', stage: 'validation' },
        { status: 400 }
      );
    }
    if (parsedAmount > 10_000_000) {
      return NextResponse.json(
        { error: 'Maksimal top-up Rp 10.000.000', stage: 'validation' },
        { status: 400 }
      );
    }

    // ===== 3. Ambil student_id dari students table =====
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (studentError || !student) {
      console.error('[charge] student lookup error:', studentError);
      return NextResponse.json(
        {
          error: 'Student profile tidak ditemukan',
          stage: 'student_lookup',
          detail: studentError?.message || 'No student row found for this user',
        },
        { status: 404 }
      );
    }

    // ===== 4. Order ID =====
    const orderId = `TOPUP-${Date.now()}-${student.id.slice(0, 8)}`;

    // ===== 5. Insert ke payment_deposits =====
    const insertPayload = {
      student_id: student.id,
      amount: parsedAmount,
      payment_method: 'qris',
      payment_status: 'pending',
      payment_type: 'topup',
      transaction_ref: orderId,
    };

    console.log('[charge] insert payload:', JSON.stringify(insertPayload));

    const { data: deposit, error: insertError } = await supabase
      .from('payment_deposits')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError || !deposit) {
      console.error('[charge] INSERT ERROR:', JSON.stringify(insertError, null, 2));
      return NextResponse.json(
        {
          error: 'Gagal membuat transaksi (DB insert)',
          stage: 'db_insert',
          detail: insertError?.message || 'No deposit returned',
          hint: insertError?.hint || null,
          code: insertError?.code || null,
        },
        { status: 500 }
      );
    }

    console.log('[charge] deposit created:', deposit.id);

    // ===== 6. Midtrans Snap =====
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

    console.log('[charge] requesting snap token for order:', orderId);

    let transaction;
    try {
      transaction = await snap.createTransaction(parameter);
    } catch (midtransError: any) {
      console.error('[charge] MIDTRANS ERROR:', JSON.stringify(midtransError, null, 2));
      await supabase.from('payment_deposits').delete().eq('id', deposit.id);
      return NextResponse.json(
        {
          error: 'Gagal membuat transaksi (Midtrans)',
          stage: 'midtrans',
          detail: midtransError?.message || String(midtransError),
          apiResponse: midtransError?.ApiResponse || null,
        },
        { status: 500 }
      );
    }

    console.log('[charge] success:', orderId);

    return NextResponse.json({
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
      orderId,
      depositId: deposit.id,
    });
  } catch (error: any) {
    console.error('[charge] UNCAUGHT ERROR:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        stage: 'uncaught',
        detail: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}