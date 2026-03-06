import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get all pending tutor applications
export async function GET(request: NextRequest) {
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

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('users_profile')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminCheck?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can access this' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('tutor_applications')
      .select(`
        id,
        tutor_id,
        education_background,
        why_teach,
        tutor_references,
        status,
        created_at,
        tutors:tutor_id(
          id,
          user_id,
          specializations,
          experience_years,
          qualifications,
          users_profile:user_id(full_name, email, phone, avatar_url)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching applications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}

// Approve or reject a tutor application
export async function POST(request: NextRequest) {
  try {
    const { applicationId, status, rejectionReason } = await request.json()
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

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('users_profile')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminCheck?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can access this' },
        { status: 403 }
      )
    }

    // Get the application
    const { data: application, error: appError } = await supabase
      .from('tutor_applications')
      .select('tutor_id')
      .eq('id', applicationId)
      .single()

    if (appError) throw appError

    // Update application status
    const { error: updateError } = await supabase
      .from('tutor_applications')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: status === 'rejected' ? rejectionReason : null,
      })
      .eq('id', applicationId)

    if (updateError) throw updateError

    // Update tutor approval status if approved
    if (status === 'approved') {
      const { error: tutorError } = await supabase
        .from('tutors')
        .update({
          approval_status: 'approved',
          verified: true,
        })
        .eq('id', application.tutor_id)

      if (tutorError) throw tutorError
    } else if (status === 'rejected') {
      const { error: tutorError } = await supabase
        .from('tutors')
        .update({
          approval_status: 'rejected',
        })
        .eq('id', application.tutor_id)

      if (tutorError) throw tutorError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating application:', error)
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    )
  }
}
