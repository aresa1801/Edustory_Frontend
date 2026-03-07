import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { answers, score, timeTaken } = await req.json()

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
      .select('id')
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
        time_spent_seconds: timeTaken
      })
      .select()
      .single()

    if (error) throw error

    await supabase
      .from('curation_progress')
      .update({
        current_step: 'microteaching',
        completed_steps: ['psychology', 'academic'],
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
