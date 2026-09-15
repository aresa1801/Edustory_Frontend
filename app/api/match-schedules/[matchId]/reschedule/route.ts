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

    // Ambil match_schedule
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

    // Cek sudah ada pending request
    const existing = schedule.schedules_custom_request
    if (existing && (existing.status === 'pending' || !existing.status)) {
      return NextResponse.json(
        { error: 'Masih ada permintaan perpindahan yang belum direspons' },
        { status: 409 }
      )
    }

    // Cek tanggal baru masih dalam kontrak
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
      .select('id, schedules_custom, schedules_custom_request')
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
      const currentCustom = Array.isArray(schedule.schedules_custom)
        ? schedule.schedules_custom
        : []

      const fromDate = new Date(request.from.date)
      const toDate = new Date(request.to.date)

      const dayNames = [
        'Minggu',
        'Senin',
        'Selasa',
        'Rabu',
        'Kamis',
        'Jumat',
        'Sabtu',
      ]

      const customEntry = {
        subject: request.to.subject || request.from.subject || 'Tanpa Mapel',
        day: dayNames[toDate.getDay()],
        time: request.to.time,
        count: 1,
        moved_from: {
          date: request.from.date,
          time: request.from.time,
          day: dayNames[fromDate.getDay()],
        },
        moved_at: now,
        request_id: request.request_id,
      }

      const updatedCustom = [...currentCustom, customEntry]

      const { error: updateErr } = await supabaseAdmin
        .from('match_schedules')
        .update({
          schedules_custom: updatedCustom,
          schedules_custom_request: null,
        })
        .eq('id', schedule.id)

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, action: 'approved' })
    } else {
      const { error: updateErr } = await supabaseAdmin
        .from('match_schedules')
        .update({ schedules_custom_request: null })
        .eq('id', schedule.id)

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
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