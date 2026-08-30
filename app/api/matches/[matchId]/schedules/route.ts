import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    console.log('🚀 [API] START POST /schedules', { matchId: params.matchId });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('⚠️ [API] Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchId } = params;

    // 1. Ambil match untuk validasi
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, student_id, tutor_id, status')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('❌ [API] Match not found', matchError);
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // 2. Pastikan user adalah student pemilik match
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('user_id')
      .eq('id', match.student_id)
      .single();

    if (studentError || !student || student.user_id !== user.id) {
      console.warn('⚠️ [API] Forbidden - not student owner');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Ambil body: { sessions: [{ date, timeSlot, subject }] }
    const body = await req.json();
    const { sessions } = body;

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      console.warn('⚠️ [API] No sessions provided');
      return NextResponse.json(
        { error: 'At least one session is required' },
        { status: 400 }
      );
    }

    // 4. Transformasi ke format insert
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

    console.log('📝 [API] Insert data:', insertData);

    // 5. Insert ke sessions
    const { data, error: insertError } = await supabase
      .from('sessions')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('❌ [API] Insert sessions error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save schedules: ' + insertError.message },
        { status: 500 }
      );
    }

    console.log('✅ [API] Sessions inserted:', data);

    // ===== GENERATE SCHEDULES_SUMMARY =====
    let schedulesSummary = '';

    if (data && data.length > 0) {
      const summaryGroups: Record<string, { subject: string; day: string; time: string; count: number }> = {};

      for (const session of data) {
        const scheduledAt = new Date(session.scheduled_at);
        const dayName = scheduledAt.toLocaleDateString('id-ID', { weekday: 'long' });
        const timeStr = scheduledAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(scheduledAt.getTime() + (session.duration_minutes || 60) * 60000);
        const endTimeStr = endTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const timeSlot = `${timeStr} - ${endTimeStr}`;
        const subject = session.notes || 'Tanpa Mapel';

        const key = `${subject}-${dayName}-${timeSlot}`;
        if (!summaryGroups[key]) {
          summaryGroups[key] = { subject, day: dayName, time: timeSlot, count: 0 };
        }
        summaryGroups[key].count += 1;
      }

      const summaryLines = Object.values(summaryGroups).map(
        (item) => `${item.subject}: ${item.day}, ${item.time} (${item.count} sesi)`
      );
      schedulesSummary = summaryLines.join('; ');

      console.log('📝 [API] schedulesSummary:', schedulesSummary);
    }

    // ===== UPDATE MATCH =====
    try {
      const updatePayload: any = {
        status: 'matched',
        initiated_by: 'student',
      };
      if (schedulesSummary) {
        updatePayload.schedules_summary = schedulesSummary;
      }

      console.log('🔄 [API] Updating match with:', updatePayload);

      const { error: updateError } = await supabase
        .from('matches')
        .update(updatePayload)
        .eq('id', match.id);

      if (updateError) {
        console.error('❌ [API] Update match error:', updateError);
        // Kita tetap return success untuk sessions, tapi dengan warning
        return NextResponse.json(
          {
            message: 'Schedules saved but match update failed',
            data,
            schedules_summary: schedulesSummary,
            warning: 'Match update error: ' + updateError.message,
          },
          { status: 207 } // Multi-Status
        );
      }

      console.log('✅ [API] Match updated successfully');
    } catch (updateErr) {
      console.error('❌ [API] Update match exception:', updateErr);
      // Tetap return success untuk sessions
      return NextResponse.json(
        {
          message: 'Schedules saved but match update failed',
          data,
          schedules_summary: schedulesSummary,
          warning: updateErr instanceof Error ? updateErr.message : 'Unknown error',
        },
        { status: 207 }
      );
    }

    // ===== SUCCESS =====
    return NextResponse.json({
      message: 'Schedules saved successfully',
      data,
      schedules_summary: schedulesSummary,
    });
  } catch (error) {
    console.error('❌ [API] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}