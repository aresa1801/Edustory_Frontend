import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calcSessionFee, PLATFORM_FEE_PERCENT } from '@/lib/fees';

export const runtime = 'nodejs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@edustory.com';

// ============================================================
// AUTH
// ------------------------------------------------------------
// Sebelumnya route ini TANPA autentikasi: siapa pun yang tahu/nebak
// session id bisa memicu pencairan dana. Sekarang wajib salah satu:
//  - Bearer CRON_SECRET (pemanggil mesin/internal), atau
//  - user login yang memang siswa/tutor pemilik sesi tersebut, atau admin.
// ============================================================
async function resolveToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!bearer) return { ok: false as const, reason: 'no token' };

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && bearer === cronSecret) return { ok: true as const, isMachine: true, userId: null as string | null };

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(bearer);
  if (error || !user) return { ok: false as const, reason: 'invalid token' };
  return { ok: true as const, isMachine: false, userId: user.id };
}

async function callerOwnsSession(
  supabaseAdmin: any,
  userId: string,
  session: { student_id: string; tutor_id: string }
): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role, email')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.role === 'admin' || profile?.email === ADMIN_EMAIL) return true;

  if (profile?.role === 'siswa') {
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (student?.id && student.id === session.student_id) return true;
  }

  if (profile?.role === 'tutor') {
    const { data: tutor } = await supabaseAdmin
      .from('tutors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (tutor?.id && tutor.id === session.tutor_id) return true;
  }

  return false;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;
  console.log('🚀 [SESSION COMPLETE]', sessionId);

  try {
    const auth = await resolveToken(req);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // 1b. Otorisasi: hanya pemilik sesi (siswa/tutor) atau admin, kecuali pemanggil mesin
    if (!auth.isMachine && auth.userId) {
      const allowed = await callerOwnsSession(supabaseAdmin, auth.userId, session);
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden: bukan pemilik sesi ini' }, { status: 403 });
      }
    }

    // 🛡️ Guard: session cancelled → tidak boleh complete
    if (session.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Sesi sudah dibatalkan, tidak bisa diselesaikan' },
        { status: 400 }
      );
    }

    // 2. Ambil match untuk rate & nama
    const { data: match, error: matchErr } = await supabaseAdmin
      .from('matches')
      .select('tutor_hourly_rate, tutor_full_name')
      .eq('id', session.match_id)
      .single();

    if (matchErr || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const { rate, fee, tutorEarning } = calcSessionFee(Number(match.tutor_hourly_rate) || 0);

    if (rate <= 0) {
      return NextResponse.json({ error: 'Rate tutor tidak valid' }, { status: 400 });
    }

    console.log('[COMPLETE] rate:', rate, 'fee:', fee, 'tutorEarning:', tutorEarning);

    // 3. Cari hold
    const { data: hold, error: holdErr } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id, status')
      .eq('reference', sessionId)
      .eq('type', 'session_hold')
      .maybeSingle();

    if (holdErr) {
      console.error('[SESSION COMPLETE] hold fetch error:', holdErr);
      return NextResponse.json({ error: 'Failed to fetch hold' }, { status: 500 });
    }

    if (!hold) {
      return NextResponse.json({ error: 'Hold not found' }, { status: 404 });
    }

    // 🛡️ Guard: hold sudah completed → idempotent
    if (hold.status === 'completed') {
      return NextResponse.json({ success: true, message: 'Hold already completed' });
    }

    // 🛡️ Guard: hold cancelled → tidak bisa complete
    if (hold.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Dana sudah dikembalikan, tidak bisa diselesaikan' },
        { status: 400 }
      );
    }

    // 🛡️ Guard: hold moved → tidak bisa complete (dana sudah pindah ke sesi lain)
    if (hold.status === 'moved') {
      return NextResponse.json(
        { error: 'Dana sudah dipindah ke sesi lain, tidak bisa diselesaikan' },
        { status: 400 }
      );
    }

    // 4. CLAIM hold secara atomik (conditional UPDATE sebagai mutex).
    //    Kalau tidak ada row yang ter-claim, berarti instance lain sudah memproses.
    const { data: claimed, error: updateHoldErr } = await supabaseAdmin
      .from('wallet_transactions')
      .update({
        status: 'completed',
        type: 'session_payment',
        description: `Pembayaran Sesi - ${match.tutor_full_name || 'Tutor'}`,
      })
      .eq('id', hold.id)
      .in('status', ['pending', 'active'])
      .select('id')
      .maybeSingle();

    if (updateHoldErr) {
      console.error('[SESSION COMPLETE] update hold error:', updateHoldErr);
      return NextResponse.json({ error: 'Failed to update hold' }, { status: 500 });
    }

    if (!claimed) {
      // Sudah diproses oleh pemanggil lain → anggap sukses (idempotent).
      return NextResponse.json({ success: true, message: 'Hold already processed' });
    }

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
        description: `Biaya Platform (${PLATFORM_FEE_PERCENT}%) - Sesi ${sessionId.slice(0, 8)}`,
        balance_after: newPlatformBalance,
      });
    } else {
      await supabaseAdmin.from('platform_wallet').insert({ balance: fee });
    }

    // 9. Update session status
    const { error: updateSessionErr } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateSessionErr) {
      console.error('[SESSION COMPLETE] update session error:', updateSessionErr);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    console.log(`✅ [SESSION COMPLETE] ${sessionId} — tutor +${tutorEarning}, platform +${fee}`);

    return NextResponse.json({ success: true, rate, fee, tutorEarning });
  } catch (err) {
    console.error('[SESSION COMPLETE] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
