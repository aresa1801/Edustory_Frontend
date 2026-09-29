import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;
  console.log('🚀 [SESSION CANCEL]', sessionId);

  try {
    const body = await req.json().catch(() => ({}));
    const moved = Boolean(body?.moved);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Ambil session
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .select('id, status, cancelled_at')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status === 'cancelled') {
      return NextResponse.json({ success: true, message: 'Already cancelled' });
    }

    // 2. Cari hold
    const { data: hold } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id, status')
      .eq('reference', sessionId)
      .eq('type', 'session_hold')
      .maybeSingle();

    if (!hold) {
      return NextResponse.json({ error: 'Hold not found' }, { status: 404 });
    }

    // 3. Update status hold
    // moved=true → status 'moved' (dana tetap freeze)
    // moved=false → status 'cancelled' (dana cair)
    const newHoldStatus = moved ? 'moved' : 'cancelled';

    await supabaseAdmin
      .from('wallet_transactions')
      .update({ status: newHoldStatus })
      .eq('id', hold.id);

    // 4. Update session
    const updateData: any = {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    };
    if (moved) {
      updateData.moved_at = new Date().toISOString();
    }

    await supabaseAdmin
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      moved,
      hold_status: newHoldStatus,
    });
  } catch (err) {
    console.error('[SESSION CANCEL] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}