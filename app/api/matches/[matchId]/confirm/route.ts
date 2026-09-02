import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  console.log('🚀 [CONFIRM] API dipanggil', { matchId: params.matchId });

  try {
    const { matchId } = params;
    const body = await req.json();
    const { action } = body;

    console.log('📥 Action:', action);

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action harus "accept" atau "reject"' },
        { status: 400 }
      );
    }

    // Pakai admin client langsung (bypass RLS, tanpa perlu auth)
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Validasi match ada
    const { data: match, error: matchError } = await adminSupabase
      .from('matches')
      .select('id, status, initiated_by')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('❌ Match tidak ditemukan:', matchError);
      return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 });
    }

    console.log('📋 Match ditemukan:', match);

    // Siapkan payload update
    let updatePayload: any = {};
    if (action === 'accept') {
      updatePayload = { status: 'matched' };
    } else if (action === 'reject') {
      updatePayload = { status: 'declined', initiated_by: 'tutor' };
    }

    console.log('🔄 Update payload:', updatePayload);

    // Update match
    const { error: updateError } = await adminSupabase
      .from('matches')
      .update(updatePayload)
      .eq('id', matchId);

    if (updateError) {
      console.error('❌ Error update:', updateError);
      return NextResponse.json(
        { error: 'Gagal update match: ' + updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Match berhasil diupdate');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error unexpected:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}