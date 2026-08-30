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
      // ... (sama seperti sebelumnya)
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
    // ... (sama seperti sebelumnya)

    // Update match
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        status: 'matched',
        initiated_by: 'student',
        schedules_summary: schedulesSummary
      })
      .eq('id', match.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
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