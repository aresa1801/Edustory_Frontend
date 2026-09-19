import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/security/sanitize'

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

    // ✅ Validasi UUID
    if (!isValidUUID(fileId)) {
      return NextResponse.json(
        { error: 'fileId tidak valid' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const role = searchParams.get('role') as 'tutor' | 'student' | null

    // ✅ Validasi UUID user_id
    if (!isValidUUID(userId) || !role || !['tutor', 'student'].includes(role)) {
      return NextResponse.json(
        { error: 'user_id dan role tidak valid' },
        { status: 400 }
      )
    }

    // ... sisanya sama seperti sebelumnya
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

    if (fileRow.uploader_id !== profile.id) {
      return NextResponse.json(
        { error: 'Kamu hanya bisa menghapus file yang kamu upload sendiri' },
        { status: 403 }
      )
    }

    const { error: storageError } = await supabaseAdmin.storage
      .from('match-files')
      .remove([fileRow.storage_path])

    if (storageError) {
      console.error('[API delete] Storage error:', storageError)
    }

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