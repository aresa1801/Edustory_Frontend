import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID, sanitizeText } from '@/lib/security/sanitize'

export const dynamic = 'force-dynamic'

const TERMINATION_WINDOW_HOURS = 48
const REASON_MAX_LENGTH = 500

// ============================================================
// POST — Ajukan pengakhiran
// ============================================================
export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { matchId } = params
    if (!isValidUUID(matchId)) {
      return NextResponse.json({ error: 'matchId tidak valid' }, { status: 400 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body JSON tidak valid' }, { status: 400 })
    }

    const { type, role, user_id, reason } = body ?? {}

    if (!['unilateral', 'mutual'].includes(type)) {
      return NextResponse.json({ error: 'type tidak valid' }, { status: 400 })
    }
    if (!['tutor', 'student'].includes(role)) {
      return NextResponse.json({ error: 'role tidak valid' }, { status: 400 })
    }
    if (!isValidUUID(user_id)) {
      return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
    }

    // ✅ WAJIB: reason untuk mutual, sanitize
    let cleanReason: string | null = null
    if (type === 'mutual') {
      if (typeof reason !== 'string' || reason.trim().length === 0) {
        return NextResponse.json(
          { error: 'Alasan pengakhiran wajib diisi' },
          { status: 400 }
        )
      }
      const sanitizeResult = sanitizeText(reason, REASON_MAX_LENGTH)
      if (!sanitizeResult.ok) {
        return NextResponse.json(
          { error: sanitizeResult.error || 'Alasan tidak valid' },
          { status: 400 }
        )
      }
      cleanReason = sanitizeResult.sanitized
    }

    const table = role === 'tutor' ? 'tutors' : 'students'
    const { data: profile } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: `${role} tidak ditemukan` }, { status: 404 })
    }

    const { data: schedule, error: schedErr } = await supabaseAdmin
      .from('match_schedules')
      .select('id, match_id, tutor_id, student_id, status, termination_request')
      .eq('match_id', matchId)
      .maybeSingle()

    if (schedErr || !schedule) {
      return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 })
    }

    const isOwner =
      (role === 'tutor' && schedule.tutor_id === profile.id) ||
      (role === 'student' && schedule.student_id === profile.id)

    if (!isOwner) {
      return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
    }
    if (schedule.status === 'completed') {
      return NextResponse.json({ error: 'Kontrak sudah selesai' }, { status: 400 })
    }
    if (schedule.termination_request?.status === 'pending') {
      return NextResponse.json(
        { error: 'Sudah ada pengajuan yang menunggu' },
        { status: 400 }
      )
    }

    const now = new Date()

    // ===== UNILATERAL =====
    if (type === 'unilateral') {
      const { error: updSchedErr } = await supabaseAdmin
        .from('match_schedules')
        .update({
          status: 'completed',
          termination_request: {
            requested_by: role,
            requested_at: now.toISOString(),
            ended_at: now.toISOString(),
            type: 'unilateral',
            status: 'approved',
          },
          completion_notification: {
            type: 'terminated',
            at: now.toISOString(),
          },
        })
        .eq('id', schedule.id)

      if (updSchedErr) {
        console.error('[terminate] unilateral:', updSchedErr)
        return NextResponse.json({ error: 'Gagal menyelesaikan' }, { status: 500 })
      }

      await supabaseAdmin
        .from('matches')
        .update({ status: 'completed', ended_at: now.toISOString() })
        .eq('id', matchId)

      await supabaseAdmin
        .from('sessions')
        .update({ status: 'cancelled', cancelled_at: now.toISOString() })
        .eq('match_id', matchId)
        .is('started_at', null)
        .is('cancelled_at', null)

      return NextResponse.json({ success: true, type: 'unilateral' })
    }

    // ===== MUTUAL =====
    const deadline = new Date(
      now.getTime() + TERMINATION_WINDOW_HOURS * 60 * 60 * 1000
    )

    const terminationRequest = {
      requested_by: role,
      requested_at: now.toISOString(),
      deadline: deadline.toISOString(),
      type: 'mutual',
      status: 'pending',
      reason: cleanReason,
      requester_notified_at: null,
    }

    const { error: updErr } = await supabaseAdmin
      .from('match_schedules')
      .update({ termination_request: terminationRequest })
      .eq('id', schedule.id)

    if (updErr) {
      console.error('[terminate] mutual:', updErr)
      return NextResponse.json({ error: 'Gagal mengirim pengajuan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, request: terminationRequest })
  } catch (err) {
    console.error('[terminate POST]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// ============================================================
// PATCH — Approve / Reject / Cancel / Acknowledge
// ============================================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { matchId } = params
    if (!isValidUUID(matchId)) {
      return NextResponse.json({ error: 'matchId tidak valid' }, { status: 400 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
    }

    const { action, role, user_id } = body ?? {}

    if (!['approve', 'reject', 'cancel', 'acknowledge'].includes(action)) {
      return NextResponse.json({ error: 'action tidak valid' }, { status: 400 })
    }
    if (!['tutor', 'student'].includes(role)) {
      return NextResponse.json({ error: 'role tidak valid' }, { status: 400 })
    }
    if (!isValidUUID(user_id)) {
      return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
    }

    const table = role === 'tutor' ? 'tutors' : 'students'
    const { data: profile } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: `${role} tidak ditemukan` }, { status: 404 })
    }

    const { data: schedule, error: schedErr } = await supabaseAdmin
      .from('match_schedules')
      .select('id, match_id, tutor_id, student_id, status, termination_request')
      .eq('match_id', matchId)
      .maybeSingle()

    if (schedErr || !schedule) {
      return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 })
    }

    const isOwner =
      (role === 'tutor' && schedule.tutor_id === profile.id) ||
      (role === 'student' && schedule.student_id === profile.id)

    if (!isOwner) {
      return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
    }

    const currentReq = schedule.termination_request
    if (!currentReq) {
      return NextResponse.json({ error: 'Tidak ada pengajuan' }, { status: 400 })
    }

    const now = new Date()

    // ===== ACKNOWLEDGE: requester tandai sudah lihat penolakan =====
    if (action === 'acknowledge') {
      if (currentReq.requested_by !== role) {
        return NextResponse.json({ error: 'Hanya pengaju' }, { status: 403 })
      }
      if (currentReq.status !== 'rejected') {
        return NextResponse.json({ error: 'Bukan status rejected' }, { status: 400 })
      }
      const { error } = await supabaseAdmin
        .from('match_schedules')
        .update({
          termination_request: {
            ...currentReq,
            requester_notified_at: now.toISOString(),
          },
        })
        .eq('id', schedule.id)

      if (error) {
        return NextResponse.json({ error: 'Gagal' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // ===== CANCEL: hanya pengaju =====
    if (action === 'cancel') {
      if (currentReq.requested_by !== role) {
        return NextResponse.json({ error: 'Hanya pengaju' }, { status: 403 })
      }
      if (currentReq.status !== 'pending') {
        return NextResponse.json({ error: 'Tidak dalam status pending' }, { status: 400 })
      }
      const { error } = await supabaseAdmin
        .from('match_schedules')
        .update({ termination_request: null })
        .eq('id', schedule.id)

      if (error) {
        return NextResponse.json({ error: 'Gagal membatalkan' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // ===== APPROVE / REJECT: hanya penerima =====
    if (currentReq.requested_by === role) {
      return NextResponse.json({ error: 'Hanya penerima' }, { status: 403 })
    }
    if (currentReq.status !== 'pending') {
      return NextResponse.json({ error: 'Sudah direspons' }, { status: 400 })
    }

    if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('match_schedules')
        .update({
          termination_request: {
            ...currentReq,
            status: 'rejected',
            responded_at: now.toISOString(),
            responded_by: role,
          },
        })
        .eq('id', schedule.id)

      if (error) {
        return NextResponse.json({ error: 'Gagal menolak' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // ===== APPROVE =====
    const { error: updSchedErr } = await supabaseAdmin
      .from('match_schedules')
      .update({
        status: 'completed',
        termination_request: {
          ...currentReq,
          status: 'approved',
          responded_at: now.toISOString(),
          responded_by: role,
          ended_at: now.toISOString(),
        },
        completion_notification: {
          type: 'terminated',
          at: now.toISOString(),
        },
      })
      .eq('id', schedule.id)

    if (updSchedErr) {
      console.error('[terminate PATCH] approve:', updSchedErr)
      return NextResponse.json({ error: 'Gagal menyetujui' }, { status: 500 })
    }

    await supabaseAdmin
      .from('matches')
      .update({ status: 'completed', ended_at: now.toISOString() })
      .eq('id', matchId)

    await supabaseAdmin
      .from('sessions')
      .update({ status: 'cancelled', cancelled_at: now.toISOString() })
      .eq('match_id', matchId)
      .is('started_at', null)
      .is('cancelled_at', null)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[terminate PATCH]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}