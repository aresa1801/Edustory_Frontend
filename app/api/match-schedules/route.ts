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
    const role = searchParams.get('role')

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'user_id dan role required' },
        { status: 400 }
      )
    }

    const profileTable = role === 'tutor' ? 'tutors' : 'students'
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

    let query = supabaseAdmin
      .from('match_schedules')
      .select(`
        *,
        matches!inner(
          id,
          student_id,
          tutor_id,
          matched_subjects,
          student_full_name,
          student_grade,
          student_avatar,
          student_address,
          student_is_online,
          accepted_at,
          contract_end_date,
          status,
          tutor_full_name,
          tutor_avatar_url,
          tutor_hourly_rate,
          tutor_rating
        )
      `)

    if (role === 'tutor') {
      query = query.eq('tutor_id', profile.id)
    } else {
      query = query.eq('student_id', profile.id)
    }

    const { data: schedules, error: scheduleError } = await query.order(
      'created_at',
      { ascending: false }
    )

    if (scheduleError) {
      return NextResponse.json(
        { error: scheduleError.message },
        { status: 500 }
      )
    }

    const studentIds = [
      ...new Set((schedules || []).map((s: any) => s.student_id)),
    ]
    const tutorIds = [
      ...new Set((schedules || []).map((s: any) => s.tutor_id)),
    ]

    const { data: students } = await supabaseAdmin
      .from('students')
      .select(
        'id, name, gender, phone, bio, school_name, school_type, school_city, parent_name, parent_relation, parent_phone, parent_email, is_online'
      )
      .in('id', studentIds)

    const { data: tutors } = await supabaseAdmin
      .from('tutors')
      .select(
        'id, full_name, phone, email, bio, experience_years, qualifications, hourly_rate, rating, total_reviews, verified_grade_levels, avatar_url, is_online'
      )
      .in('id', tutorIds)

    const studentsMap = new Map(
      (students || []).map((s: any) => [s.id, s])
    )
    const tutorsMap = new Map((tutors || []).map((t: any) => [t.id, t]))

    const transformed = (schedules || []).map((item: any) => {
      const studentDetail = studentsMap.get(item.student_id)
      const tutorDetail = tutorsMap.get(item.tutor_id)
      const match = item.matches

      return {
        id: item.id,
        matchId: item.match_id,
        status: item.status,
        schedulesSummaryFix: item.schedules_summary_fix,
        schedulesCustom: item.schedules_custom,
        ulasan: item.ulasan || [],
        acceptedAt: match?.accepted_at,
        contractEndDate: match?.contract_end_date,
        student: {
          id: item.student_id,
          name: match?.student_full_name || studentDetail?.name,
          avatar: match?.student_avatar,
          grade: match?.student_grade,
          address: match?.student_address,
          matchedSubjects: match?.matched_subjects || [],
          gender: studentDetail?.gender,
          phone: studentDetail?.phone,
          bio: studentDetail?.bio,
          schoolName: studentDetail?.school_name,
          schoolType: studentDetail?.school_type,
          schoolCity: studentDetail?.school_city,
          parentName: studentDetail?.parent_name,
          parentRelation: studentDetail?.parent_relation,
          parentPhone: studentDetail?.parent_phone,
          parentEmail: studentDetail?.parent_email,
          isOnline:
            match?.student_is_online ?? studentDetail?.is_online ?? true,
        },
        tutor: {
          id: item.tutor_id,
          fullName:
            tutorDetail?.full_name || match?.tutor_full_name || 'Tutor',
          phone: tutorDetail?.phone || '',
          email: tutorDetail?.email || '',
          bio: tutorDetail?.bio || '',
          experienceYears: tutorDetail?.experience_years || 0,
          qualifications: tutorDetail?.qualifications || '',
          hourlyRate:
            tutorDetail?.hourly_rate ?? match?.tutor_hourly_rate ?? 0,
          rating: tutorDetail?.rating ?? match?.tutor_rating ?? 0,
          totalReviews: tutorDetail?.total_reviews || 0,
          verifiedGradeLevels: tutorDetail?.verified_grade_levels || [],
          avatar:
            tutorDetail?.avatar_url || match?.tutor_avatar_url || null,
          isOnline: tutorDetail?.is_online ?? true,
          matchedSubjects: match?.matched_subjects || [],
        },
      }
    })

    return NextResponse.json(transformed)
  } catch (err) {
    console.error('[API match-schedules] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}