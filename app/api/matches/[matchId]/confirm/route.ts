import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('id, tutor_id, student_id, status, initiated_by')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('❌ Match not found:', matchError);
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    console.log('✅ Match found:', match);

    let updatePayload: any = {};
    if (action === 'accept') {
      updatePayload = { status: 'matched' };
    } else if (action === 'reject') {
      updatePayload = {
        status: 'declined',
        // JANGAN ubah initiated_by, biarkan sesuai asalnya
      };
    }

    console.log('🔄 Updating match with payload:', updatePayload);

    const { error: updateError } = await supabaseAdmin
      .from('matches')
      .update(updatePayload)
      .eq('id', matchId);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return NextResponse.json(
        { error: 'Update failed: ' + updateError.message },
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