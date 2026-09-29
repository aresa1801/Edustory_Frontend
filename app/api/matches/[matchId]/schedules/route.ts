import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  console.log('🚀 [SCHEDULES] POST', { matchId: params.matchId });

  try {
    const { matchId } = params;
    const body = await req.json();
    const { sessions } = body;

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json({ error: 'sessions array required' }, { status: 400 });
    }

    // === 1. Generate summary ===
    const summaryMap: Record<string, any> = {};
    for (const s of sessions) {
      const dateObj = new Date(s.date);
      const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
      const key = `${s.subject}-${dayName}-${s.timeSlot}`;
      if (!summaryMap[key]) {
        summaryMap[key] = { subject: s.subject, day: dayName, time: s.timeSlot, count: 0 };
      }
      summaryMap[key].count += 1;
    }
    const summaryArray = Object.values(summaryMap);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // === 2. Ambil match ===
    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('id, student_id, tutor_id, tutor_hourly_rate, student_sessions_per_month, tutor_full_name')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const ratePerSession = Number(match.tutor_hourly_rate) || 0;
    const totalSessions = sessions.length;
    const totalFreeze = ratePerSession * totalSessions;

    if (ratePerSession <= 0) {
      return NextResponse.json({ error: 'Rate tutor tidak valid' }, { status: 400 });
    }

    // === 3. Cek available balance ===
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('student_id', match.student_id)
      .maybeSingle();

    const balance = Number(wallet?.balance) || 0;

    const { data: frozenRows } = await supabaseAdmin
      .from('wallet_transactions')
      .select('amount')
      .eq('student_id', match.student_id)
      .eq('type', 'session_hold')
      .in('status', ['pending', 'active', 'moved']);

    const frozen = (frozenRows || []).reduce(
      (sum, tx) => sum + Math.abs(Number(tx.amount) || 0),
      0
    );

    const available = balance - frozen;

    console.log('[FREEZE] balance:', balance, 'frozen:', frozen, 'available:', available, 'need:', totalFreeze);

    if (available < totalFreeze) {
      return NextResponse.json({
        error: `Saldo tersedia tidak cukup. Dibutuhkan Rp ${totalFreeze.toLocaleString('id-ID')}, tersedia Rp ${available.toLocaleString('id-ID')}.`,
      }, { status: 400 });
    }

    // === 4. Idempotency cleanup: hapus hold + sessions lama untuk match ini ===
    await supabaseAdmin
      .from('wallet_transactions')
      .delete()
      .eq('match_id', matchId)
      .eq('type', 'session_hold')
      .eq('status', 'pending');

    await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('match_id', matchId)
      .eq('status', 'scheduled');

    // === 5. Insert sessions ===
    const insertData = sessions.map((s: any) => {
      const [startPart] = s.timeSlot.split(' - ');
      const [hh, mm] = startPart.split('.');
      const scheduledAt = new Date(
        `${s.date}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00+07:00`
      );
      return {
        tutor_id: match.tutor_id,
        student_id: match.student_id,
        match_id: match.id,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: 60,
        status: 'scheduled',
        notes: s.subject || null,
      };
    });

    const { data: insertedSessions, error: insertError } = await supabaseAdmin
      .from('sessions')
      .insert(insertData)
      .select('id');

    if (insertError || !insertedSessions) {
      return NextResponse.json({ error: insertError?.message || 'Insert sessions failed' }, { status: 500 });
    }

    // === 6. Insert N holds (1 per sesi) ===
    const holdsData = insertedSessions.map((s) => ({
      student_id: match.student_id,
      tutor_id: match.tutor_id,
      match_id: matchId,
      amount: -ratePerSession,
      type: 'session_hold',
      status: 'pending',
      reference: s.id,
      description: `Penahanan Dana Sesi - ${match.tutor_full_name || 'Tutor'}`,
      balance_after: balance,
    }));

    const { error: freezeErr } = await supabaseAdmin
      .from('wallet_transactions')
      .insert(holdsData);

    if (freezeErr) {
      console.error('[SCHEDULES] freeze error:', freezeErr);
      return NextResponse.json({ error: 'Gagal menahan dana: ' + freezeErr.message }, { status: 500 });
    }

    // === 7. Update match ===
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('matches')
      .update({
        status: 'pending',
        initiated_by: 'student',
        schedules_summary: summaryArray,
        schedule_submitted_at: now,
      })
      .eq('id', matchId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      schedules_summary: summaryArray,
      frozen: totalFreeze,
      sessions_created: insertedSessions.length,
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}