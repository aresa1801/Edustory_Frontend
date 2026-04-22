/**
 * POST /api/ai/score-interview
 *
 * Uses DeepSeek AI to evaluate tutor candidate interview responses and return
 * a structured score (0–100) with per-question feedback.
 *
 * Request body:
 * {
 *   responses: Record<number, string>   // questionId → candidate answer
 *   questions: { id: number; category: string; question: string }[]
 * }
 *
 * Response:
 * {
 *   overallScore: number
 *   questionScores: { id: number; score: number; feedback: string }[]
 *   strengths: string[]
 *   improvements: string[]
 * }
 */

import { createServerClient } from '@/lib/supabase/server'
import { deepseekJSON } from '@/lib/deepseek'
import { NextRequest, NextResponse } from 'next/server'

interface QuestionMeta {
  id: number
  category: string
  question: string
}

interface QuestionScore {
  id: number
  score: number
  feedback: string
}

interface AIInterviewScore {
  overallScore: number
  questionScores: QuestionScore[]
  strengths: string[]
  improvements: string[]
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const responses: Record<number, string> = body.responses ?? {}
    const questions: QuestionMeta[] = body.questions ?? []

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions provided' }, { status: 400 })
    }

    // Build a structured prompt with all Q&A pairs
    const qaPairs = questions
      .map((q) => {
        const answer = responses[q.id] ?? '(tidak dijawab)'
        return `[Pertanyaan ${q.id} — ${q.category}]\nPertanyaan: ${q.question}\nJawaban Kandidat: ${answer}`
      })
      .join('\n\n')

    const systemPrompt = `Anda adalah evaluator berpengalaman untuk penilaian calon tutor pendidikan Indonesia.
Tugas Anda adalah menilai jawaban wawancara kandidat secara objektif dan konstruktif.
Kriteria penilaian per pertanyaan (0–100):
- Relevansi & pemahaman pertanyaan (30%)
- Kedalaman & kualitas jawaban (40%)
- Empati, profesionalisme, dan nilai pedagogis (30%)

Kembalikan HANYA objek JSON dengan struktur berikut (tanpa teks lain):
{
  "overallScore": 85,
  "questionScores": [
    {"id": 1, "score": 80, "feedback": "Jawaban menunjukkan..."}
  ],
  "strengths": ["Poin kekuatan 1", "Poin kekuatan 2"],
  "improvements": ["Area perbaikan 1", "Area perbaikan 2"]
}`

    const userPrompt = `Evaluasi jawaban wawancara calon tutor berikut dan berikan skor serta umpan balik dalam Bahasa Indonesia:

${qaPairs}

Berikan:
1. Skor per pertanyaan (0–100) dengan umpan balik singkat (1–2 kalimat)
2. Skor keseluruhan (rata-rata tertimbang, 0–100)
3. 2–3 poin kekuatan utama kandidat
4. 2–3 area yang perlu ditingkatkan`

    const result = await deepseekJSON<AIInterviewScore>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.3, max_tokens: 3000 }
    )

    // Validate and sanitize response
    const overallScore = Math.min(100, Math.max(0, Math.round(result.overallScore ?? 0)))
    const questionScores: QuestionScore[] = (result.questionScores ?? []).map((qs) => ({
      id: qs.id,
      score: Math.min(100, Math.max(0, Math.round(qs.score ?? 0))),
      feedback: qs.feedback ?? '',
    }))
    const strengths: string[] = Array.isArray(result.strengths) ? result.strengths : []
    const improvements: string[] = Array.isArray(result.improvements) ? result.improvements : []

    return NextResponse.json({ overallScore, questionScores, strengths, improvements })
  } catch (error) {
    console.error('Error scoring interview with AI:', error)
    return NextResponse.json({ error: 'Failed to score interview' }, { status: 500 })
  }
}
