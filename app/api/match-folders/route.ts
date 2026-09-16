import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ============================================================
// GET — List folders per match
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(req.url)
    const matchId = searchParams.get('match_id')

    if (!matchId) {
      return NextResponse.json({ error: 'match_id required' }, { status: 400 })
    }

    // 1. Fetch dynamic folders
    let { data: folders, error } = await supabaseAdmin
      .from('match_folders')
      .select('*')
      .eq('match_id', matchId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 2. Auto-seed default folders kalau belum ada
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

    const body = await req.json()
    const { match_id, label, user_id, role } = body

    if (!match_id || !label || !user_id || role !== 'tutor') {
      return NextResponse.json(
        { error: 'Hanya tutor yang bisa membuat folder baru' },
        { status: 403 }
      )
    }

    const trimmed = label.trim()
    if (!trimmed || trimmed.length > 50) {
      return NextResponse.json(
        { error: 'Nama folder wajib diisi (maks 50 karakter)' },
        { status: 400 }
      )
    }

    // Resolve tutor_id
    const { data: tutor, error: tErr } = await supabaseAdmin
      .from('tutors')
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (tErr || !tutor) {
      return NextResponse.json({ error: 'Tutor tidak ditemukan' }, { status: 404 })
    }

    // Generate unique folder_key
    const folderKey = `custom_${crypto.randomUUID().slice(0, 8)}`

    const { data: folder, error: insertErr } = await supabaseAdmin
      .from('match_folders')
      .insert({
        match_id,
        folder_key: folderKey,
        label: trimmed,
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