import { createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { buildAcademicPlan } from '@/lib/academic-plan'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = admin()
    const { data: tutor } = await supabase
      .from('tutors')
      .select('id, verified_grade_levels, specializations_sd, specializations_smp, specializations_sma')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })

    let { data: progress } = await supabase
      .from('curation_progress')
      .select('id, completed_steps, current_step, status')
      .eq('tutor_id', tutor.id)
      .maybeSingle()

    if (!progress) {
      const { data: created } = await supabase
        .from('curation_progress')
        .insert({ tutor_id: tutor.id, current_step: 'psychology', completed_steps: [] })
        .select('id, completed_steps, current_step, status')
        .single()
      progress = created
    }

    const { data: assessments } = await supabase
      .from('academic_assessments')
      .select('id, level_targeted, score, subject_results, passed_subjects, failed_subjects, created_at')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: true })

    const plan = buildAcademicPlan(tutor, assessments ?? [])
    return NextResponse.json({ plan, progress })
  } catch (error) {
    console.error('[academic plan]', error)
    return NextResponse.json({ error: 'Failed to load academic plan' }, { status: 500 })
  }
}
