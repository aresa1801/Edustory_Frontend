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

    const formData = await req.formData()
    const problem1Explanation = formData.get('problem1_explanation') as string
    const problem2Explanation = formData.get('problem2_explanation') as string
    const problem1Image = formData.get('problem1_image') as File | null
    const problem2Image = formData.get('problem2_image') as File | null

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
      return NextResponse.json({ error: 'Curation progress not found' }, { status: 404 })
    }

    // In production, upload images to Vercel Blob or similar service
    const problem1ImageUrl = problem1Image
      ? `https://assets.edustory.id/${tutor.id}/hw1-${Date.now()}.jpg`
      : null
    const problem2ImageUrl = problem2Image
      ? `https://assets.edustory.id/${tutor.id}/hw2-${Date.now()}.jpg`
      : null

    const { data, error } = await supabase
      .from('handwriting_assessments')
      .insert({
        tutor_id: tutor.id,
        curation_progress_id: progress.id,
        problem_1_image_url: problem1ImageUrl,
        problem_1_explanation: problem1Explanation,
        problem_2_image_url: problem2ImageUrl,
        problem_2_explanation: problem2Explanation,
        submitted_at: new Date().toISOString(),
        // Overall score pending admin review; default to 75 as submitted placeholder
        overall_score: null,
        passed: false,
      })
      .select()
      .single()

    if (error) throw error

    const existingSteps: string[] = progress.completed_steps || []
    const newSteps = existingSteps.includes('handwriting')
      ? existingSteps
      : [...existingSteps, 'handwriting']

    await supabase
      .from('curation_progress')
      .update({
        current_step: 'interview',
        completed_steps: newSteps,
        updated_at: new Date().toISOString()
      })
      .eq('id', progress.id)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error saving handwriting assessment:', error)
    return NextResponse.json(
      { error: 'Failed to save assessment' },
      { status: 500 }
    )
  }
}
