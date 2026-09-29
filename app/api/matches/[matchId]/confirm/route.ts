import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  console.log('🚀 [CONFIRM] API called', { matchId: params.matchId });

  try {
    const { matchId } = params;
    const body = await req.json();
    const { action } = body;

    console.log('📥 Action:', action);

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "accept" or "reject".' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // === 1. Ambil match ===
    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('id, tutor_id, student_id, status, initiated_by, tutor_hourly_rate, student_sessions_per_month, tutor_full_name')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('❌ Match not found:', matchError);
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    console.log('✅ Match found:', match.id, 'status:', match.status);

    // === 2. Cek existing hold ===
    const { data: existingHold } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id, status, amount')
      .eq('reference', matchId)
      .eq('type', 'session_hold')
      .maybeSingle();

    // ===== HANDLE ACCEPT =====
    // 🔥 Tutor setuju = tanda tangan kontrak. UANG TETAP DIBEKUKAN.
    //    Transfer ke tutor baru terjadi saat sesi beneran selesai (fitur terpisah).
    if (action === 'accept') {
      if (existingHold?.status === 'active') {
        console.log('⚠️ Hold sudah active, skip');
      } else if (existingHold?.status === 'completed') {
        console.log('⚠️ Hold sudah completed, skip');
      } else if (existingHold && existingHold.status === 'pending') {
        // Update: pending → active (dana masih dibekukan, TIDAK dipindah)
        const { error: holdErr } = await supabaseAdmin
          .from('wallet_transactions')
          .update({
            status: 'active',
            description: `Dana Sesi Aktif - ${match.tutor_full_name || 'Tutor'}`,
          })
          .eq('id', existingHold.id);

        if (holdErr) {
          console.error('❌ Hold update error:', holdErr);
          return NextResponse.json(
            { error: 'Gagal mengaktifkan dana: ' + holdErr.message },
            { status: 500 }
          );
        }
        console.log('✅ Hold → active (dana tetap dibekukan)');
      } else {
        console.warn('⚠️ Tidak ada session_hold pending untuk diaktifkan');
      }
    }

    // ===== HANDLE REJECT =====
    // Tutor tolak = dana dikembalikan ke student (unfreeze)
    if (action === 'reject') {
      if (existingHold?.status === 'pending' || existingHold?.status === 'active') {
        const { error: holdErr } = await supabaseAdmin
          .from('wallet_transactions')
          .update({
            status: 'cancelled',
            description: `Penahanan Dana Dibatalkan - ${match.tutor_full_name || 'Tutor'}`,
          })
          .eq('id', existingHold.id);

        if (holdErr) console.error('❌ Hold cancel error:', holdErr);
        console.log('✅ Hold cancelled (dana dikembalikan)');
      } else {
        console.log('⚠️ Tidak ada hold untuk di-cancel');
      }
    }

    // === 3. Update match status ===
    let updatePayload: any = {};
    if (action === 'accept') {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 75);
      updatePayload = {
        status: 'matched',
        accepted_at: now.toISOString(),
        contract_end_date: endDate.toISOString(),
      };
    } else if (action === 'reject') {
      updatePayload = { status: 'declined' };
    }

    const { error: updateError } = await supabaseAdmin
      .from('matches')
      .update(updatePayload)
      .eq('id', matchId);

    if (updateError) {
      console.error('❌ Update match error:', updateError);
      return NextResponse.json(
        { error: 'Update failed: ' + updateError.message },
        { status: 500 }
      );
    }

    // === 4. Insert match_schedules (khusus accept) ===
    if (action === 'accept') {
      const { data: existingSchedule } = await supabaseAdmin
        .from('match_schedules')
        .select('id')
        .eq('match_id', matchId)
        .maybeSingle();

      if (!existingSchedule) {
        const { data: matchData } = await supabaseAdmin
          .from('matches')
          .select('schedules_summary, student_id, tutor_id')
          .eq('id', matchId)
          .single();

        if (matchData) {
          await supabaseAdmin.from('match_schedules').insert({
            match_id: matchId,
            student_id: matchData.student_id,
            tutor_id: matchData.tutor_id,
            schedules_summary_fix: matchData.schedules_summary || null,
            status: 'active',
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}