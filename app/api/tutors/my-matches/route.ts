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

    return NextResponse.json(matches || [])
  } catch (err) {
    console.error('[API] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}