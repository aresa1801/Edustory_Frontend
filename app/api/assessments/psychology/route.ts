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
    // Authenticate via cookie-based session
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    // Use service-role client for DB writes (bypasses RLS so INSERT works)
    const supabase = getAdminClient()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { answers, score, timeTaken } = await req.json()

    // Get tutor record
    const { data: tutor } = await supabase
      .from('tutors')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!tutor) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      )
    }

    // Get or create curation progress (psychology is the first step)
    const { data: progress, error: progressError } = await supabase
      .from('curation_progress')
      .upsert(
        { tutor_id: tutor.id, current_step: 'psychology' },
        { onConflict: 'tutor_id', ignoreDuplicates: false }
      )
      .select('id, completed_steps')
      .single()

    if (progressError || !progress) {
      console.error('Failed to upsert curation progress:', progressError)
      return NextResponse.json(
        { error: 'Failed to initialize curation progress' },
        { status: 500 }
      )
    }

    // Save psychology assessment
    const { data, error } = await supabase
      .from('psychology_assessments')
      .insert({
        tutor_id: tutor.id,
        curation_progress_id: progress.id,
        answers,
        score,
        passed: score >= 70,
        submitted_at: new Date().toISOString(),
        time_spent_seconds: timeTaken
      })
      .select()
      .single()

    if (error) throw error

    const existingSteps: string[] = progress.completed_steps || []
    const newSteps = existingSteps.includes('psychology')
      ? existingSteps
      : [...existingSteps, 'psychology']

    // Update curation progress
    await supabase
      .from('curation_progress')
      .update({
        current_step: 'academic',
        completed_steps: newSteps,
        updated_at: new Date().toISOString()
      })
      .eq('id', progress.id)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error saving psychology assessment:', error)
    return NextResponse.json(
      { error: 'Failed to save assessment' },
      { status: 500 }
    )
  }
}
