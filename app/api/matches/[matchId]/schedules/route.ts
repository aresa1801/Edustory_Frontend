import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  console.log('🚀 [FIXED] API schedules POST called', { matchId: params.matchId });

  try {
    const { matchId } = params;
    const body = await req.json();
    const { sessions } = body;

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json({ error: 'sessions array required' }, { status: 400 });
    }

    // === 1. Generate schedules_summary LANGSUNG dari data frontend ===
    const summaryMap: Record<string, { subject: string; day: string; time: string; count: number }> = {};
    for (const s of sessions) {
      const dateObj = new Date(s.date);
      const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
      // Gunakan timeSlot dari frontend (sudah benar format "12.00 - 13.00")
      const timeSlot = s.timeSlot;
      const subject = s.subject || 'Tanpa Mapel';
      const key = `${subject}-${dayName}-${timeSlot}`;
      if (!summaryMap[key]) {
        summaryMap[key] = { subject, day: dayName, time: timeSlot, count: 0 };
      }
      summaryMap[key].count += 1;
    }
    const summaryArray = Object.values(summaryMap);
    console.log('📝 schedules_summary (from frontend):', JSON.stringify(summaryArray, null, 2));

    // === 2. Insert sessions (tetap dilakukan) ===
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('id, student_id, tutor_id')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('❌ Match not found:', matchError);
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

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
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('❌ Insert sessions error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // === 3. Update match dengan summaryArray (dari frontend) ===
    const now = new Date().toISOString();
      const { error: updateError } = await supabaseAdmin
        .from('matches')
        .update({
          status: 'pending',               // tetap pending
          initiated_by: 'student',
          schedules_summary: summaryArray,
          schedule_submitted_at: now,      // <-- TAMBAHKAN INI
        })
        .eq('id', matchId);

    if (updateError) {
      console.error('❌ Update match error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('✅ Match updated successfully');
    return NextResponse.json({ success: true, schedules_summary: summaryArray });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}