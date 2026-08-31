import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  console.log('🚀 API save-schedule called');

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { matchId, sessions } = body;

    if (!matchId || !sessions || sessions.length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // 1. Validasi match & student
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, student_id, tutor_id')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const { data: student } = await supabase
      .from('students')
      .select('user_id')
      .eq('id', match.student_id)
      .single();

    if (!student || student.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Insert sessions
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
      console.error('Insert sessions error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 3. Generate schedules_summary (JSON array)
    const summaryArray: any[] = [];
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
      // Convert ke array of objects
      Object.values(summaryMap).forEach(item => summaryArray.push(item));
    }

    console.log('📝 Summary JSON:', JSON.stringify(summaryArray, null, 2));

    // 4. Update match (langsung pakai supabase biasa, tapi dengan RLS bypass via service role)
    // Kita gunakan admin client untuk bypass RLS
    const { createClient: createAdmin } = await import('@supabase/supabase-js');
    const adminSupabase = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updatePayload = {
      status: 'matched',
      initiated_by: 'student',
      schedules_summary: summaryArray, // array of objects → otomatis jadi JSONB
    };

    console.log('🔄 Updating match with payload:', updatePayload);

    const { error: updateError } = await adminSupabase
      .from('matches')
      .update(updatePayload)
      .eq('id', match.id);

    if (updateError) {
      console.error('❌ Update error:', updateError);
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
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }

}