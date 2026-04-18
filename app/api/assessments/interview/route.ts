import { createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Grade level hierarchy from lowest to highest
const GRADE_LEVEL_ORDER = [
  'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
  'SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9',
  'SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12',
]

/**
 * Returns the target level and all levels below it so a tutor verified at
 * a higher grade automatically qualifies for lower grades.
 */
function resolveVerifiedLevels(targetLevel: string | null): string[] {
  if (!targetLevel) return []
  const idx = GRADE_LEVEL_ORDER.indexOf(targetLevel)
  if (idx === -1) return []
  return GRADE_LEVEL_ORDER.slice(0, idx + 1)
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    const supabase = getAdminClient()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { responses, overallScore, timeTaken } = await req.json()

    const { data: tutor } = await supabase
      .from('tutors')
      .select('id, target_grade_level')
      .eq('user_id', user.id)
      .single()

    if (!tutor) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    const { data: progress } = await supabase
      .from('curation_progress')
      .select('id, completed_steps')
      .eq('tutor_id', tutor.id)
      .single()

    if (!progress) {
      return NextResponse.json({ error: 'Curation progress not found' }, { status: 404 })
    }

    const passed = overallScore >= 70

    const { data, error } = await supabase
      .from('ai_interview_assessments')
      .insert({
        tutor_id: tutor.id,
        curation_progress_id: progress.id,
        responses,
        questions_answered: Object.keys(responses || {}).length,
        overall_score: overallScore,
        passed,
        submitted_at: new Date().toISOString(),
        time_spent_seconds: timeTaken,
      })
      .select()
      .single()

    if (error) throw error

    const existingSteps: string[] = progress.completed_steps || []
    const newSteps = existingSteps.includes('interview')
      ? existingSteps
      : [...existingSteps, 'interview']

    const allDone = newSteps.length >= 5

    // Mark curation progress as completed
    await supabase
      .from('curation_progress')
      .update({
        current_step: 'completed',
        completed_steps: newSteps,
        status: allDone ? 'completed' : 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', progress.id)

    // If all 5 stages done and overall interview score passes, assign verified grade levels
    if (allDone && passed) {
      const verifiedLevels = resolveVerifiedLevels(tutor.target_grade_level)
      if (verifiedLevels.length > 0) {
        await supabase
          .from('tutors')
          .update({ verified_grade_levels: verifiedLevels })
          .eq('id', tutor.id)
      }
    }

    return NextResponse.json({ success: true, data, allDone, passed })
  } catch (error) {
    console.error('Error saving interview assessment:', error)
    return NextResponse.json(
      { error: 'Failed to save assessment' },
      { status: 500 }
    )
  }
}
