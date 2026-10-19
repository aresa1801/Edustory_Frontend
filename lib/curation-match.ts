import { bandOfLevel, normalizeSubject } from '@/lib/academic-plan'

export type OfferEligibility = {
  ok: boolean
  missingGrade: string | null
  missingSubjects: string[]
}

/**
 * Checks whether a tutor has been academically curated for the grade level and
 * subjects a student is asking for. Curated fields come from curation_results;
 * declared teaching interests are only a fallback for legacy approved tutors.
 */
export function checkOfferEligibility(input: {
  studentGrade: string | null | undefined
  studentSubjects: string[] | null | undefined
  curatedGradeLevels: string[] | null | undefined
  specializationsSd: string[] | null | undefined
  specializationsSmp: string[] | null | undefined
  specializationsSma: string[] | null | undefined
}): OfferEligibility {
  const grade = String(input.studentGrade ?? '').trim()
  const subjects = Array.isArray(input.studentSubjects) ? input.studentSubjects : []
  const levels = new Set((input.curatedGradeLevels ?? []).map((level) => String(level).trim()))

  const missingGrade = grade && levels.has(grade) ? null : grade || null
  const band = bandOfLevel(grade)
  const curatedSubjects =
    band === 'sma'
      ? input.specializationsSma ?? []
      : band === 'smp'
        ? input.specializationsSmp ?? []
        : input.specializationsSd ?? []

  const curated = new Set(curatedSubjects.map(normalizeSubject))
  const missingSubjects = subjects.filter((subject) => !curated.has(normalizeSubject(subject)))

  return {
    ok: !missingGrade && missingSubjects.length === 0,
    missingGrade,
    missingSubjects,
  }
}

export const CURATION_WARNING_MESSAGE =
  'Anda belum melakukan kurasi ke mata pelajaran terkait (mata pelajaran yang diinginkan student), kemungkinan ditolak oleh student akan meningkat. Disarankan melakukan kurasi terlebih dahulu!'
