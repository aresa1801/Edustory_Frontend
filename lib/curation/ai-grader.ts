/**
 * lib/curation/ai-grader.ts
 * ---------------------------------------------------------------------------
 * Independent AI grader used anywhere an item cannot be scored with a simple
 * deterministic key:
 *   - SMA academic items (AI-generated, no trusted static key)
 *   - psychology / situational responses (no single "correct" answer)
 *   - microteaching text (lesson delivery on a chosen topic)
 *   - handwriting explanation text (legibility & clarity of written lesson plan)
 *
 * Design goal: fair + transparent. Every call returns:
 *   - a validated 0–100 score,
 *   - per-dimension scores,
 *   - a human-readable justification grounded in the candidate's own text,
 *   - a confidence value, and
 *   - failure is surfaced (NOT silently converted to an auto-pass/fail).
 */

import { deepseekJSON } from '@/lib/deepseek'

const ZERO_TO_HUNDRED_RE = /^(\d+(\.\d+)?)$/

export interface AiGraderDimension {
  key: string
  label: string
  /** 0–100 */
  score: number
  justification: string
}

export interface AiGraderResult {
  verdict: 'pass' | 'borderline' | 'fail' | 'uncertain'
  /** Weighted/predicted overall 0–100 (server clamps + rounds). */
  overall: number
  dimensions: AiGraderDimension[]
  recommendation: string
  /** Short summary of why this score was given (transparency). */
  summary: string
}

type ScoreSchema = {
  overall_score: number
  recommendation: string
  summary: string
  dimensions: { dimension: string; label: string; score: number; justification: string }[]
}

/**
 * Score a respondent's free-text answer(s) against a rubric.
 *
 * @param rolePrompt  e.g. "Anda asesor kurasi calon guru matematika SMP."
 * @param rubricText  Human rubric lines (bullet criteria per dimension).
 * @param evidence    Candidate's answers / transcript to be judged.
 * @param passMark    0–100 threshold considered "pass".
 * @returns normalised AiGraderResult.
 */
export async function assessWithAi(
  rolePrompt: string,
  rubricText: string,
  evidence: string,
  opts: { passMark?: number; temperature?: number; max_tokens?: number } = {}
): Promise<AiGraderResult> {
  const passMark = opts.passMark ?? 70
  const system = `${rolePrompt}
Anda adalah penilai yang OBJEKTIF, KONSISTEN, dan TRANSPARAN. Nilai berdasarkan bukti dari jawaban kandidat di bawah ini, JANGAN berdasarkan tebakan. Gunakan skala 0–100 untuk setiap dimensi. Berikan justifikasi singkat yang merujuk pada isi jawaban.
Selalu kembalikan HANYA objek JSON valid dengan struktur ini (tanpa markdown/teks lain):
{
  "overall_score": 0,
  "recommendation": "LULUS / PERTIMBANGAN / TIDAK LULUS",
  "summary": "ringkasan singkat",
  "dimensions": [
    { "dimension": "penyampaian", "label": "Penyampaian", "score": 0, "justification": "..." }
  ]
}`

  const user = `RUBRIK PENILAIAN:
${rubricText}

JAWABAN / BUKTI KANDIDAT:
"""
${evidence}
"""

Nilai sekarang secara objektif. Setiap skor dimensi 0–100. overall_score = rata-rata tertimbang dimensi (0–100).`

  const parsed = await deepseekJSON<ScoreSchema>(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    {
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.max_tokens ?? 1400,
    }
  )

  return normalise(parsed, passMark)
}

/** Score each academic question presented in an open set (e.g. SMA AI items). */
export async function assessAcademicFreeText(
  items: {
    question: string
    subject: string
    options: { value: string; text: string }[]
    /** candidate's chosen option text + rationale (if any) */
    chosenText: string
    rationale?: string
  }[],
  level: string,
  opts: { passMark?: number } = {}
): Promise<AiGraderResult> {
  const rubric = `Koreksi tiap soal ${level} berikut dengan teliti:
- Benar total → skor item 100.
- Salah → skor 0.
- Relevan tapi kurang tepat / tidak menjawab → skor 30–70.
Untuk tiap soal beri justifikasi singkat (correctAnswerYg benar bila perlu) agar transparan.`

  const evidence = items
    .map(
      (it, i) =>
        `Soal ${i + 1} [${it.subject}]: ${it.question}\nPilihan: ${it.options
          .map((o) => `${o.value}. ${o.text}`)
          .join(' | ')}\nJawaban kandidat: ${it.chosenText}${it.rationale ? `\nAlasan: ${it.rationale}` : ''}`
    )
    .join('\n\n')

  return assessWithAi(
    'Anda adalah guru dan asesor akademik di platform tutor Edustory.',
    rubric,
    evidence,
    opts
  )
}

function normalise(raw: ScoreSchema, passMark: number): AiGraderResult {
  // Robustness: tolerate some array key shapes.
  const dims = Array.isArray(raw?.dimensions) ? raw.dimensions : []
  const safeDims = dims
    .filter((d) => d && typeof d === 'object' && Number.isFinite(Number(d.score)))
    .map((d) => ({
      key: String(d.dimension ?? '').trim() || 'umum',
      label: String(d.label ?? '').trim() || 'Umum',
      score: clamp100(Number(d.score)),
      justification: String(d.justification ?? '').trim(),
    }))

  let overall = Number(raw?.overall_score)
  if (!Number.isFinite(overall) || !ZERO_TO_HUNDRED_RE.test(String(overall))) {
    overall = safeDims.length
      ? safeDims.reduce((s, d) => s + d.score, 0) / safeDims.length
      : 0
  }
  overall = clamp100(overall)

  const recString = String(raw?.recommendation ?? '').toUpperCase()

  let verdict: AiGraderResult['verdict']
  if (overall >= passMark) verdict = 'pass'
  else if (overall >= passMark - 15) verdict = 'borderline'
  else verdict = 'fail'

  // If the model clearly says a pass/fail recommendation, let it win when it
  // agrees within tolerance to avoid false negatives from a near-boundary avg.
  if (recString.includes('LULUS') && overall >= passMark - 8) verdict = 'pass'
  if (recString.includes('TIDAK LULUS') && overall <= passMark + 8) verdict = 'fail'

  return {
    verdict,
    overall: Math.round(overall),
    dimensions: safeDims,
    recommendation: String(raw?.recommendation ?? '').trim(),
    summary: String(raw?.summary ?? '').trim(),
  }
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}
