// app/api/payouts/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { withdrawalId } = await req.json();

    // 1. Ambil detail penarikan & rekening bank
    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .select(`
        id, amount, user_id,
        bank_accounts (bank_code, account_number, account_name)
      `)
      .eq('id', withdrawalId)
      .single();

    if (error || !withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    // 2. Siapkan payload untuk Midtrans Payouts
    const payload = {
      payouts: [
        {
          beneficiary_name: withdrawal.bank_accounts.account_name,
          beneficiary_account: withdrawal.bank_accounts.account_number,
          beneficiary_bank: withdrawal.bank_accounts.bank_code,
          amount: withdrawal.amount.toFixed(2), // Harus string dengan 2 desimal
          notes: `Withdrawal #${withdrawal.id.slice(0, 8)}`,
        },
      ],
    };

    // 3. Panggil Midtrans Payouts API
    const authString = Buffer.from(`${process.env.MIDTRANS_IRIS_API_KEY}:`).toString('base64');

    const response = await fetch('https://api.midtrans.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`,
        'X-Idempotency-Key': `withdrawal-${withdrawal.id}`, // Kunci unik untuk mencegah duplikasi
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[payouts/create] Midtrans error:', result);
      // Update status withdrawal menjadi failed
      await supabase
        .from('withdrawals')
        .update({ status: 'failed', rejection_reason: result.error_message || 'Midtrans error' })
        .eq('id', withdrawalId);
      
      return NextResponse.json({ error: 'Gagal membuat payout', detail: result }, { status: response.status });
    }

    // 4. Simpan reference_no dari Midtrans
    const referenceNo = result.payouts[0].reference_no;
    await supabase
      .from('withdrawals')
      .update({ status: 'processing', midtrans_reference_no: referenceNo })
      .eq('id', withdrawalId);

    return NextResponse.json({ success: true, reference_no: referenceNo });

  } catch (error: any) {
    console.error('[payouts/create] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}