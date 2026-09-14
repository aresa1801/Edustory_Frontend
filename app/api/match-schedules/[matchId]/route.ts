import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const READY_WINDOW_MINUTES = 20

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
        schedules_custom_request,
        ulasan,
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
          student_budget_per_month,
          student_sessions_per_month,
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
          'id, full_name, phone, bio, experience_years, qualifications, hourly_rate, rating, total_reviews, verified_grade_levels, avatar_url'
        )
        .eq('id', schedule.tutor_id)
        .single(),
    ])

    const studentDetail = studentRes.data
    const tutorDetail = tutorRes.data

    const { data: sessionsData } = await supabaseAdmin
      .from('sessions')
      .select(
        'id, scheduled_at, status, notes, tutor_ready_at, student_ready_at, started_at, cancelled_at'
      )
      .eq('match_id', matchId)
      .order('scheduled_at', { ascending: true })

    const now = new Date()
    const expiredIds: string[] = []

    const processedSessions = (sessionsData || []).map((s: any) => {
      if (s.started_at || s.cancelled_at) return s

      const scheduledAt = new Date(s.scheduled_at)
      const diffMinutes =
        (now.getTime() - scheduledAt.getTime()) / 1000 / 60

      if (diffMinutes > READY_WINDOW_MINUTES) {
        expiredIds.push(s.id)
        return {
          ...s,
          cancelled_at: now.toISOString(),
          status: 'cancelled',
        }
      }
      return s
    })

    if (expiredIds.length > 0) {
      await supabaseAdmin
        .from('sessions')
        .update({
          cancelled_at: now.toISOString(),
          status: 'cancelled',
        })
        .in('id', expiredIds)
    }

    const response = {
      id: schedule.id,
      matchId: schedule.match_id,
      status: schedule.status,
      schedulesSummaryFix: schedule.schedules_summary_fix,
      schedulesCustom: schedule.schedules_custom,
      schedulesCustomRequest: schedule.schedules_custom_request || null,
      ulasan: schedule.ulasan || [],
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
        latitude:
          match?.student_latitude ?? studentDetail?.latitude ?? null,
        longitude:
          match?.student_longitude ?? studentDetail?.longitude ?? null,
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
        budgetPerMonth: match?.student_budget_per_month ?? 0,
        sessionsPerMonth: match?.student_sessions_per_month ?? 0,
        isOnline:
          match?.student_is_online ?? studentDetail?.is_online ?? true,
      },

      tutor: {
        id: schedule.tutor_id,
        fullName:
          tutorDetail?.full_name || match?.tutor_full_name || 'Tutor',
        phone: tutorDetail?.phone || '',
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
        matchedSubjects: match?.matched_subjects || [],
      },

      sessions: processedSessions,
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