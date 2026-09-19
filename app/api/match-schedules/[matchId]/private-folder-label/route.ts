import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID, sanitizeText } from '@/lib/security/sanitize'

export const dynamic = 'force-dynamic'

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

    // ✅ FIX 1: Validasi UUID matchId
    if (!isValidUUID(matchId)) {
      return NextResponse.json({ error: 'matchId tidak valid' }, { status: 400 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body JSON tidak valid' }, { status: 400 })
    }

    const { label, user_id, role } = body ?? {}

    if (!label || !user_id || !role) {
      return NextResponse.json(
        { error: 'label, user_id, role wajib diisi' },
        { status: 400 }
      )
    }

    // ✅ FIX 2: Validasi UUID user_id
    if (!isValidUUID(user_id)) {
      return NextResponse.json({ error: 'user_id tidak valid' }, { status: 400 })
    }

    if (!['tutor', 'student'].includes(role)) {
      return NextResponse.json({ error: 'role tidak valid' }, { status: 400 })
    }

    // ✅ FIX 3: Sanitize — sekarang handle bentuk object
    const sanitizeResult = sanitizeText(label)
    if (!sanitizeResult.ok) {
      return NextResponse.json(
        { error: sanitizeResult.error || 'Nama folder tidak valid' },
        { status: 400 }
      )
    }
    const clean = sanitizeResult.sanitized

    if (!clean || clean.length === 0) {
      return NextResponse.json(
        { error: 'Nama folder tidak boleh kosong' },
        { status: 400 }
      )
    }
    if (clean.length > 50) {
      return NextResponse.json(
        { error: 'Nama folder maksimal 50 karakter' },
        { status: 400 }
      )
    }

    // ✅ FIX 4: Resolve user → profile
    const table = role === 'tutor' ? 'tutors' : 'students'
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: `${role} tidak ditemukan` },
        { status: 404 }
      )
    }

    // ✅ FIX 5: Ambil schedule, verifikasi ownership
    const { data: schedule, error: scheduleErr } = await supabaseAdmin
      .from('match_schedules')
      .select('match_id, tutor_id, student_id')
      .eq('match_id', matchId)
      .single()

    if (scheduleErr || !schedule) {
      return NextResponse.json({ error: 'Match tidak ditemukan' }, { status: 404 })
    }

    const isOwner =
      (role === 'tutor' && schedule.tutor_id === profile.id) ||
      (role === 'student' && schedule.student_id === profile.id)

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Tidak punya akses ke match ini' },
        { status: 403 }
      )
    }

    // ✅ FIX 6: Update + .select() biar tau row kena
    const column =
      role === 'tutor'
        ? 'tutor_private_folder_label'
        : 'student_private_folder_label'

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('match_schedules')
      .update({ [column]: clean })
      .eq('match_id', matchId)
      .select('match_id')
      .single()

    if (updateErr || !updated) {
      console.error('[private-folder-label] update error:', updateErr)
      return NextResponse.json(
        { error: 'Gagal menyimpan nama folder' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, label: clean })
  } catch (err) {
    console.error('[private-folder-label] unexpected error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}