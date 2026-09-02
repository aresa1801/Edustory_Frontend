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

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "accept" or "reject".' },
        { status: 400 }
      );
    }

    // Ambil user dari Supabase (untuk validasi)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cek match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, tutor_id, student_id, status, initiated_by')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Validasi apakah user adalah tutor yang terkait (hanya tutor yang boleh konfirmasi)
    const { data: tutor } = await supabase
      .from('tutors')
      .select('user_id')
      .eq('id', match.tutor_id)
      .single();

    if (!tutor || tutor.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden – only the tutor can confirm this match.' },
        { status: 403 }
      );
    }

    // Gunakan admin client untuk update (bypass RLS)
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let updatePayload: any = {};

    if (action === 'accept') {
      updatePayload = {
        status: 'matched',
        // initiated_by tetap student (tidak diubah)
      };
    } else if (action === 'reject') {
      updatePayload = {
        status: 'declined',      // sesuai permintaan: status = decline
        initiated_by: 'tutor',   // sesuai permintaan: initiated_by = tutor
      };
    }

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
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}