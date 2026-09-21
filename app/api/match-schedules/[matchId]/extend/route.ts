import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/security/sanitize'

export const dynamic = 'force-dynamic'

const EXTENSION_WINDOW_HOURS = 72 // 3 hari
const EXTENSION_DURATION_DAYS = 75

// ============================================================
// HELPER — Group proposed_slots menjadi schedules_summary_fix
// Format: [{ subject, day, time, count }]
// ============================================================
function groupSlotsToSummary(slots: Array<{ date: string; timeSlot: string; subject: string }>) {
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const grouped: Record<string, { subject: string; day: string; time: string; count: number }> = {}

  slots.forEach((s) => {
    const d = new Date(`${s.date}T00:00:00Z`)
    const day = dayNames[d.getUTCDay()]
    const key = `${s.subject}|${day}|${s.timeSlot}`
    if (!grouped[key]) {
      grouped[key] = { subject: s.subject, day, time: s.timeSlot, count: 0 }
    }
    grouped[key].count += 1
  })

  return Object.values(grouped)
}

// ============================================================
// POST — Student ajukan perpanjangan
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
      return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
    }

    const { user_id, budget_per_month, sessions_per_month, proposed_slots } = body ?? {}

    // ===== Validasi dasar =====
    if (!isValidUUID(user_id)) {
      return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
    }

    const budget = Number(budget_per_month)
    const sessions = Number(sessions_per_month)

    if (!Number.isFinite(budget) || budget < 50000) {
      return NextResponse.json(
        { error: 'Budget minimal Rp 50.000' },
        { status: 400 }
      )
    }
    if (!Number.isInteger(sessions) || sessions < 2 || sessions > 100) {
      return NextResponse.json(
        { error: 'Jumlah sesi per bulan tidak valid (2-100)' },
        { status: 400 }
      )
    }
    if (!Array.isArray(proposed_slots) || proposed_slots.length === 0) {
      return NextResponse.json(
        { error: 'Jadwal wajib dipilih minimal 1 sesi' },
        { status: 400 }
      )
    }

    // ===== Validasi setiap slot =====
    for (const slot of proposed_slots) {
      if (
        !slot?.date ||
        !slot?.timeSlot ||
        !slot?.subject ||
        typeof slot.date !== 'string' ||
        typeof slot.timeSlot !== 'string' ||
        typeof slot.subject !== 'string'
      ) {
        return NextResponse.json(
          { error: 'Format slot tidak valid' },
          { status: 400 }
        )
      }
      // Cek tanggal minimal besok
      const d = new Date(`${slot.date}T00:00:00Z`)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Tanggal slot tidak valid' }, { status: 400 })
      }
    }

    // ===== Resolve user → student =====
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'Student tidak ditemukan' }, { status: 404 })
    }

    // ===== Ambil match_schedules + matches =====
    const { data: schedule } = await supabaseAdmin
      .from('match_schedules')
      .select('id, match_id, tutor_id, student_id, status, extension_request')
      .eq('match_id', matchId)
      .maybeSingle()

    if (!schedule) {
      return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 })
    }

    if (schedule.student_id !== student.id) {
      return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
    }

    // ===== Cek status: harus completed =====
    if (schedule.status !== 'completed') {
      return NextResponse.json(
        { error: 'Kontrak belum selesai. Perpanjangan hanya bisa dilakukan setelah kontrak berakhir.' },
        { status: 400 }
      )
    }

    // ===== Cek belum ada extension pending =====
    const existing = schedule.extension_request
    if (existing && existing.status === 'pending') {
      return NextResponse.json(
        { error: 'Sudah ada pengajuan perpanjangan yang menunggu respons' },
        { status: 409 }
      )
    }

    // ===== Cek subject hanya dari matched_subjects =====
    const { data: match } = await supabaseAdmin
      .from('matches')
      .select('matched_subjects')
      .eq('id', matchId)
      .single()

    const allowedSubjects = new Set((match?.matched_subjects || []).map((s: string) => s.toLowerCase()))
    for (const slot of proposed_slots) {
      if (!allowedSubjects.has(slot.subject.toLowerCase())) {
        return NextResponse.json(
          { error: `Mata pelajaran "${slot.subject}" tidak diizinkan` },
          { status: 400 }
        )
      }
    }

    // ===== Bangun payload =====
    const now = new Date()
    const deadline = new Date(now.getTime() + EXTENSION_WINDOW_HOURS * 60 * 60 * 1000)

    const requestPayload = {
      request_id: crypto.randomUUID(),
      requested_by: 'student',
      requested_at: now.toISOString(),
      deadline: deadline.toISOString(),
      status: 'pending',
      responded_at: null,
      responded_by: null,
      duration_days: EXTENSION_DURATION_DAYS,
      new_budget_per_month: budget,
      new_sessions_per_month: sessions,
      proposed_slots: proposed_slots.map((s: any) => ({
        date: s.date,
        timeSlot: s.timeSlot,
        subject: s.subject,
      })),
    }

    const { error: updErr } = await supabaseAdmin
      .from('match_schedules')
      .update({ extension_request: requestPayload })
      .eq('id', schedule.id)

    if (updErr) {
      console.error('[extend POST] update:', updErr)
      return NextResponse.json({ error: 'Gagal menyimpan pengajuan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, request: requestPayload })
  } catch (err) {
    console.error('[extend POST]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// ============================================================
// PATCH — Tutor approve/reject, Student cancel, Acknowledge
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

    if (!['approve', 'reject', 'cancel', 'acknowledge-notification'].includes(action)) {
      return NextResponse.json({ error: 'action tidak valid' }, { status: 400 })
    }
    if (!['tutor', 'student'].includes(role)) {
      return NextResponse.json({ error: 'role tidak valid' }, { status: 400 })
    }
    if (!isValidUUID(user_id)) {
      return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
    }

    // ===== Acknowledge notif =====
    if (action === 'acknowledge-notification') {
      const { error } = await supabaseAdmin
        .from('match_schedules')
        .update({ extension_notification: null })
        .eq('match_id', matchId)

      if (error) {
        return NextResponse.json({ error: 'Gagal' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // ===== Resolve profile =====
    const table = role === 'tutor' ? 'tutors' : 'students'
    const { data: profile } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: `${role} tidak ditemukan` }, { status: 404 })
    }

    // ===== Ambil schedule =====
    const { data: schedule } = await supabaseAdmin
      .from('match_schedules')
      .select('id, match_id, tutor_id, student_id, status, extension_request')
      .eq('match_id', matchId)
      .maybeSingle()

    if (!schedule) {
      return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 })
    }

    const isOwner =
      (role === 'tutor' && schedule.tutor_id === profile.id) ||
      (role === 'student' && schedule.student_id === profile.id)

    if (!isOwner) {
      return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
    }

    const currentReq = schedule.extension_request
    if (!currentReq) {
      return NextResponse.json({ error: 'Tidak ada pengajuan perpanjangan' }, { status: 400 })
    }

    const now = new Date()

    // ===== CANCEL (student only, pending only) =====
    if (action === 'cancel') {
      if (role !== 'student') {
        return NextResponse.json({ error: 'Hanya student yang bisa cancel' }, { status: 403 })
      }
      if (currentReq.status !== 'pending') {
        return NextResponse.json({ error: 'Tidak dalam status pending' }, { status: 400 })
      }
      const { error } = await supabaseAdmin
        .from('match_schedules')
        .update({ extension_request: null })
        .eq('id', schedule.id)

      if (error) {
        return NextResponse.json({ error: 'Gagal membatalkan' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // ===== APPROVE / REJECT (tutor only) =====
    if (role !== 'tutor') {
      return NextResponse.json({ error: 'Hanya tutor yang bisa approve/reject' }, { status: 403 })
    }
    if (currentReq.status !== 'pending') {
      return NextResponse.json({ error: 'Pengajuan sudah direspons' }, { status: 400 })
    }

    // ===== REJECT =====
    if (action === 'reject') {
      const notif = {
        type: 'rejected',
        at: now.toISOString(),
      }
      const { error } = await supabaseAdmin
        .from('match_schedules')
        .update({
          extension_request: {
            ...currentReq,
            status: 'rejected',
            responded_at: now.toISOString(),
            responded_by: 'tutor',
          },
          extension_notification: notif,
        })
        .eq('id', schedule.id)

      if (error) {
        return NextResponse.json({ error: 'Gagal menolak' }, { status: 500 })
      }
      return NextResponse.json({ success: true, action: 'rejected' })
    }

    // ===== APPROVE =====
    const slots = currentReq.proposed_slots as Array<{ date: string; timeSlot: string; subject: string }>
    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ error: 'Data slot tidak valid' }, { status: 400 })
    }

    // Tanggal slot pertama (paling awal)
    const sortedDates = slots.map((s) => s.date).sort()
    const firstSlotDate = new Date(`${sortedDates[0]}T00:00:00Z`)

    // 75 hari dari firstSlotDate
    const contractEnd = new Date(firstSlotDate)
    contractEnd.setDate(contractEnd.getDate() + (currentReq.duration_days || EXTENSION_DURATION_DAYS))

    // ===== 1. Hapus sessions lama =====
    const { error: delSessionsErr } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('match_id', matchId)

    if (delSessionsErr) {
      console.error('[extend approve] delete sessions:', delSessionsErr)
      return NextResponse.json({ error: 'Gagal reset sesi' }, { status: 500 })
    }

    // ===== 2. Insert sessions baru =====
    const newSessions = slots.map((slot) => {
      // Parse "12.00 - 13.00" → 12:00
      const timeMatch = slot.timeSlot.match(/(\d{1,2})\.(\d{2})/)
      const hour = timeMatch ? parseInt(timeMatch[1]) : 12
      const minute = timeMatch ? parseInt(timeMatch[2]) : 0

      const scheduledAt = new Date(`${slot.date}T00:00:00Z`)
      scheduledAt.setUTCHours(hour, minute, 0, 0)

      return {
        match_id: matchId,
        tutor_id: schedule.tutor_id,
        student_id: schedule.student_id,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: 60,
        status: 'scheduled',
      }
    })

    const { error: insSessionsErr } = await supabaseAdmin
      .from('sessions')
      .insert(newSessions)

    if (insSessionsErr) {
      console.error('[extend approve] insert sessions:', insSessionsErr)
      return NextResponse.json({ error: 'Gagal membuat sesi baru' }, { status: 500 })
    }

    // ===== 3. Regen schedules_summary_fix =====
    const newSummaryFix = groupSlotsToSummary(slots)

    // ===== 4. Update match_schedules =====
    const { error: updSchedErr } = await supabaseAdmin
      .from('match_schedules')
      .update({
        status: 'active',
        schedules_summary_fix: newSummaryFix,
        schedules_custom: [],
        schedules_custom_request: null,
        termination_request: null,
        reschedule_notification: null,
        ulasan: [],
        extension_request: {
          ...currentReq,
          status: 'approved',
          responded_at: now.toISOString(),
          responded_by: 'tutor',
          new_contract_start: firstSlotDate.toISOString(),
          new_contract_end: contractEnd.toISOString(),
        },
        extension_notification: {
          type: 'approved',
          at: now.toISOString(),
        },
      })
      .eq('id', schedule.id)

    if (updSchedErr) {
      console.error('[extend approve] update schedule:', updSchedErr)
      return NextResponse.json({ error: 'Gagal update jadwal' }, { status: 500 })
    }

    // ===== 5. Update matches =====
    const { error: updMatchErr } = await supabaseAdmin
      .from('matches')
      .update({
        status: 'active',
        accepted_at: firstSlotDate.toISOString(),
        contract_end_date: contractEnd.toISOString(),
        student_budget_per_month: currentReq.new_budget_per_month,
        student_sessions_per_month: currentReq.new_sessions_per_month,
        ended_at: null,
      })
      .eq('id', matchId)

    if (updMatchErr) {
      console.error('[extend approve] update match:', updMatchErr)
      // Rollback tidak dilakukan karena sudah banyak step
      return NextResponse.json(
        { error: 'Jadwal sudah di-extend tapi gagal update metadata. Hubungi admin.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      action: 'approved',
      new_contract_end: contractEnd.toISOString(),
    })
  } catch (err) {
    console.error('[extend PATCH]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}