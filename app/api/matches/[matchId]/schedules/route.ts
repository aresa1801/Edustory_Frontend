import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    console.log('🚀 [API] START POST /schedules', { matchId: params.matchId });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchId } = params;

    // 1. Validasi match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, student_id, tutor_id, status')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // 2. Validasi student
    const { data: student } = await supabase
      .from('students')
      .select('user_id')
      .eq('id', match.student_id)
      .single();

    if (!student || student.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Ambil body
    const body = await req.json();
    const { sessions } = body;

    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: 'At least one session is required' },
        { status: 400 }
      );
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

    const { data, error: insertError } = await supabase
      .from('sessions')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('❌ Insert sessions error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save schedules: ' + insertError.message },
        { status: 500 }
      );
    }

    console.log('✅ Sessions inserted:', data);

    // ===== GENERATE SCHEDULES_SUMMARY (JSONB FORMAT) =====
    let schedulesSummary = null;

    if (data && data.length > 0) {
      const summaryMap: Record<string, { subject: string; day: string; time: string; count: number }> = {};

      for (const session of data) {
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

      // ✅ Convert ke array of objects (cocok untuk jsonb)
      schedulesSummary = Object.values(summaryMap);
    }

    console.log('📝 schedulesSummary (JSONB):', JSON.stringify(schedulesSummary, null, 2));

    // ===== UPDATE MATCH DENGAN JSONB =====
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updatePayload: any = {
      status: 'matched',
      initiated_by: 'student',
    };

    // ✅ Kirim sebagai JSON array, bukan string
    if (schedulesSummary && Array.isArray(schedulesSummary) && schedulesSummary.length > 0) {
      updatePayload.schedules_summary = schedulesSummary;
    }

    console.log('🔄 Updating match with payload:', updatePayload);

    const { error: updateError } = await adminSupabase
      .from('matches')
      .update(updatePayload)
      .eq('id', match.id);

    if (updateError) {
      console.error('❌ Update match error:', updateError);
      return NextResponse.json(
        {
          message: 'Schedules saved but match update failed',
          data,
          schedules_summary: schedulesSummary,
          warning: updateError.message,
        },
        { status: 207 }
      );
    }

    console.log('✅ Match updated successfully');

    return NextResponse.json({
      message: 'Schedules saved successfully',
      data,
      schedules_summary: schedulesSummary,
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}