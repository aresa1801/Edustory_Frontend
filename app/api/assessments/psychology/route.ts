'use server'

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

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

    // Get or create curation progress
    let { data: progress } = await supabase
      .from('curation_progress')
      .select('id')
      .eq('tutor_id', tutor.id)
      .single()

    if (!progress) {
      const { data: newProgress } = await supabase
        .from('curation_progress')
        .insert({
          tutor_id: tutor.id,
          current_step: 'psychology'
        })
        .select()
        .single()
      progress = newProgress
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

    // Update curation progress
    await supabase
      .from('curation_progress')
      .update({
        current_step: 'academic',
        completed_steps: ['psychology'],
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
