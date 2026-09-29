import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;
  console.log('🚀 [SESSION COMPLETE]', sessionId);

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Ambil session
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .select('id, match_id, student_id, tutor_id, status, completed_at')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status === 'completed') {
      return NextResponse.json({ success: true, message: 'Already completed' });
    }

    // 2. Ambil match untuk rate & nama
    const { data: match } = await supabaseAdmin
      .from('matches')
      .select('tutor_hourly_rate, tutor_full_name')
      .eq('id', session.match_id)
      .single();

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const rate = Number(match.tutor_hourly_rate) || 0;
    const fee = Math.round(rate * 0.1);
    const tutorEarning = rate - fee;

    console.log('[COMPLETE] rate:', rate, 'fee:', fee, 'tutorEarning:', tutorEarning);

    // 3. Cari hold
    const { data: hold } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id, status')
      .eq('reference', sessionId)
      .eq('type', 'session_hold')
      .maybeSingle();

    if (!hold) {
      return NextResponse.json({ error: 'Hold not found' }, { status: 404 });
    }

    if (hold.status === 'completed') {
      return NextResponse.json({ success: true, message: 'Hold already completed' });
    }

    // 4. Update hold → completed
    await supabaseAdmin
      .from('wallet_transactions')
      .update({
        status: 'completed',
        type: 'session_payment',
        description: `Pembayaran Sesi - ${match.tutor_full_name || 'Tutor'}`,
      })
      .eq('id', hold.id);

    // 5. Deduct student balance
    const { data: studentWallet } = await supabaseAdmin
      .from('wallets')
      .select('id, balance')
      .eq('student_id', session.student_id)
      .maybeSingle();

    if (studentWallet) {
      const newBalance = (Number(studentWallet.balance) || 0) - rate;
      await supabaseAdmin
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', studentWallet.id);
    }

    // 6. Credit tutor balance
    const { data: tutorWallet } = await supabaseAdmin
      .from('wallets')
      .select('id, balance')
      .eq('tutor_id', session.tutor_id)
      .maybeSingle();

    let newTutorBalance = tutorEarning;
    if (tutorWallet) {
      newTutorBalance = (Number(tutorWallet.balance) || 0) + tutorEarning;
      await supabaseAdmin
        .from('wallets')
        .update({ balance: newTutorBalance })
        .eq('id', tutorWallet.id);
    } else {
      await supabaseAdmin
        .from('wallets')
        .insert({ tutor_id: session.tutor_id, balance: tutorEarning });
    }

    // 7. Insert tutor earning row
    await supabaseAdmin.from('wallet_transactions').insert({
      tutor_id: session.tutor_id,
      match_id: session.match_id,
      amount: tutorEarning,
      type: 'session_earning',
      status: 'completed',
      reference: sessionId,
      description: `Pendapatan Sesi - ${match.tutor_full_name || 'Tutor'}`,
      balance_after: newTutorBalance,
    });

    // 8. Credit platform wallet
    const { data: pw } = await supabaseAdmin
      .from('platform_wallet')
      .select('id, balance')
      .limit(1)
      .maybeSingle();

    if (pw) {
      const newPlatformBalance = (Number(pw.balance) || 0) + fee;
      await supabaseAdmin
        .from('platform_wallet')
        .update({ balance: newPlatformBalance, updated_at: new Date().toISOString() })
        .eq('id', pw.id);

      await supabaseAdmin.from('wallet_transactions').insert({
        match_id: session.match_id,
        amount: fee,
        type: 'platform_fee',
        status: 'completed',
        reference: sessionId,
        description: `Biaya Platform (10%) - Sesi ${sessionId.slice(0, 8)}`,
        balance_after: newPlatformBalance,
      });
    }

    // 9. Update session status
    await supabaseAdmin
      .from('sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return NextResponse.json({ success: true, rate, fee, tutorEarning });
  } catch (err) {
    console.error('[SESSION COMPLETE] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}