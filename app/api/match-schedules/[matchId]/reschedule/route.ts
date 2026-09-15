import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
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
// PATCH — Tutor approve / reject permintaan perpindahan
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

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action harus "approve" atau "reject"' },
        { status: 400 }
      )
    }

    const { data: schedule, error: sErr } = await supabaseAdmin
      .from('match_schedules')
      .select(
        'id, schedules_custom, schedules_custom_request, schedules_summary_fix'
      )
      .eq('match_id', matchId)
      .single()

    if (sErr || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    const request = schedule.schedules_custom_request
    if (!request || request.status !== 'pending') {
      return NextResponse.json(
        { error: 'Tidak ada permintaan pending untuk direspons' },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()

    if (action === 'approve') {
      // ===== 1. Siapkan nama hari & bulan =====
      const dayNames = [
        'Minggu',
        'Senin',
        'Selasa',
        'Rabu',
        'Kamis',
        'Jumat',
        'Sabtu',
      ]
      const monthNames = [
        'Januari',
        'Februari',
        'Maret',
        'April',
        'Mei',
        'Juni',
        'Juli',
        'Agustus',
        'September',
        'Oktober',
        'November',
        'Desember',
      ]

      // ===== 2. Parse tanggal (pakai timezone WIB) =====
      const fromDate = new Date(`${request.from.date}T00:00:00+07:00`)
      const toDate = new Date(`${request.to.date}T00:00:00+07:00`)

      const fromDay = dayNames[fromDate.getDay()]
      const toDay = dayNames[toDate.getDay()]

      const fromDateLabel = `${fromDay}, ${fromDate.getDate()} ${
        monthNames[fromDate.getMonth()]
      } ${fromDate.getFullYear()}`
      const toDateLabel = `${toDay}, ${toDate.getDate()} ${
        monthNames[toDate.getMonth()]
      } ${toDate.getFullYear()}`

      // ===== 3. Custom entry lengkap =====
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

      // ===== 4. Kurangi count di schedules_summary_fix =====
      const currentSummaryFix = Array.isArray(schedule.schedules_summary_fix)
        ? schedule.schedules_summary_fix
        : []

      const updatedSummaryFix = currentSummaryFix
        .map((item: any) => {
          // Cocokkan berdasarkan day + time (day di summary = nama hari)
          if (
            item.day === fromDay &&
            item.time === request.from.time
          ) {
            return {
              ...item,
              count: Math.max(0, (item.count || 0) - 1),
            }
          }
          return item
        })
        .filter((item: any) => (item.count || 0) > 0) // hapus kalau 0

      // ===== 5. Gabungkan ke schedules_custom =====
      const currentCustom = Array.isArray(schedule.schedules_custom)
        ? schedule.schedules_custom
        : []
      const updatedCustom = [...currentCustom, customEntry]

      // ===== 6. Update DB =====
      const { error: updateErr } = await supabaseAdmin
        .from('match_schedules')
        .update({
          schedules_custom: updatedCustom,
          schedules_summary_fix: updatedSummaryFix,
          schedules_custom_request: null,
        })
        .eq('id', schedule.id)

      if (updateErr) {
        return NextResponse.json(
          { error: updateErr.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'approved',
        updated_summary_fix: updatedSummaryFix,
        custom_entry: customEntry,
      })
    } else {
      // ===== REJECT =====
      const { error: updateErr } = await supabaseAdmin
        .from('match_schedules')
        .update({ schedules_custom_request: null })
        .eq('id', schedule.id)

      if (updateErr) {
        return NextResponse.json(
          { error: updateErr.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, action: 'rejected' })
    }
  } catch (err) {
    console.error('[API reschedule PATCH] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}