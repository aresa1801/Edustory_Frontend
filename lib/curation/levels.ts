/**
 * lib/curation/levels.ts
 * ---------------------------------------------------------------------------
 * Single source of truth for academic grade levels, per-level subjects, and
 * the question-source strategy used by the AI curation pipeline.
 *
 * Strategy (per product decision):
 *   - SD (Kelas 1–6) and SMP (Kelas 7–9)  → curated STATIC question bank.
 *     Fixed, reviewed items => every candidate in the same grade gets an equal
 *     (fair) set; keys live ONLY on the server so scores cannot be tampered
 *     client-side.
 *   - SMA (Kelas 10–12)                   → AI-generated items for variety,
 *     but scored by an independent AI grader (rubric + re-check), never by a
 *     self-reported key.
 *
 * This file is shared server-side. Do NOT import it from client components.
 */

export type GradeTier = 'SD' | 'SMP' | 'SMA'

/** Canonical ordered grade levels (also used for verified-level hierarchy). */
export const GRADE_LEVEL_ORDER: string[] = [
  'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
  'SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9',
  'SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12',
]

export const VALID_LEVELS: ReadonlySet<string> = new Set(GRADE_LEVEL_ORDER)

/** Subjects taught/assessed per grade level (Kurikulum Merdeka / K-13 aligned). */
export const LEVEL_SUBJECTS: Record<string, string[]> = {
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

/** True when a grade should be served from the curated static bank. */
export function usesStaticBank(level: string): boolean {
  return level.startsWith('SD') || level.startsWith('SMP')
}

/** Human-readable tier label for a level. */
export function tierOf(level: string): GradeTier {
  if (level.startsWith('SMA')) return 'SMA'
  if (level.startsWith('SMP')) return 'SMP'
  return 'SD'
}

/** A tutor verified for `level` is automatically qualified for all lower
 *  grades in the same broad ordering (already used by interview complete). */
export function resolveVerifiedLevels(targetLevel: string | null): string[] {
  if (!targetLevel) return []
  const idx = GRADE_LEVEL_ORDER.indexOf(targetLevel)
  if (idx === -1) return []
  return GRADE_LEVEL_ORDER.slice(0, idx + 1)
}
