import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(req.url)
    const matchId = searchParams.get('match_id')
    const userId = searchParams.get('user_id')
    const role = searchParams.get('role') as 'tutor' | 'student' | null

    if (!matchId || !userId || !role) {
      return NextResponse.json(
        { error: 'match_id, user_id, role wajib diisi' },
        { status: 400 }
      )
    }

    // ===== 1. Resolve user_id → profile id =====
    const profileTable = role === 'tutor' ? 'tutors' : 'students'
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from(profileTable)
      .select('id')
      .eq('user_id', userId)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: `${role} tidak ditemukan` },
        { status: 404 }
      )
    }

    const myProfileId = profile.id

    // ===== 2. Ambil semua file untuk match tersebut =====
    const { data: files, error } = await supabaseAdmin
      .from('match_files')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ===== 3. Filter akses berdasarkan role =====
    const visibleFiles = (files || []).filter((f: any) => {
      if (role === 'tutor') {
        // Tutor: lihat tutor_private + semua folder lain (kecuali student_private)
        return f.folder !== 'student_private'
      } else {
        // Student: lihat student_private + semua folder lain (kecuali tutor_private)
        return f.folder !== 'tutor_private'
      }
    })

    // ===== 4. Generate signed URL + flag ownership =====
    const filesWithUrls = await Promise.all(
      visibleFiles.map(async (f: any) => {
        const { data: signedData } = await supabaseAdmin.storage
          .from('match-files')
          .createSignedUrl(f.storage_path, 3600)

        return {
          ...f,
          signed_url: signedData?.signedUrl || null,
          uploaded_by_me: f.uploader_id === myProfileId,
        }
      })
    )

    // ===== 5. Hitung jumlah file per folder (dinamis) =====
    const counts: Record<string, number> = {
      tutor_private: 0,
      student_private: 0,
    }
    filesWithUrls.forEach((f: any) => {
      if (counts[f.folder] === undefined) {
        counts[f.folder] = 0
      }
      counts[f.folder]++
    })

    return NextResponse.json(
      { files: filesWithUrls, counts },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (err) {
    console.error('[API match-files GET] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}