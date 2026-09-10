import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { matchId } = params

    // 1. Ambil match_schedules + matches
    const { data: schedule, error: schedError } = await supabaseAdmin
      .from('match_schedules')
      .select(`
        id,
        match_id,
        student_id,
        tutor_id,
        status,
        schedules_summary_fix,
        schedules_custom,
        video_call,
        created_at,
        matches!inner(
          id,
          matched_subjects,
          student_full_name,
          student_grade,
          student_avatar,
          student_address,
          student_latitude,
          student_longitude,
          student_is_online,
          accepted_at,
          contract_end_date,
          tutor_full_name,
          tutor_avatar_url,
          tutor_hourly_rate,
          tutor_rating
        )
      `)
      .eq('match_id', matchId)
      .single()

    if (schedError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    const match = (schedule as any).matches

    // 2. Ambil detail student & tutor
    const [studentRes, tutorRes] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select(
          'id, name, gender, phone, bio, school_name, school_type, school_city, parent_name, parent_relation, parent_phone, parent_email, is_online, latitude, longitude'
        )
        .eq('id', schedule.student_id)
        .single(),
      supabaseAdmin
        .from('tutors')
        .select(
          'id, full_name, phone, bio, experience_years, hourly_rate, rating, total_reviews, verified_grade_levels, avatar_url, is_online'
        )
        .eq('id', schedule.tutor_id)
        .single(),
    ])

    const studentDetail = studentRes.data
    const tutorDetail = tutorRes.data

    // 3. Ambil sesi dari tabel sessions (opsional, kalau ada)
    const { data: sessionsData } = await supabaseAdmin
      .from('sessions')
      .select('id, scheduled_at, status, notes')
      .eq('match_id', matchId)
      .order('scheduled_at', { ascending: true })

    // 4. Transform response
    const response = {
      id: schedule.id,
      matchId: schedule.match_id,
      status: schedule.status,
      schedulesSummaryFix: schedule.schedules_summary_fix,
      schedulesCustom: schedule.schedules_custom,
      videoCall: schedule.video_call,
      acceptedAt: match?.accepted_at,
      contractEndDate: match?.contract_end_date,

      student: {
        id: schedule.student_id,
        name: match?.student_full_name || studentDetail?.name || 'Siswa',
        avatar: match?.student_avatar || null,
        grade: match?.student_grade || '',
        address: match?.student_address || '',
        matchedSubjects: match?.matched_subjects || [],
        latitude: match?.student_latitude ?? studentDetail?.latitude ?? null,
        longitude: match?.student_longitude ?? studentDetail?.longitude ?? null,
        gender: studentDetail?.gender || '',
        phone: studentDetail?.phone || '',
        bio: studentDetail?.bio || '',
        schoolName: studentDetail?.school_name || '',
        schoolType: studentDetail?.school_type || '',
        schoolCity: studentDetail?.school_city || '',
        parentName: studentDetail?.parent_name || '',
        parentRelation: studentDetail?.parent_relation || '',
        parentPhone: studentDetail?.parent_phone || '',
        parentEmail: studentDetail?.parent_email || '',
        isOnline: match?.student_is_online ?? studentDetail?.is_online ?? true,
      },

      tutor: tutorDetail
        ? {
            id: tutorDetail.id,
            fullName: tutorDetail.full_name,
            phone: tutorDetail.phone,
            bio: tutorDetail.bio,
            experienceYears: tutorDetail.experience_years,
            hourlyRate: tutorDetail.hourly_rate,
            rating: tutorDetail.rating,
            totalReviews: tutorDetail.total_reviews,
            verifiedGradeLevels: tutorDetail.verified_grade_levels,
            avatar: tutorDetail.avatar_url,
            isOnline: tutorDetail.is_online ?? true,
          }
        : null,

      sessions: sessionsData || [],
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[API match-schedules/:id] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}