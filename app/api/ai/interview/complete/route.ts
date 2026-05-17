/**
 * POST /api/ai/interview/complete
 *
 * Generates the final structured assessment report for a completed conversational
 * interview and persists the result to the database.
 *
 * Adapted from assessment.py in github.com/farhanrhine/ai-tutor-screener.
 * Uses DeepSeek AI and saves to the existing ai_interview_assessments table.
 *
 * Assessment scores are returned on a 1–10 scale per dimension and converted
 * to 0–100 before persisting (overall_score * 10).  Pass threshold: 70/100.
 *
 * Request body:
 * {
 *   messages:          { role: 'assistant'|'user', content: string }[]
 *   candidateName:     string
 *   timeSpentSeconds:  number
 * }
 *
 * Response:
 * {
 *   overallScore: number           // 0–100
 *   passed:       boolean
 *   recommendation: string
 *   summary:      string
 *   dimensions:   Record<string, { score: number, justification: string, quote: string }>
 *   allDone:      boolean
 * }
 */

import { createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { deepseekJSON } from '@/lib/deepseek'
import { NextRequest, NextResponse } from 'next/server'
import { buildAssessmentPrompt } from '@/lib/interview-prompts'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Grade level hierarchy — a tutor verified at a higher grade automatically
// qualifies for all lower grades in the same school tier.
const GRADE_LEVEL_ORDER = [
  'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
  'SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9',
  'SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12',
]

function resolveVerifiedLevels(targetLevel: string | null): string[] {
  if (!targetLevel) return []
  const idx = GRADE_LEVEL_ORDER.indexOf(targetLevel)
  if (idx === -1) return []
  return GRADE_LEVEL_ORDER.slice(0, idx + 1)
}

interface DimensionScore {
  score: number
  justification: string
  quote: string
}

interface AssessmentResult {
  candidate_name: string
  recommendation: string
  summary: string
  dimensions: Record<string, DimensionScore>
  overall_score: number
}

const FALLBACK_DIMENSIONS: Record<string, DimensionScore> = {
  komunikasi_kejelasan:      { score: 5, justification: 'Tidak dapat dianalisis.', quote: '—' },
  empati_kesabaran:          { score: 5, justification: 'Tidak dapat dianalisis.', quote: '—' },
  kemampuan_menyederhanakan: { score: 5, justification: 'Tidak dapat dianalisis.', quote: '—' },
  penguasaan_materi:         { score: 5, justification: 'Tidak dapat dianalisis.', quote: '—' },
  kesesuaian_tutor:          { score: 5, justification: 'Tidak dapat dianalisis.', quote: '—' },
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getAdminClient()

    const {
      messages = [] as { role: string; content: string }[],
      candidateName = 'Kandidat',
      timeSpentSeconds = 0,
    } = await req.json()

    // Build human-readable transcript
    const transcript = messages
      .map((m: { role: string; content: string }) => {
        const label = m.role === 'assistant' ? 'Aira (Pewawancara)' : 'Kandidat'
        return `${label}: ${m.content}`
      })
      .join('\n\n')

    // Generate structured assessment via DeepSeek
    let assessment: AssessmentResult
    try {
      assessment = await deepseekJSON<AssessmentResult>(
        [
          {
            role: 'system',
            content:
              'Anda adalah evaluator ahli program kurasi tutor Edustory. Selalu respons dengan JSON valid saja. Tanpa teks tambahan, tanpa markdown.',
          },
          { role: 'user', content: buildAssessmentPrompt(candidateName, transcript) },
        ],
        { temperature: 0.2, max_tokens: 1800 }
      )
    } catch (aiError) {
      console.error('[Interview Complete] AI assessment failed:', aiError)
      assessment = {
        candidate_name: candidateName,
        recommendation: 'Pertimbangkan dengan Catatan',
        summary:
          'Penilaian tidak dapat dibuat secara otomatis. Harap tinjau transkrip secara manual.',
        dimensions: FALLBACK_DIMENSIONS,
        overall_score: 5.0,
      }
    }

    // Clamp overall_score (1–10) and convert to 0–100
    const rawScore = Math.min(10, Math.max(0, assessment.overall_score ?? 5))
    const overallScore100 = Math.round(rawScore * 10)
    const passed = overallScore100 >= 70

    // Look up tutor and curation progress
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

    // Persist assessment — store the full conversation in `responses`
    const candidateMessages = messages.filter(
      (m: { role: string }) => m.role === 'user'
    )

    await supabase.from('ai_interview_assessments').insert({
      tutor_id:            tutor.id,
      curation_progress_id: progress.id,
      responses: {
        transcript:     messages,
        dimensions:     assessment.dimensions,
        recommendation: assessment.recommendation,
        summary:        assessment.summary,
      },
      questions_answered: candidateMessages.length,
      overall_score:      overallScore100,
      passed,
      submitted_at:       new Date().toISOString(),
      time_spent_seconds: timeSpentSeconds,
    })

    // Mark 'interview' as completed in curation_progress
    const existingSteps: string[] = progress.completed_steps || []
    const newSteps = existingSteps.includes('interview')
      ? existingSteps
      : [...existingSteps, 'interview']

    const allDone = newSteps.length >= 5

    await supabase
      .from('curation_progress')
      .update({
        current_step:    'completed',
        completed_steps: newSteps,
        status:          allDone ? 'completed' : 'in_progress',
        updated_at:      new Date().toISOString(),
      })
      .eq('id', progress.id)

    // If all 5 stages done and interview passes, auto-assign verified grade levels
    if (allDone && passed) {
      const verifiedLevels = resolveVerifiedLevels(tutor.target_grade_level)
      if (verifiedLevels.length > 0) {
        await supabase
          .from('tutors')
          .update({ verified_grade_levels: verifiedLevels })
          .eq('id', tutor.id)
      }
    }

    return NextResponse.json({
      overallScore: overallScore100,
      passed,
      recommendation: assessment.recommendation,
      summary:        assessment.summary,
      dimensions:     assessment.dimensions,
      allDone,
    })
  } catch (error) {
    console.error('Error completing interview:', error)
    return NextResponse.json(
      { error: 'Failed to complete interview' },
      { status: 500 }
    )
  }
}
