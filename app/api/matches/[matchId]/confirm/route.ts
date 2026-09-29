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
      .select('id, tutor_id, student_id, status, initiated_by, tutor_full_name')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // ===== HANDLE ACCEPT =====
    // Dana TETAP DIBEKUKAN. Transfer ke tutor baru terjadi saat sesi selesai.
    if (action === 'accept') {
      const { error: holdErr } = await supabaseAdmin
        .from('wallet_transactions')
        .update({
          status: 'active',
          description: `Dana Sesi Aktif - ${match.tutor_full_name || 'Tutor'}`,
        })
        .eq('match_id', matchId)
        .eq('type', 'session_hold')
        .eq('status', 'pending');

      if (holdErr) console.error('❌ Hold update error:', holdErr);
      console.log('✅ Holds → active');
    }

    // ===== HANDLE REJECT =====
    // Semua hold → cancelled (unfreeze total)
    if (action === 'reject') {
      await supabaseAdmin
        .from('wallet_transactions')
        .update({
          status: 'cancelled',
          description: `Penahanan Dana Dibatalkan - ${match.tutor_full_name || 'Tutor'}`,
        })
        .eq('match_id', matchId)
        .eq('type', 'session_hold')
        .in('status', ['pending', 'active']);
    }

    // === 2. Update match status ===
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
      return NextResponse.json({ error: 'Update failed: ' + updateError.message }, { status: 500 });
    }

    // === 3. Insert match_schedules (khusus accept) ===
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