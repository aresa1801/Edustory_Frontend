import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAdminUser(request: NextRequest) {
  const supabase = getSupabase()
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' ? user : null
}

// GET: fetch curation submissions (handwriting & microteaching) pending admin review
export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  const admin = await getAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const tutorId = searchParams.get('tutor_id')

    const hwQuery = supabase
      .from('handwriting_assessments')
      .select(`
        id, tutor_id, problem_1_image_url, problem_1_explanation,
        problem_2_image_url, problem_2_explanation, overall_score, passed, submitted_at,
        tutors:tutor_id(id, user_id, user_profiles:user_id(full_name, email))
      `)
      .order('submitted_at', { ascending: false })

    const mtQuery = supabase
      .from('microteaching_assessments')
      .select(`
        id, tutor_id, topic_selected, video_url, explanation, overall_score, passed, submitted_at,
        tutors:tutor_id(id, user_id, user_profiles:user_id(full_name, email))
      `)
      .order('submitted_at', { ascending: false })

    if (tutorId) {
      hwQuery.eq('tutor_id', tutorId)
      mtQuery.eq('tutor_id', tutorId)
    }

    const [{ data: handwriting, error: hwError }, { data: microteaching, error: mtError }] =
      await Promise.all([hwQuery, mtQuery])

    if (hwError) throw hwError
    if (mtError) throw mtError

    return NextResponse.json({ handwriting, microteaching })
  } catch (error) {
    console.error('Error fetching curation submissions:', error)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}

// POST: admin scores a handwriting or microteaching submission
export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  const admin = await getAdminUser(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { type, id, overall_score, passed, notes } = await request.json()

    if (type === 'handwriting') {
      const { error } = await supabase
        .from('handwriting_assessments')
        .update({
          overall_score,
          passed: !!passed,
          admin_notes: notes || null,
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
    } else if (type === 'microteaching') {
      const { error } = await supabase
        .from('microteaching_assessments')
        .update({
          overall_score,
          passed: !!passed,
          admin_notes: notes || null,
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving curation review:', error)
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
  }
}
