/**
 * POST /api/ai/academic-questions
 *
 * Generates academic multiple-choice questions for a specific Indonesian grade level
 * using DeepSeek AI. Falls back to empty array on error so the UI can use static questions.
 *
 * Request body: { level: string; count?: number }
 *   level  — one of "SD Kelas 1" … "SMA Kelas 12"
 *   count  — number of questions (5–20, default 10)
 *
 * Response: { questions: AIAcademicQuestion[] }
 */

import { createServerClient } from '@/lib/supabase/server'
import { deepseekJSON } from '@/lib/deepseek'
import { NextRequest, NextResponse } from 'next/server'

export interface AIAcademicQuestion {
  id: number
  level: string
  subject: string
  question: string
  options: { value: string; text: string }[]
  correctAnswer: string
}

interface DeepSeekQuestionsResponse {
  questions: AIAcademicQuestion[]
}

const LEVEL_SUBJECTS: Record<string, string[]> = {
  'SD Kelas 1': ['Matematika', 'Bahasa Indonesia'],
  'SD Kelas 2': ['Matematika', 'IPA', 'Bahasa Indonesia'],
  'SD Kelas 3': ['Matematika', 'IPA', 'Bahasa Indonesia'],
  'SD Kelas 4': ['Matematika', 'IPA', 'IPS', 'Bahasa Indonesia'],
  'SD Kelas 5': ['Matematika', 'IPA', 'IPS', 'Bahasa Indonesia'],
  'SD Kelas 6': ['Matematika', 'IPA', 'IPS', 'Bahasa Indonesia', 'PKn'],
  'SMP Kelas 7': ['Matematika', 'IPA', 'IPS', 'Bahasa Indonesia', 'Bahasa Inggris'],
  'SMP Kelas 8': ['Matematika', 'IPA (Fisika)', 'IPA (Biologi)', 'Bahasa Indonesia', 'Bahasa Inggris'],
  'SMP Kelas 9': ['Matematika', 'IPA (Kimia)', 'IPA (Fisika)', 'IPS', 'Bahasa Inggris'],
  'SMA Kelas 10': ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Bahasa Indonesia', 'Bahasa Inggris'],
  'SMA Kelas 11': ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Bahasa Inggris'],
  'SMA Kelas 12': ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Bahasa Inggris', 'Sejarah'],
}

const VALID_LEVELS = Object.keys(LEVEL_SUBJECTS)

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const level: string = body.level ?? ''
    const count: number = Math.min(Math.max(Number(body.count) || 10, 5), 20)

    if (!VALID_LEVELS.includes(level)) {
      return NextResponse.json(
        { error: `Invalid level. Must be one of: ${VALID_LEVELS.join(', ')}` },
        { status: 400 }
      )
    }

    const subjects = LEVEL_SUBJECTS[level]

    const systemPrompt = `Anda adalah guru berpengalaman yang membuat soal ujian untuk siswa Indonesia.
Buat soal pilihan ganda yang akurat, sesuai kurikulum Kemendikbud (Kurikulum Merdeka / K-13),
dan sesuai tingkat kemampuan siswa untuk jenjang yang diminta.
Kembalikan HANYA objek JSON dengan struktur berikut (tanpa teks lain):
{
  "questions": [
    {
      "id": 1,
      "level": "SD Kelas 3",
      "subject": "Matematika",
      "question": "...",
      "options": [
        {"value": "a", "text": "..."},
        {"value": "b", "text": "..."},
        {"value": "c", "text": "..."},
        {"value": "d", "text": "..."}
      ],
      "correctAnswer": "c"
    }
  ]
}`

    const userPrompt = `Buat ${count} soal pilihan ganda untuk jenjang "${level}" dalam Bahasa Indonesia.
Distribusikan soal merata di antara mata pelajaran berikut: ${subjects.join(', ')}.
Pastikan:
- Soal sesuai dengan standar kompetensi Kemendikbud untuk ${level}
- Jawaban yang benar bervariasi (tidak selalu jawaban yang sama)
- Tingkat kesulitan sesuai dengan kemampuan siswa ${level}
- Setiap soal memiliki tepat 4 pilihan (a, b, c, d)
- Field "level" diisi "${level}" untuk setiap soal`

    const result = await deepseekJSON<DeepSeekQuestionsResponse>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.7, max_tokens: 4096 }
    )

    if (!Array.isArray(result?.questions)) {
      throw new Error('Invalid response structure from AI')
    }

    const questions = result.questions.slice(0, count).map((q, idx) => ({
      id: q.id ?? idx + 1,
      level: q.level ?? level,
      subject: q.subject ?? subjects[idx % subjects.length],
      question: q.question ?? '',
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer ?? 'a',
    }))

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error generating academic questions:', error)
    return NextResponse.json({ questions: [], fallback: true })
  }
}
