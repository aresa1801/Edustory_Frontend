import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Get matches for current user
export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user role
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('matches')
      .select(`
        id,
        student_id,
        tutor_id,
        subject,
        status,
        student_selected_at,
        tutor_confirmed_at,
        lesson_frequency,
        start_date,
        students:student_id(
          id,
          user_id,
          grade_level,
          user_profiles:user_id(name, email, phone, avatar_url)
        ),
        tutors:tutor_id(
          id,
          user_id,
          specializations,
          hourly_rate,
          rating,
          user_profiles:user_id(name, email, phone, avatar_url, bio)
        )
      `)

    if (userProfile?.role === 'student' || userProfile?.role === 'siswa') {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!student) {
        // Student profile not yet created (onboarding incomplete)
        return NextResponse.json([])
      }

      query = query.eq('student_id', student.id)
    } else if (userProfile?.role === 'tutor') {
      const { data: tutor } = await supabase
        .from('tutors')
        .select('id')
        .eq('user_id', user.id)
        .single()

      query = query.eq('tutor_id', tutor?.id)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    )
  }
}

// Create a match (student selects a tutor)
export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const { tutorId, subject, lessonFrequency, startDate } = await request.json()
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get student ID
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('matches')
      .insert([
        {
          student_id: student.id,
          tutor_id: tutorId,
          subject,
          status: 'pending',
          student_selected_at: new Date().toISOString(),
          lesson_frequency: lessonFrequency,
          start_date: startDate,
        },
      ])
      .select()

    if (error) throw error

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Error creating match:', error)
    return NextResponse.json(
      { error: 'Failed to create match' },
      { status: 500 }
    )
  }
}
