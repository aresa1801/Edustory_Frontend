/**
 * POST /api/ai/psychology-questions
 *
 * Generates psychology assessment questions for tutor candidates using DeepSeek AI.
 * Returns an array of multiple-choice questions with 4 options each.
 * Falls back to an empty array on AI error so the UI can use static questions.
 *
 * Request body: { count?: number }  (default 15)
 * Response:     { questions: AIPsychologyQuestion[] }
 */

import { createServerClient } from '@/lib/supabase/server'
import { deepseekJSON } from '@/lib/deepseek'
import { NextRequest, NextResponse } from 'next/server'

export interface AIPsychologyQuestion {
  id: number
  question: string
  options: { value: string; text: string }[]
  correctAnswer: string
  category: string
}

interface DeepSeekQuestionsResponse {
  questions: AIPsychologyQuestion[]
}

const PSYCHOLOGY_CATEGORIES = [
  'Teaching Approach',
  'Student Management',
  'Emotional Intelligence',
  'Integrity',
  'Relationship Building',
  'Growth Mindset',
  'Pedagogical Knowledge',
  'Continuous Improvement',
  'Classroom Management',
  'Professional Growth',
  'Motivation',
  'Assessment',
  'Guided Learning',
  'Inclusive Teaching',
  'Values',
]

export async function POST(req: NextRequest) {
  try {
    // Auth check — only authenticated users may call this endpoint
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const count: number = Math.min(Math.max(Number(body.count) || 15, 5), 20)

    const systemPrompt = `Anda adalah ahli psikologi pendidikan yang membantu mengevaluasi calon tutor.
Buat soal penilaian psikologi dengan format pilihan ganda yang mengukur kompetensi mengajar.
Setiap soal harus memiliki 4 pilihan (a, b, c, d) dengan satu jawaban terbaik yang mencerminkan
pendekatan profesional dan empatik seorang tutor yang efektif.
Kembalikan HANYA objek JSON dengan struktur berikut (tanpa teks lain):
{
  "questions": [
    {
      "id": 1,
      "question": "...",
      "options": [
        {"value": "a", "text": "..."},
        {"value": "b", "text": "..."},
        {"value": "c", "text": "..."},
        {"value": "d", "text": "..."}
      ],
      "correctAnswer": "b",
      "category": "Teaching Approach"
    }
  ]
}`

    const userPrompt = `Buat ${count} soal penilaian psikologi untuk calon tutor dalam Bahasa Indonesia.
Gunakan kategori berikut secara merata: ${PSYCHOLOGY_CATEGORIES.slice(0, count).join(', ')}.
Pastikan jawaban yang benar bervariasi (tidak selalu 'b') dan soal-soal mencakup skenario nyata mengajar.
Soal harus relevan untuk konteks tutor privat Indonesia (SD, SMP, SMA).`

    const result = await deepseekJSON<DeepSeekQuestionsResponse>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.8, max_tokens: 4096 }
    )

    // Basic validation
    if (!Array.isArray(result?.questions)) {
      throw new Error('Invalid response structure from AI')
    }

    const questions = result.questions.slice(0, count).map((q, idx) => ({
      id: q.id ?? idx + 1,
      question: q.question ?? '',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer ?? 'b',
      category: q.category ?? PSYCHOLOGY_CATEGORIES[idx % PSYCHOLOGY_CATEGORIES.length],
    }))

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error generating psychology questions:', error)
    // Return empty array — UI will fall back to static questions
    return NextResponse.json({ questions: [], fallback: true })
  }
}
