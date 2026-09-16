import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ========== KONFIG ==========
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'application/zip',
  'application/x-zip-compressed',
  'video/mp4',
]

// Folder pribadi (hardcoded, satu per role)
const PRIVATE_FOLDERS = ['tutor_private', 'student_private']

// ========== POST: Upload File ==========
export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Parse FormData
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const matchId = formData.get('match_id') as string | null
    const folder = formData.get('folder') as string | null
    const userId = formData.get('user_id') as string | null
    const role = formData.get('role') as 'tutor' | 'student' | null

    if (!file || !matchId || !folder || !userId || !role) {
      return NextResponse.json(
        { error: 'file, match_id, folder, user_id, role wajib diisi' },
        { status: 400 }
      )
    }

    // 2. Validasi role
    if (!['tutor', 'student'].includes(role)) {
      return NextResponse.json({ error: 'role tidak valid' }, { status: 400 })
    }

    // 3. Validasi folder (private atau dari match_folders)
    const isPrivate = PRIVATE_FOLDERS.includes(folder)

    if (isPrivate) {
      if (folder === 'tutor_private' && role !== 'tutor') {
        return NextResponse.json(
          { error: 'Akses ditolak ke folder ini' },
          { status: 403 }
        )
      }
      if (folder === 'student_private' && role !== 'student') {
        return NextResponse.json(
          { error: 'Akses ditolak ke folder ini' },
          { status: 403 }
        )
      }
    } else {
      // Cek apakah folder ada di match_folders untuk match ini
      const { data: folderRow, error: folderErr } = await supabaseAdmin
        .from('match_folders')
        .select('id')
        .eq('match_id', matchId)
        .eq('folder_key', folder)
        .single()

      if (folderErr || !folderRow) {
        return NextResponse.json(
          { error: 'Folder tidak ditemukan' },
          { status: 404 }
        )
      }
    }

    // 4. Validasi ukuran
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Ukuran file maksimal 25MB` },
        { status: 400 }
      )
    }

    // 5. Validasi MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipe file tidak diizinkan: ${file.type}` },
        { status: 400 }
      )
    }

    // 6. Resolve user_id → uploader_id (tutors.id atau students.id)
    const table = role === 'tutor' ? 'tutors' : 'students'
    const { data: profile, error: profileError } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: `${role} tidak ditemukan` },
        { status: 404 }
      )
    }

    const uploaderId = profile.id

    // 7. Generate storage path
    const uniqueId = crypto.randomUUID()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${matchId}/${folder}/${uniqueId}-${safeName}`

    // 8. Upload ke Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from('match-files')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[API upload] Storage error:', uploadError)
      return NextResponse.json(
        { error: 'Gagal upload ke storage: ' + uploadError.message },
        { status: 500 }
      )
    }

    // 9. Insert metadata ke DB
    const { data: fileRow, error: insertError } = await supabaseAdmin
      .from('match_files')
      .insert({
        match_id: matchId,
        folder,
        uploader_id: uploaderId,
        uploader_role: role,
        filename: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single()

    if (insertError) {
      // Rollback: hapus file dari storage
      await supabaseAdmin.storage.from('match-files').remove([storagePath])
      console.error('[API upload] DB insert error:', insertError)
      return NextResponse.json(
        { error: 'Gagal simpan metadata: ' + insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, file: fileRow })
  } catch (err) {
    console.error('[API upload] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}