import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { unstable_noStore as noStore } from 'next/cache'
import { getRequestUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const MAX_PENDING_OFFERS = 5
const AMAN_THRESHOLD = 81
const BLOCKING_STATUSES = ['pending', 'matched', 'active']

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export async function GET(request: NextRequest) {
  noStore()
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
      },
    )

    const { data: tutor } = await supabase
      .from('tutors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!tutor) return NextResponse.json({ students: [] })

    const { data: students, error } = await supabase
      .from('students')
      .select(
        'id, name, grade_level, subjects, budget_per_month, sessions_per_month, preferred_schedule, address, avatar_url, latitude, longitude, is_online, credit_score',
      )
      .gte('credit_score', 26)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!students || students.length === 0) return NextResponse.json({ students: [] })

    const studentIds = students.map((s) => s.id)

    const { data: matches } = await supabase
      .from('matches')
      .select('id, student_id, tutor_id, status, matched_subjects')
      .in('student_id', studentIds)
      .in('status', BLOCKING_STATUSES)

    const pendingCount = new Map<string, number>()
    const matchedSubjects = new Map<string, Set<string>>()
    const alreadyOffered = new Set<string>()

    for (const match of matches ?? []) {
      const studentId = String(match.student_id)
      if (match.status === 'pending') {
        pendingCount.set(studentId, (pendingCount.get(studentId) ?? 0) + 1)
      }
      if (match.status !== 'pending') {
        const set = matchedSubjects.get(studentId) ?? new Set<string>()
        for (const subject of toArray(match.matched_subjects)) set.add(subject.toLowerCase())
        matchedSubjects.set(studentId, set)
      }
      if (match.tutor_id === tutor.id) alreadyOffered.add(studentId)
    }

    const result = students
      .filter((student) => {
        // Hide students this tutor already pitched (anti-spam).
        if (alreadyOffered.has(student.id)) return false

        // Credit-tier cap on concurrent pending offers per student.
        const score = Number(student.credit_score ?? 99)
        if (score < AMAN_THRESHOLD) {
          const pending = pendingCount.get(student.id) ?? 0
          if (pending >= MAX_PENDING_OFFERS) return false
        }

        return true
      })
      .map((student) => {
        const taken = matchedSubjects.get(student.id) ?? new Set<string>()
        const available = toArray(student.subjects).filter((subject) => !taken.has(subject.toLowerCase()))
        return { ...student, available_subjects: available }
      })
      // Hide the card entirely when every subject already has a tutor.
      .filter((student) => student.available_subjects.length > 0)

    return NextResponse.json(
      { students: result },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } },
    )
  } catch (err) {
    console.error('[tutors/students]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
