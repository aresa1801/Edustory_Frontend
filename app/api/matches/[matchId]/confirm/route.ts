import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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

    // Ambil user dari Supabase (untuk validasi)
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Auth error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ User authenticated:', user.id);

    // Cek match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, tutor_id, student_id, status, initiated_by')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('❌ Match error:', matchError);
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    console.log('✅ Match found:', match);

    // Validasi apakah user adalah tutor yang terkait
    const { data: tutor, error: tutorError } = await supabase
      .from('tutors')
      .select('user_id')
      .eq('id', match.tutor_id)
      .single();

    if (tutorError || !tutor) {
      console.error('❌ Tutor error:', tutorError);
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }
    if (tutor.user_id !== user.id) {
      console.warn('⚠️ User is not the tutor for this match');
      return NextResponse.json(
        { error: 'Forbidden – only the tutor can confirm this match.' },
        { status: 403 }
      );
    }
    console.log('✅ User is the tutor');

    // Gunakan admin client untuk update (bypass RLS)
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let updatePayload: any = {};
    if (action === 'accept') {
      updatePayload = { status: 'matched' };
    } else if (action === 'reject') {
      updatePayload = {
        status: 'declined',
        initiated_by: 'tutor',
      };
    }

    console.log('🔄 Updating match with payload:', updatePayload);

    const { error: updateError } = await adminSupabase
      .from('matches')
      .update(updatePayload)
      .eq('id', matchId);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update match: ' + updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Match updated successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}