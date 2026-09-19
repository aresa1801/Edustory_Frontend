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

    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('id, tutor_id, student_id, status, initiated_by')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('❌ Match not found:', matchError);
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    console.log('✅ Match found:', match);

    // ===== PREPARE PAYLOAD =====
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
      console.log(
        `📅 Kontrak dimulai: ${now.toISOString()}, berakhir: ${endDate.toISOString()}`
      );
    } else if (action === 'reject') {
      updatePayload = {
        status: 'declined',
      };
    }

    console.log('🔄 Updating match with payload:', updatePayload);

    const { error: updateError } = await supabaseAdmin
      .from('matches')
      .update(updatePayload)
      .eq('id', matchId);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return NextResponse.json(
        { error: 'Update failed: ' + updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Match updated successfully');

    // ===== INSERT INTO match_schedules jika action ACCEPT =====
    if (action === 'accept') {
      const { data: matchData, error: fetchError } = await supabaseAdmin
        .from('matches')
        .select('schedules_summary, student_id, tutor_id')
        .eq('id', matchId)
        .single();

      if (fetchError || !matchData) {
        console.error(
          '❌ Failed to fetch match data for match_schedules:',
          fetchError
        );
        return NextResponse.json(
          {
            error:
              'Gagal mengambil data match untuk membuat jadwal: ' +
              (fetchError?.message || 'matchData kosong'),
          },
          { status: 500 }
        );
      }

      // Cek apakah match_schedules sudah ada (biar tidak duplicate insert)
      const { data: existingSchedule } = await supabaseAdmin
        .from('match_schedules')
        .select('id')
        .eq('match_id', matchId)
        .maybeSingle();

      if (existingSchedule) {
        console.log(
          '⚠️ match_schedules sudah ada untuk match ini, skip insert'
        );
        return NextResponse.json({ success: true });
      }

      // Siapkan data untuk insert match_schedules
      // ✅ Kolom sesi_1..sesi_20 sudah DIHAPUS dari DB (digantikan tabel sessions)
      const scheduleInsertData: any = {
        match_id: matchId,
        student_id: matchData.student_id,
        tutor_id: matchData.tutor_id,
        schedules_summary_fix: matchData.schedules_summary || null,
        status: 'active',
      };

      console.log('📝 Inserting match_schedules with data:', scheduleInsertData);

      const { error: insertError } = await supabaseAdmin
        .from('match_schedules')
        .insert(scheduleInsertData);

      if (insertError) {
        console.error('❌ Failed to insert match_schedules:', insertError);
        return NextResponse.json(
          {
            error: 'Gagal membuat jadwal: ' + insertError.message,
            code: insertError.code,
          },
          { status: 500 }
        );
      }

      console.log('✅ match_schedules record created successfully');
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