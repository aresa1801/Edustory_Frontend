import { createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminClient()

    const { data: tutor } = await supabase
      .from('tutors')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!tutor) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    const { data: progress } = await supabase
      .from('curation_progress')
      .select('*')
      .eq('tutor_id', tutor.id)
      .single()

    const { data: psychologyRaw } = await supabase
      .from('psychology_assessments')
      .select('score')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: academicRaw } = await supabase
      .from('academic_assessments')
      .select('score, level_targeted')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: microteachingRaw } = await supabase
      .from('microteaching_assessments')
      .select('overall_score')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: handwritingRaw } = await supabase
      .from('handwriting_assessments')
      .select('overall_score')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: interviewRaw } = await supabase
      .from('ai_interview_assessments')
      .select('overall_score')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Normalize all score fields to a consistent `score` key for the frontend
    return NextResponse.json({
      progress,
      psychology: psychologyRaw ? { score: psychologyRaw.score } : null,
      academic: academicRaw
        ? { score: academicRaw.score, level_targeted: academicRaw.level_targeted }
        : null,
      microteaching: microteachingRaw ? { score: microteachingRaw.overall_score } : null,
      handwriting: handwritingRaw ? { score: handwritingRaw.overall_score } : null,
      interview: interviewRaw ? { score: interviewRaw.overall_score } : null,
    })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    )
  }
}
