/**
 * POST /api/ai/psychology-questions
 * ---------------------------------------------------------------------------
 * Generates SITUATIONAL psychology items for tutor candidates.
 *
 * Redesigned to remove the flawed "one correct key turns all into social-
 * desirability guessing". Each item is a realistic teaching scenario with four
 * plausible courses of action. NO `correctAnswer` is emitted — the client cannot
 * self-score. On submit, an independent AI grader evaluates the candidate's
 * chosen responses against per-category rubrics (teaching approach, classroom
 * management, empathy, integrity, etc.) in a fair + transparent manner.
 *
 * Request body: { count?: number }  (default 15)
 * Response:     { questions: PsychologyQuestion[] }
 */

import { createServerClient } from '@/lib/supabase/server'
import { deepseekChat } from '@/lib/deepseek'
import { NextRequest, NextResponse } from 'next/server'

export interface PsychologyQuestion {
  id: number
  question: string
  options: { value: string; text: string }[]
  /** Coaching/attribute the item probes (normalised to rubric dimensions). */
  category: string
  // deliberately no correctAnswer
}

interface AiItem {
  question?: string
  options?: { value?: string; text?: string }[]
  category?: string
}

export const PSYCHOLOGY_CATEGORIES = [
  'Teaching Approach',
  'Student Management',
  'Emotional Intelligence',
  'Integrity',
  'Relationship Building',
  'Growth Mindset',
  'Classroom Management',
  'Continuous Improvement',
  'Motivation',
  'Assessment',
  'Guided Learning',
  'Inclusive Teaching',
  'Professional Conduct',
]

function stripJson(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) return text
  return text.slice(start, end + 1)
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const count: number = Math.min(Math.max(Number(body.count) || 15, 5), 20)

    // Generate JSON manually (not deepseekJSON) so partial/illegal JSON can be
    // recovered with best-effort parsing instead of a hard throw.
    const raw = await deepseekChat(
      [
        {
          role: 'system',
          content:
            'Anda adalah psikolog pendidikan yang menyusun asesmen situasional bagi calon tutor privat (SD/SMP/SMA). Buat skenario realistis tanpa jawaban yang jelas "salah"; setiap pilihan harus pilihan yang masuk akal namun dengan kualitas tindakan berbeda. Dalam output TIDAK ada field correctAnswer atau skor. Kembalikan HANYA objek JSON {\"items\":[...]} tanpa teks lain.',
        },
        {
          role: 'user',
          content: `Buat ${count} skenario situasional untuk calon tutor dalam Bahasa Indonesia. Jenjang SD/SMP/SMA. Untuk tiap item: { "question": "...", "options": [{"value":"a","text":"..."},{"value":"b","text":"..."},{"value":"c","text":"..."},{"value":"d","text":"..."}], "category": "<salah satu dari: ${PSYCHOLOGY_CATEGORIES.join(' | ')}>" }. Tidak boleh menyertakan correctAnswer. Distribusikan merata antar kategori.`,
        },
      ],
      { temperature: 0.9, max_tokens: 4096 }
    )

    let parsed: { items?: AiItem[] } = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = JSON.parse(stripJson(raw)) // best-effort recovery
    }

    const items = Array.isArray(parsed?.items) ? parsed.items : []
    if (!items.length) {
      return NextResponse.json({ questions: [], source: 'none' })
    }

    let auto = 0
    const questions: PsychologyQuestion[] = items.slice(0, count).map((it) => {
      const opts = (Array.isArray(it.options) ? it.options : [])
        .filter((o) => o && typeof o.value === 'string' && typeof o.text === 'string')
        .slice(0, 4)
      return {
        id: ++auto,
        question: String(it.question ?? '').trim(),
        options: opts.length >= 2 ? opts.map((o) => ({ value: o.value!, text: o.text! })) : [],
        category: String(it.category ?? 'Teaching Approach').trim(),
      }
    }).filter((q) => q.question && q.options.length >= 2)

    return NextResponse.json({ questions, source: 'ai' })
  } catch (e) {
    console.error('Error generating psychology questions:', e)
    return NextResponse.json({ questions: [], source: 'error' })
  }
}
