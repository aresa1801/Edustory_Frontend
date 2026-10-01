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

    // 🛡️ Guard: sudah cancelled → idempotent
    if (session.status === 'cancelled') {
      return NextResponse.json({ success: true, message: 'Already cancelled' });
    }

    // 🛡️ Guard: sudah completed → tidak boleh cancel
    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'Sesi sudah selesai, tidak bisa dibatalkan' },
        { status: 400 }
      );
    }

    // 2. Cari hold
    const { data: hold, error: holdErr } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id, status')
      .eq('reference', sessionId)
      .eq('type', 'session_hold')
      .maybeSingle();

    if (holdErr) {
      console.error('[SESSION CANCEL] hold fetch error:', holdErr);
      return NextResponse.json({ error: 'Failed to fetch hold' }, { status: 500 });
    }

    if (!hold) {
      return NextResponse.json({ error: 'Hold not found' }, { status: 404 });
    }

    // 🛡️ Guard: hold sudah completed → tidak boleh cancel
    if (hold.status === 'completed') {
      return NextResponse.json(
        { error: 'Dana sudah dibayarkan ke tutor, tidak bisa dibatalkan' },
        { status: 400 }
      );
    }

    // 🛡️ Guard: hold sudah cancelled → idempotent
    if (hold.status === 'cancelled' && !moved) {
      return NextResponse.json({
        success: true,
        message: 'Hold already cancelled',
        hold_status: 'cancelled',
      });
    }

    // 🛡️ Guard: hold sudah moved & minta moved lagi → idempotent
    if (hold.status === 'moved' && moved) {
      return NextResponse.json({
        success: true,
        message: 'Hold already moved',
        hold_status: 'moved',
      });
    }

    // 3. Tentukan status hold baru
    const newHoldStatus = moved ? 'moved' : 'cancelled';

    const { error: updateHoldErr } = await supabaseAdmin
      .from('wallet_transactions')
      .update({ status: newHoldStatus })
      .eq('id', hold.id);

    if (updateHoldErr) {
      console.error('[SESSION CANCEL] update hold error:', updateHoldErr);
      return NextResponse.json({ error: 'Failed to update hold' }, { status: 500 });
    }

    // 4. Update session
    const updateData: any = {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    };
    if (moved) {
      updateData.moved_at = new Date().toISOString();
    }

    const { error: updateSessionErr } = await supabaseAdmin
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (updateSessionErr) {
      console.error('[SESSION CANCEL] update session error:', updateSessionErr);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    console.log(`✅ [SESSION CANCEL] ${sessionId} → ${newHoldStatus}`);

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