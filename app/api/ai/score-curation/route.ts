/**
 * POST /api/ai/score-curation
 *
 * Computes the comprehensive weighted score for a tutor candidate across all 5
 * curation stages and uses DeepSeek AI to provide a holistic narrative evaluation.
 *
 * Stage weights (must sum to 100):
 *   1. Psychology   — 20%
 *   2. Academic     — 30%
 *   3. Microteaching — 25%
 *   4. Handwriting  — 15%
 *   5. AI Interview — 10%
 *
 * Request body:
 * {
 *   psychologyScore?:   number   // 0–100
 *   academicScore?:     number   // 0–100
 *   microteachingScore?: number  // 0–100
 *   handwritingScore?:  number   // 0–100
 *   interviewScore?:    number   // 0–100
 *   generateNarrative?: boolean  // default true
 * }
 *
 * Response:
 * {
 *   stageScores: StageScore[]
 *   weightedTotal: number          // 0–100
 *   passed: boolean                // weightedTotal >= 70
 *   recommendation: "approved" | "review" | "rejected"
 *   narrative?: string             // AI narrative (if generateNarrative)
 * }
 */

import { createServerClient } from '@/lib/supabase/server'
import { deepseekChat } from '@/lib/deepseek'
import { NextRequest, NextResponse } from 'next/server'

interface StageScore {
  name: string
  key: string
  score: number | null
  weight: number
  weightedScore: number
  passed: boolean | null
}

const STAGES = [
  { name: 'Tes Psikologi',      key: 'psychology',    weight: 20 },
  { name: 'Kemampuan Akademik', key: 'academic',       weight: 30 },
  { name: 'Micro Teaching',     key: 'microteaching',  weight: 25 },
  { name: 'Tulisan Tangan',     key: 'handwriting',    weight: 15 },
  { name: 'AI Interview',       key: 'interview',      weight: 10 },
]

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const rawScores: Record<string, number | undefined> = {
      psychology:   body.psychologyScore,
      academic:     body.academicScore,
      microteaching: body.microteachingScore,
      handwriting:  body.handwritingScore,
      interview:    body.interviewScore,
    }

    const generateNarrative: boolean = body.generateNarrative !== false

    // Compute per-stage and weighted total
    let totalWeightedScore = 0
    let appliedWeight = 0

    const stageScores: StageScore[] = STAGES.map((stage) => {
      const raw = rawScores[stage.key]
      const score = raw !== undefined && raw !== null ? Math.min(100, Math.max(0, raw)) : null
      const weightedScore = score !== null ? (score * stage.weight) / 100 : 0

      if (score !== null) {
        totalWeightedScore += weightedScore
        appliedWeight += stage.weight
      }

      return {
        name: stage.name,
        key: stage.key,
        score,
        weight: stage.weight,
        weightedScore: Math.round(weightedScore * 10) / 10,
        passed: score !== null ? score >= 70 : null,
      }
    })

    // Normalize weighted score based on completed stages
    const weightedTotal =
      appliedWeight > 0
        ? Math.round((totalWeightedScore / appliedWeight) * 100)
        : 0

    const passed = weightedTotal >= 70
    const recommendation =
      weightedTotal >= 80
        ? 'approved'
        : weightedTotal >= 70
        ? 'review'
        : 'rejected'

    let narrative: string | undefined

    if (generateNarrative && appliedWeight > 0) {
      const stageSummary = stageScores
        .filter((s) => s.score !== null)
        .map((s) => `- ${s.name}: ${s.score}/100 (bobot ${s.weight}%)`)
        .join('\n')

      const prompt = `Anda adalah evaluator senior program kurasi tutor Edustory.
Berikan penilaian naratif singkat (3–4 kalimat) dalam Bahasa Indonesia untuk calon tutor
dengan hasil berikut:

${stageSummary}

Skor tertimbang keseluruhan: ${weightedTotal}/100
Status: ${passed ? 'LULUS' : 'BELUM LULUS'}
Rekomendasi: ${recommendation === 'approved' ? 'Disetujui' : recommendation === 'review' ? 'Perlu Ditinjau' : 'Ditolak'}

Fokus pada kekuatan utama, area perbaikan, dan rekomendasi tindak lanjut.`

      try {
        narrative = await deepseekChat(
          [{ role: 'user', content: prompt }],
          { temperature: 0.5, max_tokens: 400 }
        )
      } catch (aiError) {
        console.error('AI narrative generation failed:', aiError)
        // narrative remains undefined — not critical
      }
    }

    return NextResponse.json({
      stageScores,
      weightedTotal,
      passed,
      recommendation,
      ...(narrative !== undefined ? { narrative } : {}),
    })
  } catch (error) {
    console.error('Error computing curation score:', error)
    return NextResponse.json({ error: 'Failed to compute curation score' }, { status: 500 })
  }
}
