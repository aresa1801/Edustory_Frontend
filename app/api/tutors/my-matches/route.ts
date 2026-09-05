import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // 1. Cari tutor ID dari user_id
    const { data: tutor, error: tutorError } = await supabase
      .from('tutors')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (tutorError || !tutor) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    // 2. Ambil semua matches (dengan kolom statis)
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: false })

    if (matchError) {
      return NextResponse.json({ error: matchError.message }, { status: 500 })
    }

    // ===== 3. Auto-decline permintaan student yang sudah lewat 2 hari =====
    const now = new Date()
    const twoDaysAgo = new Date(now)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const expiredStudentRequests = (matches || []).filter(
      (m: any) =>
        m.status === 'pending' &&
        m.initiated_by === 'student' &&
        m.schedule_submitted_at &&
        new Date(m.schedule_submitted_at) < twoDaysAgo
    )

    if (expiredStudentRequests.length > 0) {
      console.log(
        `⏰ Menemukan ${expiredStudentRequests.length} permintaan student yang sudah melewati 2 hari, akan di-auto decline`
      )
      const expiredIds = expiredStudentRequests.map((m: any) => m.id)
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          status: 'declined',
          initiated_by: 'tutor', // menandakan ditolak oleh guru (karena tidak merespon)
        })
        .in('id', expiredIds)

      if (updateError) {
        console.error('❌ Gagal update expired requests:', updateError)
        // tetap lanjutkan, kita akan return data yang sudah diambil sebelumnya
      } else {
        console.log('✅ Expired requests berhasil di-decline')
        // Ambil ulang data yang sudah diperbarui
        const { data: updatedMatches, error: refetchError } = await supabase
          .from('matches')
          .select('*')
          .eq('tutor_id', tutor.id)
          .order('created_at', { ascending: false })

        if (!refetchError && updatedMatches) {
          return NextResponse.json(updatedMatches || [])
        }
      }
    }

    return NextResponse.json(matches || [])
  } catch (err) {
    console.error('[API] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}