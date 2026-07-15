import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject')
    const gradeLevel = searchParams.get('gradeLevel')

    let query = supabase
      .from('tutors')
      .select(`
        id,
        user_id,
        specializations,
        qualifications,
        experience_years,
        hourly_rate,
        rating,
        total_reviews,
        verified,
        user_profiles:user_id(name, avatar_url, bio, phone)
      `)
      .eq('approval_status', 'approved')

    if (subject) {
      query = query.contains('specializations', [subject])
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching tutors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tutors' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const body = await request.json()
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

    const { data, error } = await supabase
      .from('tutors')
      .insert([
        {
          user_id: user.id,
          ...body,
        },
      ])
      .select()

    if (error) throw error

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Error creating tutor:', error)
    return NextResponse.json(
      { error: 'Failed to create tutor' },
      { status: 500 }
    )
  }
}
