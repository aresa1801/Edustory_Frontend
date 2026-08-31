import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  console.log('🚀 [FINAL] API schedules POST called', { matchId: params.matchId });

  try {
    const { matchId } = params;

    // 1. Ambil body
    const body = await req.json();
    const { sessions } = body;

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json({ error: 'sessions array required' }, { status: 400 });
    }

    // 2. Gunakan admin client (service role) untuk bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Validasi match (pastikan matchId valid)
    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('id, student_id, tutor_id')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('❌ Match not found:', matchError);
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // 4. Insert sessions
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

    console.log('📝 Inserting sessions:', insertData.length);

    const { data: insertedSessions, error: insertError } = await supabaseAdmin
      .from('sessions')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('❌ Insert sessions error:', insertError);
      return NextResponse.json(
        { error: 'Insert sessions failed: ' + insertError.message },
        { status: 500 }
      );
    }

    console.log('✅ Sessions inserted:', insertedSessions.length);

    // 5. Generate schedules_summary (JSON array)
    const summaryArray: any[] = [];
    if (insertedSessions && insertedSessions.length > 0) {
      const summaryMap: Record<string, { subject: string; day: string; time: string; count: number }> = {};
      for (const session of insertedSessions) {
        const scheduledAt = new Date(session.scheduled_at);
        const dayName = scheduledAt.toLocaleDateString('id-ID', { weekday: 'long' });
        const timeStr = scheduledAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(scheduledAt.getTime() + (session.duration_minutes || 60) * 60000);
        const endTimeStr = endTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const timeSlot = `${timeStr} - ${endTimeStr}`;
        const subject = session.notes || 'Tanpa Mapel';
        const key = `${subject}-${dayName}-${timeSlot}`;
        if (!summaryMap[key]) {
          summaryMap[key] = { subject, day: dayName, time: timeSlot, count: 0 };
        }
        summaryMap[key].count += 1;
      }
      Object.values(summaryMap).forEach(item => summaryArray.push(item));
    }

    console.log('📝 schedules_summary:', JSON.stringify(summaryArray, null, 2));

    // 6. Update match dengan schedules_summary
    const { error: updateError } = await supabaseAdmin
      .from('matches')
      .update({
        status: 'matched',
        initiated_by: 'student',
        schedules_summary: summaryArray,
      })
      .eq('id', matchId);

    if (updateError) {
      console.error('❌ Update match error:', updateError);
      return NextResponse.json(
        { error: 'Update match failed: ' + updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Match updated successfully');

    return NextResponse.json({
      success: true,
      schedules_summary: summaryArray,
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}