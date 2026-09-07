/**
 * POST /api/assessments/microteaching
 * ---------------------------------------------------------------------------
 * Server-authoritative, AI-graded Micro Teaching (TEXT-based).
 *
 * Per product decision: candidates do NOT need to upload a video that requires
 * speech transcription. Instead they demonstrate teaching by writing a short,
 * structured lesson (objective → opening → core explanation → closing / check
 * for understanding) on a chosen topic. An independent AI grader evaluates the
 * lesson on pedagogy dimensions (clarity, structure, engagement, correctness)
 * and returns a fair, transparent, auditable 0–100 score.
 *
 * Request:  application/json
 *   { topic: string, lessonText: string, optionalVideoUrl?: string }
 * Response: { success, score, passed, dimensions, aiSummary }
 */

import { createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { deepseekJSON } from '@/lib/deepseek'
import { NextRequest, NextResponse } from 'next/server'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const MICROTEACHING_MIN_CHARS = 300

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

interface AiDims {
  clarity: number
  structure: number
  engagement: number
  correctness: number
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = getAdminClient()

    // Accept both JSON (preferred) form.
    let topic = ''
    let lessonText = ''
    let videoUrl: string | null = null
    const ctype = (req.headers.get('content-type') ?? '').toLowerCase()
    if (ctype.includes('application/json')) {
      const body = await req.json().catch(() => ({}))
      topic = String(body.topic ?? '').trim()
      lessonText = String(body.lessonText ?? '').trim()
      videoUrl = body.optionalVideoUrl || null
    } else {
      const fd = await req.formData()
      topic = String(fd.get('topic') ?? '').trim()
      lessonText = String(fd.get('lessonText') ?? fd.get('explanation') ?? '').trim()
      videoUrl = String(fd.get('optionalVideoUrl') ?? '') || null
    }

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 })
    }
    if (lessonText.length < 100) {
      return NextResponse.json(
        { error: 'Tulis penjelasan mengajar Anda minimal 100 karakter.' },
        { status: 400 }
      )
    }

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

    // ------------------------------------------------------------------
    // AI GRADING (server-authoritative)
    // ------------------------------------------------------------------
    const system = `Anda adalah asesor kurasi guru Edustory yang menilai RENCANA PENJELASAN TERTULIS seorang calon tutor untuk topik: ${topic}.
Nilai pedagogi penjelasan tersebut secara OBJEKTIF. Jangan menebak. Skala tiap dimensi 0–100.
Kembalikan HANYA JSON valid:
{
  "dimensions": {
    "clarity": 0, "structure": 0, "engagement": 0, "correctness": 0
  },
  "overall_score": 0,
  "recommendation": "LULUS | PERTIMBANGAN | TIDAK LULUS",
  "summary": "ringkasan kekuatan & saran perbaikan singkat",
  "accuracy_issues": ["opsional: poin konsep yang kurang tepat"]
}`

    const rubric = `Rubrik (0–100 tiap dimensi):
- clarity: kejelasan bahasa, bebas ambigu, mudah dipahami siswa sesuai jenjang.
- structure: ada pembukaan/pembelajaran bertahap dan penutup/cek pemahaman yang logis.
- engagement: strategi melibatkan siswa, contoh/analogi/media yang relevan.
- correctness: konten materi akurat (periksa fakta/rumus).
Passing: overall >= 70.`

    let score = 0
    let dims: AiDims = { clarity: 0, structure: 0, engagement: 0, correctness: 0 }
    let summary = ''
    let recommendation = ''
    let accuracyIssues: string[] = []
    let aiError: string | null = null

    try {
      const raw = await deepseekJSON<{
        dimensions?: Partial<AiDims>
        overall_score?: number
        recommendation?: string
        summary?: string
        accuracy_issues?: string[]
      }>(
        [
          { role: 'system', content: system },
          { role: 'user', content: `${rubric}\n\nPENJELASAN CALON TUTOR:\n"""\n${lessonText}\n"""` },
        ],
        { temperature: 0.2, max_tokens: 1200 }
      )

      const clamp = (n: unknown) => {
        const v = Number(n)
        return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0
      }
      dims = {
        clarity: clamp(raw?.dimensions?.clarity),
        structure: clamp(raw?.dimensions?.structure),
        engagement: clamp(raw?.dimensions?.engagement),
        correctness: clamp(raw?.dimensions?.correctness),
      }
      const overallFromDims = Math.round(
        (dims.clarity + dims.structure + dims.engagement + dims.correctness) / 4
      )
      score = clamp(raw?.overall_score) || overallFromDims
      summary = String(raw?.summary ?? '').trim()
      recommendation = String(raw?.recommendation ?? '').trim()
      accuracyIssues = Array.isArray(raw?.accuracy_issues)
        ? raw.accuracy_issues.map((i) => String(i)).filter(Boolean)
        : []
    } catch (e) {
      aiError = e instanceof Error ? e.message : 'AI grading failed'
      console.error('[microteaching] AI grading error:', e)
      // Surface, do not silently auto-fail.
      return NextResponse.json(
        { error: 'Gagal menilai penjelasan. Silakan coba lagi.' },
        { status: 502 }
      )
    }

    const passed = score >= 70

    const aiAnalysis = {
      dimensions: dims,
      overall: score,
      summary,
      recommendation,
      accuracy_issues: accuracyIssues,
      grading_error: aiError,
      graded_by: 'deepseek-ai',
    }

    // ------------------------------------------------------------------
    // PERSIST — reuses existing columns; breakdown lives in ai_analysis.
    // ------------------------------------------------------------------
    const { data, error } = await supabase
      .from('microteaching_assessments')
      .insert({
        tutor_id: tutor.id,
        curation_progress_id: progress.id,
        topic_selected: topic,
        // Text-based lesson is stored in the existing `transcription` column
        // (no speech input here) so no migration is required.
        transcription: lessonText,
        video_url: videoUrl,
        // Legacy sub-score columns are DECIMAL(3,2) → 0–10 scale (÷10).
        clarity_score: round1(dims.clarity / 10),
        engagement_score: round1(dims.engagement / 10),
        structure_score: round1(dims.structure / 10),
        overall_score: score,
        passed,
        ai_analysis: aiAnalysis,
        submitted_at: new Date().toISOString(),
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', progress.id)

    return NextResponse.json({
      success: true,
      score,
      passed,
      dimensions: dims,
      aiSummary: summary,
      data,
    })
  } catch (error) {
    console.error('Error saving microteaching assessment:', error)
    return NextResponse.json({ error: 'Failed to save assessment' }, { status: 500 })
  }
}
