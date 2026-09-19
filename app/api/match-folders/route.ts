import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID, sanitizeText } from '@/lib/security/sanitize'

export const dynamic = 'force-dynamic'

// ============================================================
// GET — List folders per match (tidak berubah)
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(req.url)
    const matchId = searchParams.get('match_id')

    if (!isValidUUID(matchId)) {
      return NextResponse.json(
        { error: 'match_id tidak valid' },
        { status: 400 }
      )
    }

    let { data: folders, error } = await supabaseAdmin
      .from('match_folders')
      .select('*')
      .eq('match_id', matchId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!folders || folders.length === 0) {
      const defaults = [
        { match_id: matchId, folder_key: 'tugas_1', label: 'Tugas 1', is_default: true },
        { match_id: matchId, folder_key: 'tugas_2', label: 'Tugas 2', is_default: true },
        { match_id: matchId, folder_key: 'tugas_3', label: 'Tugas 3', is_default: true },
      ]
      await supabaseAdmin.from('match_folders').insert(defaults)
      const refetch = await supabaseAdmin
        .from('match_folders')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })
      folders = refetch.data
    }

    return NextResponse.json(
      { folders: folders || [] },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST — Create custom folder (tutor only)
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Parse body dengan guard
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
    }

    const { match_id, label, user_id, role } = body

    // 1. Validasi role
    if (role !== 'tutor') {
      return NextResponse.json(
        { error: 'Hanya tutor yang bisa membuat folder' },
        { status: 403 }
      )
    }

    // 2. Validasi UUID
    if (!isValidUUID(match_id)) {
      return NextResponse.json(
        { error: 'match_id tidak valid' },
        { status: 400 }
      )
    }
    if (!isValidUUID(user_id)) {
      return NextResponse.json(
        { error: 'user_id tidak valid' },
        { status: 400 }
      )
    }

    // 3. Sanitize label
    const sanitizeResult = sanitizeText(label, 50)
    if (!sanitizeResult.ok) {
      return NextResponse.json(
        { error: sanitizeResult.error },
        { status: 400 }
      )
    }
    const safeLabel = sanitizeResult.sanitized

    // 4. Resolve tutor
    const { data: tutor, error: tErr } = await supabaseAdmin
      .from('tutors')
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (tErr || !tutor) {
      return NextResponse.json({ error: 'Tutor tidak ditemukan' }, { status: 404 })
    }

    // 5. ✅ VALIDASI OWNERSHIP: match harus milik tutor ini
    const { data: schedule, error: sErr } = await supabaseAdmin
      .from('match_schedules')
      .select('id, tutor_id')
      .eq('match_id', match_id)
      .single()

    if (sErr || !schedule) {
      return NextResponse.json(
        { error: 'Match tidak ditemukan' },
        { status: 404 }
      )
    }

    if (schedule.tutor_id !== tutor.id) {
      return NextResponse.json(
        { error: 'Kamu tidak punya akses ke match ini' },
        { status: 403 }
      )
    }

    // 6. Generate unique folder_key (length lebih panjang biar ga collision)
    const folderKey = `custom_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`

    // 7. Insert
    const { data: folder, error: insertErr } = await supabaseAdmin
      .from('match_folders')
      .insert({
        match_id,
        folder_key: folderKey,
        label: safeLabel,
        is_default: false,
        created_by: tutor.id,
      })
      .select()
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, folder })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}