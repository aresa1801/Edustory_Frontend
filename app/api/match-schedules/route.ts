import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Helper: parse "YYYY-MM-DD" + "HH.MM - HH.MM" jadi Date UTC
function parseTargetDate(dateStr: string, timeSlot: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const match = timeSlot.match(/(\d{1,2})\.(\d{2})/)
  const startHour = match ? parseInt(match[1]) : 0
  const startMin = match ? parseInt(match[2]) : 0
  return Date.UTC(y, m - 1, d, startHour, startMin)
}

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

    // ========== 1. Cari profile ==========
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

    // ========== 2. Ambil match_schedules ==========
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

    // ========== 3. Auto-reject reschedule request expired ==========
    const nowMs = Date.now()
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000
    const expiredRequestIds: string[] = []

    const processedSchedules = (schedules || []).map((s: any) => {
      const req = s.schedules_custom_request
      if (!req) return s
      if (req.status && req.status !== 'pending') return s

      // Deadline 1: requested_at + 2 hari
      const requestedMs = new Date(req.requested_at).getTime()
      const deadline1 = requestedMs + TWO_DAYS_MS

      // Deadline 2: waktu target (date + jam mulai), parse UTC
      let deadline2 = Infinity
      if (req.to?.date && req.to?.time) {
        deadline2 = parseTargetDate(req.to.date, req.to.time)
      }

      // Ambil yang paling cepat
      const effectiveDeadline = Math.min(deadline1, deadline2)

      if (nowMs > effectiveDeadline) {
        expiredRequestIds.push(s.id)
        return { ...s, schedules_custom_request: null }
      }
      return s
    })

    // Update DB untuk reschedule yang expired
    if (expiredRequestIds.length > 0) {
      console.log(
        '[AUTO-REJECT] Expiring reschedule request(s):',
        expiredRequestIds
      )
      await supabaseAdmin
        .from('match_schedules')
        .update({ schedules_custom_request: null })
        .in('id', expiredRequestIds)
    }

    // ========== 3b. Auto-expire extension_request ==========
    const expiredExtIds: string[] = []
    processedSchedules.forEach((s: any) => {
      const er = s.extension_request
      if (er?.status === 'pending' && new Date(er.deadline).getTime() < nowMs) {
        expiredExtIds.push(s.id)
        s.extension_request = null
        s.extension_notification = {
          type: 'expired',
          at: new Date().toISOString(),
        }
      }
    })

    if (expiredExtIds.length > 0) {
      console.log('[AUTO-EXPIRE] Expiring extension request(s):', expiredExtIds)
      for (const id of expiredExtIds) {
        const sch = processedSchedules.find((s: any) => s.id === id)
        await supabaseAdmin
          .from('match_schedules')
          .update({
            extension_request: null,
            extension_notification: sch?.extension_notification ?? null,
          })
          .eq('id', id)
      }
    }

    // ========== 4. Ambil data detail student & tutor ==========
    const studentIds = [
      ...new Set(processedSchedules.map((s: any) => s.student_id)),
    ]
    const tutorIds = [
      ...new Set(processedSchedules.map((s: any) => s.tutor_id)),
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
        'id, full_name, phone, bio, experience_years, qualifications, hourly_rate, rating, total_reviews, verified_grade_levels, avatar_url'
      )
      .in('id', tutorIds)

    const studentsMap = new Map(
      (students || []).map((s: any) => [s.id, s])
    )
    const tutorsMap = new Map((tutors || []).map((t: any) => [t.id, t]))

    // ========== 5. Transform response ==========
    const transformed = processedSchedules.map((item: any) => {
      const studentDetail = studentsMap.get(item.student_id)
      const tutorDetail = tutorsMap.get(item.tutor_id)
      const match = item.matches

      return {
        id: item.id,
        matchId: item.match_id,
        status: item.status,
        schedulesSummaryFix: item.schedules_summary_fix,
        schedulesCustom: item.schedules_custom,
        schedulesCustomRequest: item.schedules_custom_request || null,
        extensionRequest: item.extension_request || null,
        extensionNotification: item.extension_notification || null,
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
      }
    })

    return NextResponse.json(transformed, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (err) {
    console.error('[API match-schedules] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}