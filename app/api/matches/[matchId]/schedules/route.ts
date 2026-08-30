import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  console.log('🚀 API schedules POST called', { matchId: params.matchId });

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchId } = params;

    // Validasi match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, student_id, tutor_id, status')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Validasi student
    const { data: student } = await supabase
      .from('students')
      .select('user_id')
      .eq('id', match.student_id)
      .single();

    if (!student || student.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { sessions } = body;

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: 'No sessions' }, { status: 400 });
    }

    // Insert sessions
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
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Generate summary
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
    }

    console.log('📝 schedulesSummary:', schedulesSummary);

    // Update match
    const updatePayload: any = {
      status: 'matched',
      initiated_by: 'student',
    };
    if (schedulesSummary) {
      updatePayload.schedules_summary = schedulesSummary;
    }

    const { error: updateError } = await supabase
      .from('matches')
      .update(updatePayload)
      .eq('id', match.id);

    if (updateError) {
      console.error('Update error:', updateError);
      // Kembalikan error detail ke frontend
      return NextResponse.json(
        { 
          error: 'Update match failed: ' + updateError.message,
          details: updateError
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      schedules_summary: schedulesSummary,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}