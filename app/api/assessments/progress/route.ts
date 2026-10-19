import { createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { buildAcademicPlan } from '@/lib/academic-plan'
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
      .select('id, verified_grade_levels, specializations_sd, specializations_smp, specializations_sma')
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

    const { data: academicRows } = await supabase
      .from('academic_assessments')
      .select('id, score, level_targeted, subject_results, passed_subjects, failed_subjects, created_at')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: true })

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

    const academicPlan = buildAcademicPlan(tutor, academicRows ?? [])
    const completedSteps = new Set<string>(progress?.completed_steps || [])
    if (academicPlan.allPassed) completedSteps.add('academic')
    else completedSteps.delete('academic')
    const normalizedProgress = progress
      ? { ...progress, completed_steps: [...completedSteps] }
      : progress

    // Normalize all score fields to a consistent `score` key for the frontend
    return NextResponse.json({
      progress: normalizedProgress,
      psychology: psychologyRaw ? { score: psychologyRaw.score } : null,
      academic: academicRows?.length
        ? {
            score: academicPlan.academicScore,
            level_targeted: academicRows[academicRows.length - 1]?.level_targeted ?? null,
            levels: academicPlan.levels,
            all_passed: academicPlan.allPassed,
          }
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

export const dynamic = 'force-dynamic'
