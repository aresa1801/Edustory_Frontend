// app/api/students/my-matches/route.ts
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

    // 1. Cari student ID dari user_id
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // 2. Ambil semua matches (dengan kolom statis) dan filter initiated_by = 'tutor'
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('student_id', student.id)
      .eq('initiated_by', 'tutor')
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