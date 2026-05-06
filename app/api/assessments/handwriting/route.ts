import { createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10 MB

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function uploadImageToStorage(
  supabase: ReturnType<typeof createAdminClient>,
  file: File,
  tutorId: string,
  slot: string
): Promise<string | null> {
  if (!file || file.size === 0) return null
  // Validate MIME type
  const fileExt = ALLOWED_IMAGE_TYPES[file.type]
  if (!fileExt) return null
  const filePath = `handwriting/${tutorId}/${slot}-${Date.now()}.${fileExt}`
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('curation-uploads')
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })
  if (uploadError) {
    console.error(`Image upload error (${slot}):`, uploadError)
    return null
  }
  const { data: publicUrlData } = supabase.storage
    .from('curation-uploads')
    .getPublicUrl(filePath)
  return publicUrlData.publicUrl
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

    // Validate image types and sizes before upload
    for (const [img, label] of [[problem1Image, 'soal 1'], [problem2Image, 'soal 2']] as const) {
      if (img && img.size > 0) {
        if (!ALLOWED_IMAGE_TYPES[img.type]) {
          return NextResponse.json(
            { error: `Tipe file ${label} tidak didukung. Gunakan JPG, PNG, atau WebP.` },
            { status: 400 }
          )
        }
        if (img.size > MAX_IMAGE_SIZE) {
          return NextResponse.json(
            { error: `Ukuran gambar ${label} terlalu besar. Maksimum 10 MB.` },
            { status: 400 }
          )
        }
      }
    }

    // Upload images to Supabase Storage
    const [problem1ImageUrl, problem2ImageUrl] = await Promise.all([
      problem1Image ? uploadImageToStorage(supabase, problem1Image, tutor.id, 'hw1') : Promise.resolve(null),
      problem2Image ? uploadImageToStorage(supabase, problem2Image, tutor.id, 'hw2') : Promise.resolve(null),
    ])

    if (problem1Image && problem1Image.size > 0 && !problem1ImageUrl) {
      return NextResponse.json({ error: 'Gagal mengunggah gambar soal 1' }, { status: 500 })
    }
    if (problem2Image && problem2Image.size > 0 && !problem2ImageUrl) {
      return NextResponse.json({ error: 'Gagal mengunggah gambar soal 2' }, { status: 500 })
    }

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
        // overall_score is null until admin reviews the submission
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
