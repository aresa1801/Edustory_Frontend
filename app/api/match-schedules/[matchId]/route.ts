import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

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

    // ===== 1. Ambil match_schedules (SELECT * — bypass PostgREST nested bug) =====
    const { data: schedule, error: schedError } = await supabaseAdmin
      .from('match_schedules')
      .select('*')
      .eq('match_id', matchId)
      .maybeSingle()

    if (schedError) {
      console.error('[API] schedError:', schedError)
      return NextResponse.json(
        { error: 'DB error: ' + schedError.message },
        { status: 500 }
      )
    }

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // ===== DEBUG LOG =====
    console.log('[API DEBUG] matchId:', matchId)
    console.log(
      '[API DEBUG] schedules_custom_request:',
      JSON.stringify(schedule.schedules_custom_request)
    )
    console.log(
      '[API DEBUG] schedules_custom:',
      JSON.stringify(schedule.schedules_custom)
    )

    // ===== 2. Ambil matches secara terpisah =====
    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select(
        'id, matched_subjects, student_full_name, student_grade, student_avatar, student_address, student_latitude, student_longitude, student_is_online, student_budget_per_month, student_sessions_per_month, accepted_at, contract_end_date, tutor_full_name, tutor_avatar_url, tutor_hourly_rate, tutor_rating'
      )
      .eq('id', matchId)
      .maybeSingle()

    if (matchError) {
      console.error('[API] matchError:', matchError)
    }

    // ===== 3. Ambil student & tutor =====
    const [studentRes, tutorRes] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select(
          'id, name, gender, phone, bio, school_name, school_type, school_city, parent_name, parent_relation, parent_phone, parent_email, is_online, latitude, longitude'
        )
        .eq('id', schedule.student_id)
        .maybeSingle(),
      supabaseAdmin
        .from('tutors')
        .select(
          'id, full_name, phone, bio, experience_years, qualifications, hourly_rate, rating, total_reviews, verified_grade_levels, avatar_url'
        )
        .eq('id', schedule.tutor_id)
        .maybeSingle(),
    ])

    const studentDetail = studentRes.data
    const tutorDetail = tutorRes.data

    // ===== 4. Ambil sessions =====
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
      const diffMinutes = (now.getTime() - scheduledAt.getTime()) / 1000 / 60

      if (diffMinutes > READY_WINDOW_MINUTES) {
        expiredIds.push(s.id)
        return { ...s, cancelled_at: now.toISOString(), status: 'cancelled' }
      }
      return s
    })

    if (expiredIds.length > 0) {
      await supabaseAdmin
        .from('sessions')
        .update({ cancelled_at: now.toISOString(), status: 'cancelled' })
        .in('id', expiredIds)
    }

    // ===== 5. Auto-expire termination_request kalau deadline lewat =====
    if (
      schedule.termination_request?.status === 'pending' &&
      new Date(schedule.termination_request.deadline) < now
    ) {
      await supabaseAdmin
        .from('match_schedules')
        .update({
          termination_request: {
            ...schedule.termination_request,
            status: 'expired',
          },
        })
        .eq('id', schedule.id)
    }

    // ===== 6. Auto-expire extension_request kalau deadline lewat =====
    if (
      schedule.extension_request?.status === 'pending' &&
      new Date(schedule.extension_request.deadline) < now
    ) {
      await supabaseAdmin
        .from('match_schedules')
        .update({
          extension_request: {
            ...schedule.extension_request,
            status: 'expired',
          },
        })
        .eq('id', schedule.id)
    }

    // ===== 7. Compose response =====
    const response = {
      id: schedule.id,
      matchId: schedule.match_id,
      status: schedule.status,
      schedulesSummaryFix: schedule.schedules_summary_fix,
      schedulesCustom: schedule.schedules_custom,
      schedulesCustomRequest: schedule.schedules_custom_request ?? null,
      rescheduleNotification: schedule.reschedule_notification ?? null,

      extensionRequest: (() => {
        const er = schedule.extension_request
        if (!er) return null
        // Auto-expire kalau deadline lewat & masih pending
        if (er.status === 'pending' && new Date(er.deadline) < now) {
          return { ...er, status: 'expired' }
        }
        return er
      })(),
      extensionNotification: schedule.extension_notification ?? null,

      ulasan: schedule.ulasan || [],
      gmeetLink: schedule.gmeet_link ?? null,
      hasReviewed: false,

      terminationRequest: (() => {
        const tr = schedule.termination_request
        if (!tr) return null
        // Auto-expire kalau deadline lewat & masih pending
        if (tr.status === 'pending' && new Date(tr.deadline) < now) {
          return { ...tr, status: 'expired' }
        }
        return tr
      })(),
      contractEndedAt: schedule.termination_request?.ended_at ?? null,

      acceptedAt: match?.accepted_at,
      contractEndDate: match?.contract_end_date,
      tutorPrivateFolderLabel:
        schedule.tutor_private_folder_label || 'Pribadi Saya',
      studentPrivateFolderLabel:
        schedule.student_private_folder_label || 'Pribadi Saya',

      student: {
        id: schedule.student_id,
        name: match?.student_full_name || studentDetail?.name || 'Siswa',
        avatar: match?.student_avatar || null,
        grade: match?.student_grade || '',
        address: match?.student_address || '',
        matchedSubjects: match?.matched_subjects || [],
        latitude: match?.student_latitude ?? studentDetail?.latitude ?? null,
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
        fullName: tutorDetail?.full_name || match?.tutor_full_name || 'Tutor',
        phone: tutorDetail?.phone || '',
        bio: tutorDetail?.bio || '',
        experienceYears: tutorDetail?.experience_years || 0,
        qualifications: tutorDetail?.qualifications || '',
        hourlyRate: tutorDetail?.hourly_rate ?? match?.tutor_hourly_rate ?? 0,
        rating: tutorDetail?.rating ?? match?.tutor_rating ?? 0,
        totalReviews: tutorDetail?.total_reviews || 0,
        verifiedGradeLevels: tutorDetail?.verified_grade_levels || [],
        avatar: tutorDetail?.avatar_url || match?.tutor_avatar_url || null,
        matchedSubjects: match?.matched_subjects || [],
      },

      sessions: processedSessions,
    }

    // ===== 8. Cek apakah student sudah review match ini =====
    const { data: existingReview } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('match_id', matchId)
      .maybeSingle()

    response.hasReviewed = !!existingReview

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (err) {
    console.error('[API match-schedules/:id] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}