import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUser } from '@/lib/api-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {

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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // === 1. Ambil match ===
    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('id, tutor_id, student_id, status, initiated_by, tutor_full_name, matched_subjects')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Only the student or the tutor involved may confirm/reject this match.
    const sessionUser = await getRequestUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const [{ data: studentRow }, { data: tutorRow }] = await Promise.all([
      supabaseAdmin.from('students').select('user_id').eq('id', match.student_id).maybeSingle(),
      supabaseAdmin.from('tutors').select('user_id').eq('id', match.tutor_id).maybeSingle(),
    ]);
    if (sessionUser.id !== studentRow?.user_id && sessionUser.id !== tutorRow?.user_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ===== HANDLE ACCEPT =====
    // Dana TETAP DIBEKUKAN. Transfer ke tutor baru terjadi saat sesi selesai.
    if (action === 'accept') {
      const { error: holdErr } = await supabaseAdmin
        .from('wallet_transactions')
        .update({
          status: 'active',
          description: `Dana Sesi Aktif - ${match.tutor_full_name || 'Tutor'}`,
        })
        .eq('match_id', matchId)
        .eq('type', 'session_hold')
        .eq('status', 'pending');

      if (holdErr) console.error('❌ Hold update error:', holdErr);
    }

    // ===== HANDLE REJECT =====
    // Semua hold → cancelled (unfreeze total)
    if (action === 'reject') {
      await supabaseAdmin
        .from('wallet_transactions')
        .update({
          status: 'cancelled',
          description: `Penahanan Dana Dibatalkan - ${match.tutor_full_name || 'Tutor'}`,
        })
        .eq('match_id', matchId)
        .eq('type', 'session_hold')
        .in('status', ['pending', 'active']);
    }

    // === 2. Update match status ===
    let updatePayload: any = {};
    if (action === 'accept') {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 75);
      updatePayload = {
        status: 'matched',
        accepted_at: now.toISOString(),
        contract_end_date: endDate.toISOString(),
      };
    } else if (action === 'reject') {
      updatePayload = { status: 'declined' };
    }

    const { error: updateError } = await supabaseAdmin
      .from('matches')
      .update(updatePayload)
      .eq('id', matchId);

    if (updateError) {
      return NextResponse.json({ error: 'Update failed: ' + updateError.message }, { status: 500 });
    }

    // One student + one subject = one tutor.
    // When a match is accepted, decline other pending offers that overlap the subjects.
    if (action === 'accept') {
      const normalize = (value: unknown): string[] => {
        if (Array.isArray(value)) return value.map(String).map((v) => v.trim().toLowerCase()).filter(Boolean)
        if (typeof value === 'string')
          return value.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean)
        return []
      }

      const acceptedSubjects = new Set(normalize((match as any).matched_subjects))

      const { data: otherPending } = await supabaseAdmin
        .from('matches')
        .select('id, matched_subjects')
        .eq('student_id', match.student_id)
        .eq('status', 'pending')
        .neq('id', matchId)

      const conflicting = (otherPending ?? []).filter((row: any) => {
        const subjects = normalize(row.matched_subjects)
        if (acceptedSubjects.size === 0 || subjects.length === 0) return true // unknown subjects → avoid double tutor
        return subjects.some((subject) => acceptedSubjects.has(subject))
      })

      if (conflicting.length > 0) {
        const ids = conflicting.map((row: any) => row.id)
        await supabaseAdmin
          .from('matches')
          .update({
            status: 'declined',
            updated_at: new Date().toISOString(),
          })
          .in('id', ids)

        await supabaseAdmin
          .from('wallet_transactions')
          .update({
            status: 'cancelled',
            description: 'Dibatalkan otomatis — siswa sudah mendapatkan tutor untuk mata pelajaran ini',
          })
          .in('match_id', ids)
          .eq('type', 'session_hold')
          .in('status', ['pending', 'active'])
      }
    }

    // === 3. Insert match_schedules (khusus accept) ===
    if (action === 'accept') {
      const { data: existingSchedule } = await supabaseAdmin
        .from('match_schedules')
        .select('id')
        .eq('match_id', matchId)
        .maybeSingle();

      if (!existingSchedule) {
        const { data: matchData } = await supabaseAdmin
          .from('matches')
          .select('schedules_summary, student_id, tutor_id')
          .eq('id', matchId)
          .single();

        if (matchData) {
          await supabaseAdmin.from('match_schedules').insert({
            match_id: matchId,
            student_id: matchData.student_id,
            tutor_id: matchData.tutor_id,
            schedules_summary_fix: matchData.schedules_summary || null,
            status: 'active',
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic'
