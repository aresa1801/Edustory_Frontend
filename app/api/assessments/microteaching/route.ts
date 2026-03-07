'use server'

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const topic = formData.get('topic') as string
    const video = formData.get('video') as File
    const explanation = formData.get('explanation') as string

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
      return NextResponse.json({ error: 'Curation progress not found' }, { status: 404 })
    }

    // In production, upload to Vercel Blob or similar service
    // For now, store URL placeholder
    const videoUrl = `https://videos.edustory.id/${tutor.id}/${Date.now()}.mp4`

    const { data, error } = await supabase
      .from('microteaching_assessments')
      .insert({
        tutor_id: tutor.id,
        curation_progress_id: progress.id,
        topic_selected: topic,
        video_url: videoUrl,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    await supabase
      .from('curation_progress')
      .update({
        current_step: 'handwriting',
        completed_steps: ['psychology', 'academic', 'microteaching'],
        updated_at: new Date().toISOString()
      })
      .eq('id', progress.id)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error saving microteaching assessment:', error)
    return NextResponse.json(
      { error: 'Failed to save assessment' },
      { status: 500 }
    )
  }
}
