import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Helper: parse "HH.MM - HH.MM" → { hour, minute }
function parseTimeSlot(timeStr: string): { hour: number; minute: number } {
  const m = timeStr.match(/(\d{1,2})\.(\d{2})/)
  return {
    hour: m ? parseInt(m[1]) : 12,
    minute: m ? parseInt(m[2]) : 0,
  }
}

// Helper: build scheduled_at ISO string dalam WIB (+07:00)
function buildScheduledAt(dateStr: string, timeSlot: string): string {
  const { hour, minute } = parseTimeSlot(timeSlot)
  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return new Date(`${dateStr}T${hh}:${mm}:00+07:00`).toISOString()
}

// ============================================================
// POST — Student submit permintaan perpindahan jadwal
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
    const body = await req.json()
    const { from, to } = body

    if (!from || !to || !from.date || !from.time || !to.date || !to.time) {
      return NextResponse.json(
        { error: 'Field "from" dan "to" wajib lengkap' },
        { status: 400 }
      )
    }

    const { data: schedule, error: sErr } = await supabaseAdmin
      .from('match_schedules')
      .select(
        'id, schedules_custom, schedules_custom_request, matches!inner(contract_end_date)'
      )
      .eq('match_id', matchId)
      .single()

    if (sErr || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const existing = schedule.schedules_custom_request
    if (existing && (existing.status === 'pending' || !existing.status)) {
      return NextResponse.json(
        { error: 'Masih ada permintaan perpindahan yang belum direspons' },
        { status: 409 }
      )
    }

    const match = (schedule as any).matches
    const contractEnd = new Date(match?.contract_end_date)
    const targetDate = new Date(to.date)
    if (targetDate > contractEnd) {
      return NextResponse.json(
        { error: 'Tanggal baru melewati akhir kontrak' },
        { status: 400 }
      )
    }

    const requestPayload = {
      request_id: crypto.randomUUID(),
      from: {
        date: from.date,
        time: from.time,
        subject: from.subject || null,
      },
      to: {
        date: to.date,
        time: to.time,
        subject: to.subject || null,
      },
      status: 'pending',
      requested_at: new Date().toISOString(),
      responded_at: null,
    }

    const { error: updateErr } = await supabaseAdmin
      .from('match_schedules')
      .update({ schedules_custom_request: requestPayload })
      .eq('id', schedule.id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, request: requestPayload })
  } catch (err) {
    console.error('[API reschedule POST] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// ============================================================
// PATCH — Tutor approve/reject, Student cancel, Acknowledge notif
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
    const body = await req.json()
    const { action } = body

    if (
      !action ||
      !['approve', 'reject', 'cancel', 'acknowledge-notification'].includes(action)
    ) {
      return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
    }

    // ===== Acknowledge notification — clear reschedule_notification =====
    if (action === 'acknowledge-notification') {
      const { error } = await supabaseAdmin
        .from('match_schedules')
        .update({ reschedule_notification: null })
        .eq('match_id', matchId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    const { data: schedule, error: sErr } = await supabaseAdmin
      .from('match_schedules')
      .select(
        'id, match_id, tutor_id, student_id, schedules_custom, schedules_custom_request'
      )
      .eq('match_id', matchId)
      .single()

    if (sErr || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const request = schedule.schedules_custom_request
    if (!request || request.status !== 'pending') {
      return NextResponse.json(
        { error: 'Tidak ada permintaan pending untuk direspons' },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()

    // ===== CANCEL — student batalkan pengajuan =====
    if (action === 'cancel') {
      const { error: updateErr } = await supabaseAdmin
        .from('match_schedules')
        .update({ schedules_custom_request: null })
        .eq('id', schedule.id)

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, action: 'cancelled' })
    }

    // ===== APPROVE =====
    if (action === 'approve') {
      const dayNames = [
        'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu',
      ]
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ]

      // Parse tanggal murni (tanpa timezone) — aman karena hanya butuh hari
      const fromDate = new Date(`${request.from.date}T00:00:00Z`)
      const toDate = new Date(`${request.to.date}T00:00:00Z`)

      const fromDay = dayNames[fromDate.getUTCDay()]
      const toDay = dayNames[toDate.getUTCDay()]

      const fromDateLabel = `${fromDay}, ${fromDate.getUTCDate()} ${
        monthNames[fromDate.getUTCMonth()]
      } ${fromDate.getUTCFullYear()}`
      const toDateLabel = `${toDay}, ${toDate.getUTCDate()} ${
        monthNames[toDate.getUTCMonth()]
      } ${toDate.getUTCFullYear()}`

      const customEntry = {
        subject: request.to.subject || request.from.subject || 'Tanpa Mapel',
        day: toDay,
        date: request.to.date,
        dateLabel: toDateLabel,
        time: request.to.time,
        count: 1,
        moved_from: {
          date: request.from.date,
          day: fromDay,
          dayLabel: fromDateLabel,
          time: request.from.time,
          subject: request.from.subject,
        },
        moved_at: now,
        request_id: request.request_id,
      }

      const currentCustom = Array.isArray(schedule.schedules_custom)
        ? schedule.schedules_custom
        : []
      const updatedCustom = [...currentCustom, customEntry]

      // ✅ Notifikasi approved
      const notification = {
        type: 'approved',
        from: request.from,
        to: request.to,
        at: now,
      }

      // ===== UPDATE SESSION LAMA (slot asal → mark moved) =====
      const fromScheduledAt = buildScheduledAt(request.from.date, request.from.time)

      const { error: updateOldErr } = await supabaseAdmin
        .from('sessions')
        .update({
          moved_at: now,
          cancelled_at: now,
          status: 'cancelled',
        })
        .eq('match_id', matchId)
        .eq('scheduled_at', fromScheduledAt)

      if (updateOldErr) {
        console.error('[reschedule approve] update old session:', updateOldErr)
      }

      // ===== INSERT SESSION BARU (slot tujuan → punya nyawa) =====
      const toScheduledAt = buildScheduledAt(request.to.date, request.to.time)

      const { error: insertNewErr } = await supabaseAdmin
        .from('sessions')
        .insert({
          match_id: matchId,
          tutor_id: schedule.tutor_id,
          student_id: schedule.student_id,
          scheduled_at: toScheduledAt,
          duration_minutes: 60,
          status: 'scheduled',
        })

      if (insertNewErr) {
        console.error('[reschedule approve] insert new session:', insertNewErr)
        return NextResponse.json(
          { error: 'Gagal membuat sesi baru: ' + insertNewErr.message },
          { status: 500 }
        )
      }

      // ===== UPDATE match_schedules =====
      const { error: updateErr } = await supabaseAdmin
        .from('match_schedules')
        .update({
          schedules_custom: updatedCustom,
          schedules_custom_request: null,
          reschedule_notification: notification,
        })
        .eq('id', schedule.id)

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'approved',
        custom_entry: customEntry,
      })
    }

    // ===== REJECT =====
    const notification = {
      type: 'rejected',
      from: request.from,
      to: request.to,
      at: now,
    }

    const { error: updateErr } = await supabaseAdmin
      .from('match_schedules')
      .update({
        schedules_custom_request: null,
        reschedule_notification: notification,
      })
      .eq('id', schedule.id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, action: 'rejected' })
  } catch (err) {
    console.error('[API reschedule PATCH] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}