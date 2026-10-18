import { createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    const supabase = getAdminClient()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { answers, score, timeTaken, level } = await req.json()

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
      .select('id, completed_steps')
      .eq('tutor_id', tutor.id)
      .single()

    if (!progress) {
      return NextResponse.json(
        { error: 'Curation progress not found' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('academic_assessments')
      .insert({
        tutor_id: tutor.id,
        curation_progress_id: progress.id,
        answers,
        score,
        passed: score >= 70,
        submitted_at: new Date().toISOString(),
        time_spent_seconds: timeTaken,
        level_targeted: level ?? null,
      })
      .select()
      .single()

    if (error) throw error

    // Save target grade level on the tutor record so it persists for the full curation cycle
    if (level) {
      await supabase
        .from('tutors')
        .update({ target_grade_level: level })
        .eq('id', tutor.id)
    }

    const existingSteps: string[] = progress.completed_steps || []
    const newSteps = existingSteps.includes('academic')
      ? existingSteps
      : [...existingSteps, 'academic']

    await supabase
      .from('curation_progress')
      .update({
        current_step: 'microteaching',
        completed_steps: newSteps,
        updated_at: new Date().toISOString()
      })
      .eq('id', progress.id)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error saving academic assessment:', error)
    return NextResponse.json(
      { error: 'Failed to save assessment' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
