import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const role = searchParams.get('role') // 'tutor' atau 'student'

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'user_id dan role (tutor/student) required' },
        { status: 400 }
      )
    }

    let profileId: string | null = null
    let profileTable = role === 'tutor' ? 'tutors' : 'students'
    const { data: profile, error: profileError } = await supabaseAdmin
      .from(profileTable)
      .select('id')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: `${role} tidak ditemukan` },
        { status: 404 }
      )
    }

    profileId = profile.id

    // Build query
    let query = supabaseAdmin
      .from('match_schedules')
      .select(`
        *,
        students!inner(
          id, name, grade_level, phone, email, address, avatar_url, is_online,
          user_profiles!user_id(email)
        ),
        tutors!inner(
          id, full_name, phone, bio, experience_years, hourly_rate, rating, total_reviews,
          verified_grade_levels, avatar_url, is_online,
          user_profiles!user_id(email)
        )
      `)

    if (role === 'tutor') {
      query = query.eq('tutor_id', profileId)
    } else {
      query = query.eq('student_id', profileId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data agar mudah digunakan di frontend
    const transformed = (data || []).map((item: any) => ({
      id: item.id,
      matchId: item.match_id,
      status: item.status,
      schedulesSummaryFix: item.schedules_summary_fix,
      schedulesCustom: item.schedules_custom,
      sesi: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(i => {
        const key = `sesi_${i}`
        return item[key] ?? null
      }),
      videoCall: item.video_call,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      // Data student
      student: item.students ? {
        id: item.students.id,
        name: item.students.name,
        grade: item.students.grade_level,
        phone: item.students.phone,
        email: item.students.user_profiles?.email || item.students.email,
        address: item.students.address,
        avatar: item.students.avatar_url,
        isOnline: item.students.is_online ?? true,
      } : null,
      // Data tutor
      tutor: item.tutors ? {
        id: item.tutors.id,
        fullName: item.tutors.full_name,
        phone: item.tutors.phone,
        bio: item.tutors.bio,
        experienceYears: item.tutors.experience_years,
        hourlyRate: item.tutors.hourly_rate,
        rating: item.tutors.rating,
        totalReviews: item.tutors.total_reviews,
        verifiedGradeLevels: item.tutors.verified_grade_levels,
        avatar: item.tutors.avatar_url,
        isOnline: item.tutors.is_online ?? true,
        email: item.tutors.user_profiles?.email || item.tutors.email,
      } : null,
    }))

    return NextResponse.json(transformed)
  } catch (err) {
    console.error('[API match-schedules] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}