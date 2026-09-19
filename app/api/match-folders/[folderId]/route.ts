import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID, sanitizeText } from '@/lib/security/sanitize'

export const dynamic = 'force-dynamic'

// ============================================================
// Helper: Validate folder ownership
// ============================================================
async function validateFolderOwnership(
  supabaseAdmin: any,
  folderId: string,
  userId: string
): Promise<
  | { ok: true; folder: any; tutor: any }
  | { ok: false; status: number; error: string }
> {
  // 1. Validasi folder ID
  if (!isValidUUID(folderId)) {
    return { ok: false, status: 400, error: 'folderId tidak valid' }
  }

  // 2. Validasi user ID
  if (!isValidUUID(userId)) {
    return { ok: false, status: 400, error: 'user_id tidak valid' }
  }

  // 3. Resolve tutor
  const { data: tutor, error: tErr } = await supabaseAdmin
    .from('tutors')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (tErr || !tutor) {
    return { ok: false, status: 404, error: 'Tutor tidak ditemukan' }
  }

  // 4. Ambil folder
  const { data: folder, error: fErr } = await supabaseAdmin
    .from('match_folders')
    .select('*')
    .eq('id', folderId)
    .single()

  if (fErr || !folder) {
    return { ok: false, status: 404, error: 'Folder tidak ditemukan' }
  }

  // 5. Cek ownership: folder ini harus milik match tutor ini
  const { data: schedule, error: sErr } = await supabaseAdmin
    .from('match_schedules')
    .select('id, tutor_id')
    .eq('match_id', folder.match_id)
    .single()

  if (sErr || !schedule) {
    return { ok: false, status: 404, error: 'Match tidak ditemukan' }
  }

  if (schedule.tutor_id !== tutor.id) {
    return {
      ok: false,
      status: 403,
      error: 'Kamu tidak punya akses ke folder ini',
    }
  }

  return { ok: true, folder, tutor }
}

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

    // Parse body
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
    }

    const { label, user_id, role } = body

    if (role !== 'tutor') {
      return NextResponse.json(
        { error: 'Hanya tutor yang bisa rename folder' },
        { status: 403 }
      )
    }

    // Sanitize label
    const sanitizeResult = sanitizeText(label, 50)
    if (!sanitizeResult.ok) {
      return NextResponse.json(
        { error: sanitizeResult.error },
        { status: 400 }
      )
    }
    const safeLabel = sanitizeResult.sanitized

    // Validasi ownership
    const validation = await validateFolderOwnership(
      supabaseAdmin,
      folderId,
      user_id
    )
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      )
    }

    // Cek folder default tidak bisa di-rename? (opsional)
    // Kalau mau default folder bisa rename juga, skip ini
    // if (validation.folder.is_default) {
    //   return NextResponse.json(
    //     { error: 'Folder default tidak bisa di-rename' },
    //     { status: 400 }
    //   )
    // }

    // Update
    const { error: updateErr } = await supabaseAdmin
      .from('match_folders')
      .update({ label: safeLabel })
      .eq('id', folderId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
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

    // Validasi ownership
    const validation = await validateFolderOwnership(
      supabaseAdmin,
      folderId,
      userId
    )
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      )
    }

    const folder = validation.folder

    // Cek folder default tidak bisa dihapus
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
      const paths = files.map((f: any) => f.storage_path)
      await supabaseAdmin.storage.from('match-files').remove(paths)

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