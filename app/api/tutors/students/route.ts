import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'

export async function GET(request: NextRequest) {
  noStore()
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // SECURITY: endpoint ini dipakai pengajar untuk mencari siswa.
    // Wajib login & hanya untuk pengajar (atau admin) — jangan expose data
    // siswa ke anonim.
    const token = request.headers
      .get('authorization')
      ?.replace(/^Bearer\s+/i, '')
      .trim()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tutor } = await supabase
      .from('tutors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!tutor && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya pengajar' }, { status: 403 })
    }

    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, grade_level, subjects, budget_per_month, sessions_per_month, preferred_schedule, address, avatar_url, latitude, longitude, is_online')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ students: students || [] })
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}