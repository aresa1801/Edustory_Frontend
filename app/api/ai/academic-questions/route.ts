/**
 * POST /api/ai/academic-questions
 *
 * Generates exactly 10 multiple-choice questions for every subject requested.
 * The academic test is per grade level and per subject, so the caller sends the
 * subjects that still need to be passed (see /api/assessments/academic/plan).
 *
 * Request: { level: string; subjects: string[]; perSubject?: 10 }
 * Response: { questions, subjects, perSubject }
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

type DeepSeekQuestionsResponse = { questions: AIAcademicQuestion[] }

const VALID_LEVELS = [
  'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
  'SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9',
  'SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12',
]

async function generateForSubject(level: string, subject: string, count: number) {
  const systemPrompt = `Anda adalah guru berpengalaman yang membuat soal ujian untuk siswa Indonesia.
Buat soal pilihan ganda yang akurat sesuai Kurikulum Merdeka/K-13.
Kembalikan HANYA JSON valid dengan struktur:
{"questions":[{"id":1,"level":"${level}","subject":"${subject}","question":"...","options":[{"value":"a","text":"..."},{"value":"b","text":"..."},{"value":"c","text":"..."},{"value":"d","text":"..."}],"correctAnswer":"a"}]}`

  const userPrompt = `Buat TEPAT ${count} soal pilihan ganda untuk mata pelajaran "${subject}" jenjang "${level}".
Ketentuan:
- Semua soal HARUS mata pelajaran ${subject}; jangan mencampur mata pelajaran lain.
- Tepat ${count} soal, tidak kurang dan tidak lebih.
- Setiap soal memiliki tepat 4 pilihan (a, b, c, d) dan satu jawaban benar.
- Isi field "level" dengan "${level}" dan "subject" dengan "${subject}".
- Variasikan jawaban benar, jangan selalu a.
- Bahasa Indonesia, sesuai tingkat kemampuan ${level}.`

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await deepseekJSON<DeepSeekQuestionsResponse>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: attempt === 0 ? 0.6 : 0.3, max_tokens: 4096 },
    )
    const questions = Array.isArray(result?.questions) ? result.questions : []
    if (questions.length === count) {
      return questions.map((q, index) => ({
        id: index + 1,
        level,
        subject,
        question: String(q.question ?? ''),
        options: Array.isArray(q.options) && q.options.length === 4
          ? q.options
          : [{ value: 'a', text: 'A' }, { value: 'b', text: 'B' }, { value: 'c', text: 'C' }, { value: 'd', text: 'D' }],
        correctAnswer: String(q.correctAnswer ?? 'a').toLowerCase(),
      }))
    }
  }

  throw new Error(`AI tidak menghasilkan tepat ${count} soal untuk ${subject}`)
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const level = String(body?.level ?? '')
    const perSubject = 10
    const subjects: string[] = Array.isArray(body?.subjects)
      ? [...new Set<string>(body.subjects.map((value: unknown) => String(value).trim()).filter(Boolean))]
      : []

    if (!VALID_LEVELS.includes(level)) {
      return NextResponse.json({ error: 'Jenjang tidak valid' }, { status: 400 })
    }
    if (!subjects.length) {
      return NextResponse.json({ error: 'Mata pelajaran wajib dikirim' }, { status: 400 })
    }

    const settled = await Promise.allSettled(
      subjects.map((subject) => generateForSubject(level, subject, perSubject)),
    )

    const questions: AIAcademicQuestion[] = []
    const missingSubjects: string[] = []

    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        for (const question of result.value) {
          questions.push({ ...question, id: questions.length + 1 })
        }
      } else {
        missingSubjects.push(subjects[index])
        console.error('[academic-questions]', subjects[index], result.reason)
      }
    })

    if (missingSubjects.length) {
      return NextResponse.json(
        {
          error: `Bank soal untuk ${missingSubjects.join(', ')} belum tersedia. Coba lagi atau hubungi admin.`,
          missingSubjects,
          questions,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ questions, subjects, perSubject })
  } catch (error) {
    console.error('Error generating academic questions:', error)
    return NextResponse.json({ error: 'Gagal menyiapkan soal akademik' }, { status: 500 })
  }
}
