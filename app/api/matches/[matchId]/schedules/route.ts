import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  console.log('🚀 [SCHEDULES] POST called', { matchId: params.matchId });

  try {
    const { matchId } = params;
    const body = await req.json();
    const { sessions } = body;

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json({ error: 'sessions array required' }, { status: 400 });
    }

    // === 1. Generate schedules_summary dari data frontend ===
    const summaryMap: Record<string, { subject: string; day: string; time: string; count: number }> = {};
    for (const s of sessions) {
      const dateObj = new Date(s.date);
      const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
      const timeSlot = s.timeSlot;
      const subject = s.subject || 'Tanpa Mapel';
      const key = `${subject}-${dayName}-${timeSlot}`;
      if (!summaryMap[key]) {
        summaryMap[key] = { subject, day: dayName, time: timeSlot, count: 0 };
      }
      summaryMap[key].count += 1;
    }
    const summaryArray = Object.values(summaryMap);
    console.log('📝 schedules_summary:', JSON.stringify(summaryArray, null, 2));

    // === 2. Init supabase admin ===
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // === 3. Ambil match lengkap ===
    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('id, student_id, tutor_id, tutor_hourly_rate, student_sessions_per_month, tutor_full_name')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('❌ Match not found:', matchError);
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // === 4. FREEZE LOGIC ===
    const total =
      (match.student_sessions_per_month || 0) * (match.tutor_hourly_rate || 0);

    if (total <= 0) {
      return NextResponse.json(
        { error: 'Total pembayaran tidak valid. Pastikan sesi & rate sudah terisi.' },
        { status: 400 }
      );
    }

    // 4a. Cek balance & frozen saat ini
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
      .eq('status', 'pending')
      .eq('type', 'session_hold');

    const frozen = (frozenRows || []).reduce(
      (sum, tx) => sum + Math.abs(Number(tx.amount) || 0),
      0
    );
    const available = balance - frozen;

    console.log('[FREEZE] balance:', balance, 'frozen:', frozen, 'available:', available, 'total needed:', total);

    if (available < total) {
      return NextResponse.json(
        {
          error: `Saldo tersedia tidak cukup. Dibutuhkan Rp ${total.toLocaleString(
            'id-ID'
          )}, tersedia Rp ${available.toLocaleString('id-ID')}. Silakan top-up terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    // 4b. Idempotency — cek apakah sudah ada freeze untuk match ini
    const { data: existingHold } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id, status')
      .eq('reference', matchId)
      .eq('type', 'session_hold')
      .maybeSingle();

    if (existingHold && existingHold.status === 'pending') {
      console.log('[FREEZE] Hold sudah ada, skip insert');
    } else if (!existingHold) {
      // 4c. Insert freeze tx
      const { error: freezeErr } = await supabaseAdmin
        .from('wallet_transactions')
        .insert({
          student_id: match.student_id,
          amount: -total,
          type: 'session_hold',
          status: 'pending',
          reference: matchId,
          description: `Penahanan Dana Sesi - ${match.tutor_full_name || 'Tutor'}`,
          balance_after: balance,
        });

      if (freezeErr) {
        console.error('❌ Freeze insert error:', freezeErr);
        return NextResponse.json(
          { error: 'Gagal menahan dana: ' + freezeErr.message },
          { status: 500 }
        );
      }
      console.log('✅ Freeze inserted:', total);
    }

    // === 5. Insert sessions ===
    const insertData = sessions.map((s: any) => {
      const startHour = parseInt(s.timeSlot.split(' - ')[0].split('.')[0]);
      const startMinute = parseInt(s.timeSlot.split(' - ')[0].split('.')[1]);
      const scheduledAt = new Date(
        `${s.date}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00+07:00`
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

    const { error: insertError } = await supabaseAdmin
      .from('sessions')
      .insert(insertData);

    if (insertError) {
      console.error('❌ Insert sessions error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // === 6. Update match ===
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
      console.error('❌ Update match error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('✅ Done');
    return NextResponse.json({
      success: true,
      schedules_summary: summaryArray,
      frozen: total,
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}