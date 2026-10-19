import { createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import {
  buildAcademicPlan,
  curatedFieldsFromPlan,
  normalizeSubject,
  subjectsForLevel,
} from '@/lib/academic-plan'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

type IncomingQuestion = {
  id: number
  level: string
  subject: string
  question: string
  options: { value: string; text: string }[]
  correctAnswer: string
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const level = String(body?.level ?? '').trim()
    const answers = body?.answers ?? {}
    const questions: IncomingQuestion[] = Array.isArray(body?.questions) ? body.questions : []
    const timeTaken = Number(body?.timeTaken) || 0

    if (!level || !questions.length) {
      return NextResponse.json({ error: 'Level dan soal wajib dikirim' }, { status: 400 })
    }

    const supabase = admin()
    const { data: tutor } = await supabase
      .from('tutors')
      .select('id, verified_grade_levels, specializations_sd, specializations_smp, specializations_sma')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    if (!(tutor.verified_grade_levels || []).includes(level)) {
      return NextResponse.json({ error: 'Kelas ini tidak termasuk minat mengajar Anda' }, { status: 400 })
    }

    let { data: progress } = await supabase
      .from('curation_progress')
      .select('id, completed_steps, current_step')
      .eq('tutor_id', tutor.id)
      .maybeSingle()

    if (!progress) {
      const { data: created } = await supabase
        .from('curation_progress')
        .insert({ tutor_id: tutor.id, current_step: 'psychology', completed_steps: [] })
        .select('id, completed_steps, current_step')
        .single()
      progress = created
    }
    if (!progress) return NextResponse.json({ error: 'Curation progress not found' }, { status: 500 })

    const { data: previousAssessments } = await supabase
      .from('academic_assessments')
      .select('id, level_targeted, score, subject_results, passed_subjects, failed_subjects, created_at')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: true })

    const planBefore = buildAcademicPlan(tutor, previousAssessments ?? [])
    const levelBefore = planBefore.levels.find((item) => item.level === level)
    if (!levelBefore) return NextResponse.json({ error: 'Kelas tidak ditemukan pada minat mengajar' }, { status: 400 })
    if (levelBefore.passed) return NextResponse.json({ error: 'Semua mata pelajaran di kelas ini sudah lulus' }, { status: 400 })

    const expectedSubjects = levelBefore.nextSubjects
    const requiredSubjects = subjectsForLevel(level, tutor)
    if (!expectedSubjects.length) {
      return NextResponse.json({ error: 'Tidak ada mata pelajaran yang perlu diuji' }, { status: 400 })
    }

    // Every subject must have exactly 10 questions. Questions for subjects that
    // already passed are ignored and are not re-scored.
    const subjectResults = expectedSubjects.map((subject) => {
      const subjectQuestions = questions.filter(
        (question) => normalizeSubject(question.subject) === normalizeSubject(subject),
      )
      if (subjectQuestions.length !== 10) {
        throw new Error(`Jumlah soal ${subject} harus 10 (ditemukan ${subjectQuestions.length})`)
      }
      const correct = subjectQuestions.filter(
        (question) => answers[question.id] === question.correctAnswer,
      ).length
      const score = Math.round((correct / subjectQuestions.length) * 100)
      return {
        subject,
        score,
        correct,
        total: subjectQuestions.length,
        passed: score >= 70,
      }
    })

    const levelScore = Math.round(
      subjectResults.reduce((sum, result) => sum + result.score, 0) / subjectResults.length,
    )
    const passedSubjects = subjectResults.filter((result) => result.passed).map((result) => result.subject)
    const failedSubjects = subjectResults.filter((result) => !result.passed).map((result) => result.subject)

    const attemptNumber =
      (previousAssessments ?? []).filter((row) => row.level_targeted === level).length + 1

    const { data: inserted, error: insertError } = await supabase
      .from('academic_assessments')
      .insert({
        tutor_id: tutor.id,
        curation_progress_id: progress.id,
        answers,
        questions_answered: Object.keys(answers).length,
        total_questions: questions.length,
        score: levelScore,
        passed: failedSubjects.length === 0,
        level_targeted: level,
        submitted_at: new Date().toISOString(),
        time_spent_seconds: timeTaken,
        subject_results: subjectResults,
        passed_subjects: passedSubjects,
        failed_subjects: failedSubjects,
        attempt_number: attemptNumber,
        level_passed: failedSubjects.length === 0,
      })
      .select()
      .single()

    if (insertError) throw insertError

    const { data: allAssessments } = await supabase
      .from('academic_assessments')
      .select('id, level_targeted, score, subject_results, passed_subjects, failed_subjects, created_at')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: true })

    const plan = buildAcademicPlan(tutor, allAssessments ?? [])
    const curated = curatedFieldsFromPlan(plan)

    const { error: curationError } = await supabase
      .from('curation_results')
      .upsert(
        {
          tutor_id: tutor.id,
          curation_progress_id: progress.id,
          academic_score: plan.academicScore,
          verified_grade_levels: curated.verifiedGradeLevels,
          specializations_sd: curated.specializationsSd,
          specializations_smp: curated.specializationsSmp,
          specializations_sma: curated.specializationsSma,
          academic_details: { levels: plan.levels },
          academic_passed_levels: curated.passedLevels,
          academic_failed_subjects: curated.failedSubjects,
          academic_completed_at: plan.allPassed ? new Date().toISOString() : null,
        },
        { onConflict: 'tutor_id,curation_progress_id' },
      )

    if (curationError) console.error('[academic] curation_results upsert:', curationError)

    const completedSteps = new Set<string>(progress.completed_steps || [])
    if (plan.allPassed) completedSteps.add('academic')
    else completedSteps.delete('academic')

    await supabase
      .from('curation_progress')
      .update({
        current_step: plan.allPassed ? 'microteaching' : 'academic',
        completed_steps: [...completedSteps],
        updated_at: new Date().toISOString(),
      })
      .eq('id', progress.id)

    await supabase
      .from('tutors')
      .update({ target_grade_level: level })
      .eq('id', tutor.id)

    return NextResponse.json({
      success: true,
      data: inserted,
      results: subjectResults,
      levelScore,
      levelPassed: failedSubjects.length === 0,
      failedSubjects,
      requiredSubjects,
      allPassed: plan.allPassed,
      academicScore: plan.academicScore,
      plan,
    })
  } catch (error) {
    console.error('[academic submit]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save assessment' },
      { status: 500 },
    )
  }
}
