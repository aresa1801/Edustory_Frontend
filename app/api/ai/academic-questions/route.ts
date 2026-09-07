/**
 * POST /api/ai/academic-questions
 * ---------------------------------------------------------------------------
 * Question provider for the Academic Test. Returns a presentation set WITHOUT
 * answer keys. Questions served this way cannot be self-scored by the client.
 *
 *   SD/SMP (Kelas 1–9)  → curated static bank (server-authoritative). Keys are
 *                         known only to the server and are graded on submit.
 *   SMA   (Kelas 10–12) → AI-generated items for variety. Keys are NOT sent;
 *                         each item is graded by an independent AI grader on
 *                         submit (fair + transparent), using the question text
 *                         + the candidate's own answer as evidence.
 *
 * Request  body: { level: string; count?: number }
 * Response body: {
 *   questions: PresentedQuestion[]   // {id,level,subject,question,options} — NO correctAnswer
 *   source: 'static' | 'ai'
 *   bankVersion?: string             // for static
 *   level: string
 * }
 */

import { createServerClient } from '@/lib/supabase/server'
import { deepseekJSON } from '@/lib/deepseek'
import { NextRequest, NextResponse } from 'next/server'
import {
  VALID_LEVELS,
  LEVEL_SUBJECTS,
  usesStaticBank,
} from '@/lib/curation/levels'
import {
  selectStaticQuestions,
  PresentedQuestion,
} from '@/lib/curation/grading'
import { ACADEMIC_BANK_VERSION } from '@/lib/curation/academic-bank'

export interface AIAcademicQuestion extends PresentedQuestion {
  // deliberately no correctAnswer field
}

interface AiItem {
  subject?: string
  question?: string
  options?: { value?: string; text?: string }[]
}

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

    if (!VALID_LEVELS.has(level)) {
      return NextResponse.json({ error: 'Invalid level' }, { status: 400 })
    }

    // -- SD / SMP: curated static bank --------------------------------
    if (usesStaticBank(level)) {
      const { questions } = selectStaticQuestions(level, count)
      return NextResponse.json({
        questions,
        source: 'static',
        bankVersion: ACADEMIC_BANK_VERSION,
        level,
      })
    }

    // -- SMA: AI generated --------------------------------------------
    const subjects = LEVEL_SUBJECTS[level]
    const countPer = Math.max(1, Math.round(count / subjects.length))
    const questions: AIAcademicQuestion[] = []

    // Sequential id offset that never collides with static ids (<= 1206) and
    // is globally unique enough within a session for AI items.
    let idBase = 2000000

    for (const subject of subjects) {
      const system = `Anda adalah guru berpengalaman yang membuat soal ujian untuk siswa Indonesia jenjang ${level}, mata pelajaran ${subject}.
Buat soal pilihan ganda yang akurat sesuai kurikulum Kemendikbud (Kurikulum Merdeka / K-13) dan tingkat kemampuan siswa ${level}.
JANGAN sertakan kunci jawaban pada output (field correctAnswer tidak boleh ada).
Kembalikan HANYA objek JSON valid:
{ "items": [ { "subject": "${subject}", "question": "...", "options": [ {"value":"a","text":"..."}, {"value":"b","text":"..."}, {"value":"c","text":"..."}, {"value":"d","text":"..."} ] } ] }`

      const user = `Buat ${countPer} soal pilihan ganda ${subject} untuk jenjang "${level}" dalam Bahasa Indonesia.
- Sesuai standar kompetensi Kemendikbud untuk ${level}
- Setiap soal tepat 4 pilihan (a,b,c,d)
- Variasikan posisi jawaban yang benar (jangan selalu "a")`

      try {
        const parsed = await deepseekJSON<{ items?: AiItem[] }>(
          [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          { temperature: 0.7, max_tokens: 1200 }
        )
        const items = Array.isArray(parsed?.items) ? parsed.items : []
        for (const it of items) {
          if (!it?.question) continue
          const opts = (Array.isArray(it.options) ? it.options : [])
            .filter((o) => o && typeof o.value === 'string' && typeof o.text === 'string')
            .slice(0, 4)
          if (opts.length < 2) continue
          questions.push({
            id: idBase++,
            level,
            subject: (it.subject ?? subject).trim(),
            question: it.question.trim(),
            options: opts.map((o) => ({ value: o.value!, text: o.text! })),
          })
        }
      } catch (e) {
        // skip failing subject; continue others
        console.error(`[academic-questions] AI gen failed for ${subject}:`, e)
      }
    }

    if (questions.length === 0) {
      return NextResponse.json({ questions: [], source: 'ai', level }, { status: 200 })
    }

    return NextResponse.json({
      questions: questions.slice(0, count),
      source: 'ai',
      level,
    })
  } catch (error) {
    console.error('Error generating academic questions:', error)
    return NextResponse.json({ questions: [], source: 'none', level: '' })
  }
}
