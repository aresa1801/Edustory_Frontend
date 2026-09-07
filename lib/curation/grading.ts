/**
 * lib/curation/grading.ts
 * ---------------------------------------------------------------------------
 * Server-authoritative grading helpers for the curated (static) academic bank.
 *
 * The client only knows option text/value; it never receives `correctAnswer`.
 * Scores are computed HERE from the candidate's raw answers, so they cannot be
 * forged by editing the request payload. We also produce a per-subject
 * breakdown that is persisted for transparency and later audit.
 */

import {
  AcademicQuestion,
  ACADEMIC_QUESTION_BANK,
} from './academic-bank'

export interface GradedAnswerResult {
  questionId: number
  subject: string
  selected: string
  correct: boolean
  correctAnswer: string
}

export interface AcademicGrade {
  /** Overall 0–100. */
  score: number
  correct: number
  total: number
  perSubject: { subject: string; correct: number; total: number; score: number }[]
  results: GradedAnswerResult[]
  questionableIds: number[]
}

export interface PresentedQuestion {
  id: number
  level: string
  subject: string
  question: string
  options: { value: string; text: string }[]
}

/**
 * Return `count` questions for a level WITHOUT exposing the correct answer.
 * Randomised (shuffle) so consecutive attempts differ but stay fair.
 */
export function selectStaticQuestions(
  level: string,
  count = 10
): { questions: PresentedQuestion[]; full: AcademicQuestion[] } {
  const pool = ACADEMIC_QUESTION_BANK.filter((q) => q.level === level)
  // Deterministic shuffle keyed by pool so each level is stable per request.
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const chosen = shuffled.slice(0, Math.max(1, Math.min(count, shuffled.length)))

  return {
    questions: chosen.map(stripAnswer),
    full: chosen,
  }
}

/** Look up the full item (with answer) for a presented question id. */
export function getFullQuestion(questionId: number): AcademicQuestion | undefined {
  return ACADEMIC_QUESTION_BANK.find((q) => q.id === questionId)
}

/**
 * Server-side grading of static-bank answers.
 *
 * @param level        grade level the candidate is taking
 * @param answers      raw answers keyed by question id → selected option value
 * @param presentedIds optional list of question ids that were shown (safety:
 *                     only these are counted). Helps reject answers to items
 *                     the server never presented.
 */
export function gradeStatic(
  level: string,
  answers: Record<number, string>,
  presentedIds?: number[]
): AcademicGrade {
  const allowed = presentedIds && presentedIds.length > 0
    ? new Set(presentedIds)
    : new Set(
        ACADEMIC_QUESTION_BANK.filter((q) => q.level === level).map((q) => q.id)
      )

  const results: GradedAnswerResult[] = []
  const questionableIds: number[] = []

  for (const id of allowed) {
    const full = getFullQuestion(Number(id))
    if (!full) continue // id not in bank at all → ignore (not presented)
    const selected = answers[Number(id)]
    if (selected === undefined) continue // unanswered → not counted against
    const correct = selected === full.correctAnswer
    results.push({
      questionId: full.id,
      subject: full.subject,
      selected,
      correct,
      correctAnswer: full.correctAnswer,
    })
    if (!correct && Object.keys(full.options ?? {}).length === 0) {
      questionableIds.push(full.id)
    }
  }

  const bySubject = new Map<string, { correct: number; total: number }>()
  for (const r of results) {
    const e = bySubject.get(r.subject) ?? { correct: 0, total: 0 }
    e.total += 1
    if (r.correct) e.correct += 1
    bySubject.set(r.subject, e)
  }

  const perSubject = Array.from(bySubject.entries()).map(([subject, v]) => ({
    subject,
    correct: v.correct,
    total: v.total,
    score: v.total === 0 ? 0 : Math.round((v.correct / v.total) * 100),
  }))

  const correct = results.filter((r) => r.correct).length
  const total = results.length

  return {
    score: total === 0 ? 0 : Math.round((correct / total) * 100),
    correct,
    total,
    perSubject,
    results,
    questionableIds,
  }
}

/* Strip the answer key & explanation from a bank item before sending client. */
function stripAnswer(q: AcademicQuestion): PresentedQuestion {
  return {
    id: q.id,
    level: q.level,
    subject: q.subject,
    question: q.question,
    options: q.options,
  }
}
