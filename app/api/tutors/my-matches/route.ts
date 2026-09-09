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

    // 2. Ambil semua matches
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: false })

    if (matchError) {
      return NextResponse.json({ error: matchError.message }, { status: 500 })
    }

    const now = new Date()
    let refetch = false

    // ============================================================
    // 3. Auto-decline expired student requests (> 2 hari)
    // ============================================================
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
      const expiredIds = expiredStudentRequests.map((m: any) => m.id)
      await supabase
        .from('matches')
        .update({
          status: 'declined',
          initiated_by: 'tutor',
          ended_at: now.toISOString(),
        })
        .in('id', expiredIds)
      refetch = true
    }

    // ============================================================
    // 4. Auto-complete expired contracts (75 hari)
    // ============================================================
    const expiredContracts = (matches || []).filter(
      (m: any) =>
        (m.status === 'matched' || m.status === 'active') &&
        m.contract_end_date &&
        new Date(m.contract_end_date) < now
    )

    if (expiredContracts.length > 0) {
      const expiredIds = expiredContracts.map((m: any) => m.id)

      // Update matches
      await supabase
        .from('matches')
        .update({
          status: 'completed',
          ended_at: now.toISOString(),
        })
        .in('id', expiredIds)

      // Update match_schedules juga
      await supabase
        .from('match_schedules')
        .update({ status: 'completed' })
        .in('match_id', expiredIds)

      refetch = true
    }

    // ============================================================
    // 5. Jika ada perubahan, ambil ulang data fresh
    // ============================================================
    if (refetch) {
      const { data: freshMatches, error: refetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('tutor_id', tutor.id)
        .order('created_at', { ascending: false })

      if (!refetchError && freshMatches) {
        return NextResponse.json(freshMatches)
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