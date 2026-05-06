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
    const topic = formData.get('topic') as string
    const video = formData.get('video') as File | null
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
      .select('id, completed_steps')
      .eq('tutor_id', tutor.id)
      .single()

    if (!progress) {
      return NextResponse.json({ error: 'Curation progress not found' }, { status: 404 })
    }

    // Upload video to Supabase Storage
    let videoUrl: string | null = null
    if (video && video.size > 0) {
      const fileExt = video.name.split('.').pop() || 'mp4'
      const filePath = `microteaching/${tutor.id}/${Date.now()}.${fileExt}`
      const arrayBuffer = await video.arrayBuffer()
      const { error: uploadError } = await supabase.storage
        .from('curation-uploads')
        .upload(filePath, arrayBuffer, {
          contentType: video.type || 'video/mp4',
          upsert: false,
        })
      if (uploadError) {
        console.error('Video upload error:', uploadError)
        return NextResponse.json({ error: 'Gagal mengunggah video' }, { status: 500 })
      }
      const { data: publicUrlData } = supabase.storage
        .from('curation-uploads')
        .getPublicUrl(filePath)
      videoUrl = publicUrlData.publicUrl
    }

    const { data, error } = await supabase
      .from('microteaching_assessments')
      .insert({
        tutor_id: tutor.id,
        curation_progress_id: progress.id,
        topic_selected: topic,
        video_url: videoUrl,
        explanation,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    const existingSteps: string[] = progress.completed_steps || []
    const newSteps = existingSteps.includes('microteaching')
      ? existingSteps
      : [...existingSteps, 'microteaching']

    await supabase
      .from('curation_progress')
      .update({
        current_step: 'handwriting',
        completed_steps: newSteps,
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
