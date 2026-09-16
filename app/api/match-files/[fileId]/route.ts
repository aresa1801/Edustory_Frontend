import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { fileId } = params
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const role = searchParams.get('role') as 'tutor' | 'student' | null

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'user_id dan role wajib diisi' },
        { status: 400 }
      )
    }

    // 1. Ambil file row
    const { data: fileRow, error: fetchError } = await supabaseAdmin
      .from('match_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fetchError || !fileRow) {
      return NextResponse.json(
        { error: 'File tidak ditemukan' },
        { status: 404 }
      )
    }

    // 2. Resolve user_id → profile id
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

    const isOwner = fileRow.uploader_id === profile.id

    // 3. Cek permission delete
    let canDelete = false

    if (role === 'tutor') {
      // Tutor: bisa hapus miliknya sendiri + semua file di tutor_private & tugas_*
      canDelete =
        isOwner ||
        fileRow.folder === 'tutor_private' ||
        fileRow.folder.startsWith('tugas_')
    } else {
      // Student: bisa hapus miliknya sendiri + semua file di student_private
      canDelete = isOwner || fileRow.folder === 'student_private'
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Kamu tidak punya akses menghapus file ini' },
        { status: 403 }
      )
    }

    // 4. Hapus dari storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('match-files')
      .remove([fileRow.storage_path])

    if (storageError) {
      console.error('[API delete] Storage error:', storageError)
      // Lanjut hapus metadata meskipun storage error
    }

    // 5. Hapus dari DB
    const { error: deleteError } = await supabaseAdmin
      .from('match_files')
      .delete()
      .eq('id', fileId)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API match-files DELETE] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}