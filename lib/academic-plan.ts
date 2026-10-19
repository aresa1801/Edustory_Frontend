/**
 * Academic curation rules.
 *
 * - A tutor's declared teaching interests define the required tests.
 * - One test per grade level (e.g. SMA Kelas 11), containing 10 questions per
 *   subject declared for that level.
 * - Every subject must reach 70 to pass. A level passes only when all of its
 *   subjects pass. Passing subjects are locked so they are not retaken; failed
 *   subjects can be retested.
 */

export type Band = 'sd' | 'smp' | 'sma'

export type TutorAcademicProfile = {
  verified_grade_levels?: string[] | null
  specializations_sd?: string[] | null
  specializations_smp?: string[] | null
  specializations_sma?: string[] | null
}

export type AcademicAssessmentRow = {
  id?: string
  level_targeted?: string | null
  score?: number | string | null
  subject_results?: Array<{
    subject?: string
    score?: number
    correct?: number
    total?: number
    passed?: boolean
  }> | null
  passed_subjects?: string[] | null
  failed_subjects?: string[] | null
  created_at?: string | null
}

export type AcademicLevelPlan = {
  level: string
  subjects: string[]
  passedSubjects: string[]
  failedSubjects: string[]
  untestedSubjects: string[]
  nextSubjects: string[]
  score: number | null
  attempts: number
  passed: boolean
  lastAttemptAt: string | null
}

export type AcademicPlan = {
  levels: AcademicLevelPlan[]
  academicScore: number | null
  allPassed: boolean
  completedLevels: number
  totalLevels: number
}

export function normalizeSubject(value: unknown): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^A-Z0-9]/g, '')
}

export function bandOfLevel(level: string): Band {
  const value = String(level ?? '').toUpperCase()
  if (value.startsWith('SMP')) return 'smp'
  if (value.startsWith('SMA')) return 'sma'
  return 'sd'
}

export function subjectsForLevel(level: string, tutor: TutorAcademicProfile): string[] {
  const band = bandOfLevel(level)
  const raw =
    band === 'sma'
      ? tutor.specializations_sma
      : band === 'smp'
        ? tutor.specializations_smp
        : tutor.specializations_sd

  const seen = new Set<string>()
  const result: string[] = []
  for (const subject of raw ?? []) {
    const label = String(subject ?? '').trim()
    const key = normalizeSubject(label)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(label)
  }
  return result
}

export function declaredLevels(tutor: TutorAcademicProfile): string[] {
  const levels = Array.isArray(tutor.verified_grade_levels) ? tutor.verified_grade_levels : []
  return [...new Set(levels.map((level) => String(level)).filter(Boolean))]
}

export function buildAcademicPlan(
  tutor: TutorAcademicProfile,
  assessments: AcademicAssessmentRow[],
): AcademicPlan {
  const rows = [...(assessments ?? [])].sort((a, b) =>
    String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')),
  )

  const levels: AcademicLevelPlan[] = declaredLevels(tutor).map((level) => {
    const subjects = subjectsForLevel(level, tutor)
    const best = new Map<string, { score: number; subject: string }>()
    let attempts = 0
    let lastAttemptAt: string | null = null

    for (const row of rows) {
      if (row.level_targeted !== level) continue
      attempts += 1
      if (row.created_at) lastAttemptAt = row.created_at
      for (const result of row.subject_results ?? []) {
        const subject = String(result.subject ?? '').trim()
        const key = normalizeSubject(subject)
        if (!key) continue
        const score = Number(result.score)
        if (!Number.isFinite(score)) continue
        const previous = best.get(key)
        if (!previous || score > previous.score) best.set(key, { score, subject })
      }
    }

    const passedSubjects: string[] = []
    const failedSubjects: string[] = []
    const untestedSubjects: string[] = []
    const scores: number[] = []

    for (const subject of subjects) {
      const found = best.get(normalizeSubject(subject))
      if (!found) {
        untestedSubjects.push(subject)
        continue
      }
      scores.push(found.score)
      if (found.score >= 70) passedSubjects.push(subject)
      else failedSubjects.push(subject)
    }

    const nextSubjects = [...failedSubjects, ...untestedSubjects]
    const score = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null
    const passed = subjects.length > 0 && passedSubjects.length === subjects.length

    return {
      level,
      subjects,
      passedSubjects,
      failedSubjects,
      untestedSubjects,
      nextSubjects,
      score,
      attempts,
      passed,
      lastAttemptAt,
    }
  })

  const activeLevels = levels.filter((level) => level.subjects.length > 0)

  const scoredLevels = activeLevels.filter((level) => level.score !== null)
  const academicScore = scoredLevels.length
    ? Math.round(scoredLevels.reduce((sum, level) => sum + (level.score ?? 0), 0) / scoredLevels.length)
    : null

  return {
    levels: activeLevels,
    academicScore,
    allPassed: activeLevels.length > 0 && activeLevels.every((level) => level.passed),
    completedLevels: activeLevels.filter((level) => level.passed).length,
    totalLevels: activeLevels.length,
  }
}

/** Effective curated fields after academic tests: only passed subjects count. */
export function curatedFieldsFromPlan(plan: AcademicPlan) {
  const verifiedLevels: string[] = []
  const sd: string[] = []
  const smp: string[] = []
  const sma: string[] = []

  for (const level of plan.levels) {
    if (!level.passedSubjects.length) continue
    verifiedLevels.push(level.level)
    const target = bandOfLevel(level.level) === 'sma' ? sma : bandOfLevel(level.level) === 'smp' ? smp : sd
    for (const subject of level.passedSubjects) {
      if (!target.some((item) => normalizeSubject(item) === normalizeSubject(subject))) target.push(subject)
    }
  }

  return {
    verifiedGradeLevels: verifiedLevels,
    specializationsSd: sd,
    specializationsSmp: smp,
    specializationsSma: sma,
    passedLevels: plan.levels.filter((level) => level.passed).map((level) => level.level),
    failedSubjects: Object.fromEntries(
      plan.levels
        .filter((level) => level.failedSubjects.length > 0)
        .map((level) => [level.level, level.failedSubjects]),
    ),
  }
}
