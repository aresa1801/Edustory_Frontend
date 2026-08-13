// app/api/matches/[id]/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[API] /matches/[id] START, id:', params.id)

  try {
    // 1. Buat Supabase client dengan service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Query langsung, tanpa auth check, tanpa join, hanya select kolom yang dibutuhkan
    const { data, error } = await supabase
      .from('matches')
      .select('matched_subjects, student_schedule, tutor_full_name, status')
      .eq('id', params.id)
      .maybeSingle()

    console.log('[API] Query result:', data)
    console.log('[API] Query error:', error)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API] Exception:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}