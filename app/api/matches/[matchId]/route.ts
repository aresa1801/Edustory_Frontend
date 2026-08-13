import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // sesuaikan path

export async function GET(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { matchId } = params;
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Validasi akses: user harus student atau tutor yang terkait
    const { data: student } = await supabase
      .from('students')
      .select('user_id')
      .eq('id', data.student_id)
      .single();

    const { data: tutor } = await supabase
      .from('tutors')
      .select('user_id')
      .eq('id', data.tutor_id)
      .single();

    const isStudent = student?.user_id === user.id;
    const isTutor = tutor?.user_id === user.id;

    if (!isStudent && !isTutor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching match:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}