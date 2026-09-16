import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ============================================================
// PATCH — Rename folder (tutor only)
// ============================================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { folderId } = params
    const body = await req.json()
    const { label, user_id, role } = body

    if (role !== 'tutor') {
      return NextResponse.json(
        { error: 'Hanya tutor yang bisa rename folder' },
        { status: 403 }
      )
    }

    const trimmed = (label || '').trim()
    if (!trimmed || trimmed.length > 50) {
      return NextResponse.json(
        { error: 'Nama folder wajib diisi (maks 50 karakter)' },
        { status: 400 }
      )
    }

    // Validasi tutor
    const { data: tutor, error: tErr } = await supabaseAdmin
      .from('tutors')
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (tErr || !tutor) {
      return NextResponse.json({ error: 'Tutor tidak ditemukan' }, { status: 404 })
    }

    const { error } = await supabaseAdmin
      .from('match_folders')
      .update({ label: trimmed })
      .eq('id', folderId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE — Delete custom folder only (tutor only)
// ============================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { folderId } = params
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const role = searchParams.get('role')

    if (role !== 'tutor' || !userId) {
      return NextResponse.json(
        { error: 'Hanya tutor yang bisa hapus folder' },
        { status: 403 }
      )
    }

    // Cek folder
    const { data: folder, error: fetchErr } = await supabaseAdmin
      .from('match_folders')
      .select('*')
      .eq('id', folderId)
      .single()

    if (fetchErr || !folder) {
      return NextResponse.json({ error: 'Folder tidak ditemukan' }, { status: 404 })
    }

    if (folder.is_default) {
      return NextResponse.json(
        { error: 'Folder default tidak bisa dihapus' },
        { status: 400 }
      )
    }

    // Cek apakah masih ada file di folder ini
    const { data: files, error: fileErr } = await supabaseAdmin
      .from('match_files')
      .select('id, storage_path')
      .eq('match_id', folder.match_id)
      .eq('folder', folder.folder_key)

    if (fileErr) {
      return NextResponse.json({ error: fileErr.message }, { status: 500 })
    }

    if (files && files.length > 0) {
      // Hapus semua file dari storage
      const paths = files.map((f: any) => f.storage_path)
      await supabaseAdmin.storage.from('match-files').remove(paths)

      // Hapus metadata
      await supabaseAdmin
        .from('match_files')
        .delete()
        .eq('match_id', folder.match_id)
        .eq('folder', folder.folder_key)
    }

    // Hapus folder
    const { error: delErr } = await supabaseAdmin
      .from('match_folders')
      .delete()
      .eq('id', folderId)

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}