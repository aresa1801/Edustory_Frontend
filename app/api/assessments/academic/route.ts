/**
 * POST /api/assessments/academic
 * ---------------------------------------------------------------------------
 * Server-authoritative submission + grading for the Academic Test.
 *
 * The client NEVER sends a computed score — only raw answers (+ the AI question
 * set for SMA, where there is no static key). Everything is graded HERE so a
 * user cannot forge `score:100`.
 *
 *   source 'static' (SD/SMP): answers keyed by question id are matched against
 *        the static bank (correct keys exist only server-side).
 *   source 'ai'     (SMA):    the client echoes the question set it was shown
 *        (without keys) + its answers; an independent AI grader evaluates each
 *        item and returns 0–100.
 *
 * Transparency: we persist a per-subject breakdown + raw results and return the
 * breakdown to the client so the candidate sees exactly how the score arose.
 */

import { createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { gradeStatic } from '@/lib/curation/grading'
import { assessAcademicFreeText } from '@/lib/curation/ai-grader'
import { usesStaticBank } from '@/lib/curation/levels'
import { ACADEMIC_BANK_VERSION, AcademicQuestion } from '@/lib/curation/academic-bank'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = getAdminClient()

    const body = await req.json().catch(() => ({}))
    const level: string = body.level ?? ''
    const answers: Record<number, string> = body.answers ?? {}
    // Only present for AI (SMA) submission; ignored/clamped for static.
    const questionsAI: (Omit<AcademicQuestion, 'correctAnswer' | 'explanation'>)[] =
      Array.isArray(body.questions) ? body.questions : []

    if (!level) {
      return NextResponse.json({ error: 'level is required' }, { status: 400 })
    }

    const { data: tutor } = await supabase
      .from('tutors')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!tutor) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    // ------------------------------------------------------------------
    // GRADE
    // ------------------------------------------------------------------
    let finalScore = 0
    let perSubject: { subject: string; correct: number; total: number; score: number }[] = []
    let passed = false
    let source = usesStaticBank(level) ? 'static' : 'ai'
    let aiSummary = ''
    let aiRecommendation = ''
    let staticResults: { questionId: number; subject: string; selected: string; correct: boolean }[] = []

    if (source === 'static') {
      const graded = gradeStatic(level, answers)
      finalScore = graded.score
      perSubject = graded.perSubject
      passed = finalScore >= 70
      staticResults = graded.results.map((r) => ({
        questionId: r.questionId,
        subject: r.subject,
        selected: r.selected,
        correct: r.correct,
      }))
    } else {
      // SMA AI — independent grader, using question text + candidate answer.
      const forGrader = (questionsAI.length ? questionsAI : []).map((q) => {
        const selectedOpt = (q.options ?? []).find((o) => o.value === answers[q.id])
        return {
          question: q.question,
          subject: q.subject,
          options: q.options ?? [],
          chosenText: selectedOpt ? `${selectedOpt.value}. ${selectedOpt.text}` : '(tidak dijawab)',
        }
      })
      if (forGrader.length === 0) {
        // Nothing we can grade → surface as failure, do NOT silently pass.
        finalScore = 0
        passed = false
        aiSummary = 'Tidak ada soal yang dapat dinilai (data tidak lengkap).'
      } else {
        const graded = await assessAcademicFreeText(forGrader, level)
        finalScore = graded.overall
        passed = finalScore >= 70
        aiSummary = graded.summary
        aiRecommendation = graded.recommendation
      }
    }

    // ------------------------------------------------------------------
    // PERSIST
    // ------------------------------------------------------------------
    const { data: progress } = await supabase
      .from('curation_progress')
      .select('id, completed_steps')
      .eq('tutor_id', tutor.id)
      .single()
    if (!progress) {
      return NextResponse.json({ error: 'Curation progress not found' }, { status: 404 })
    }

    const scorePayload = {
      // deterministic score only for static; AI overall is numerical anyway
      overall: finalScore,
      source,
      bank_version: source === 'static' ? ACADEMIC_BANK_VERSION : undefined,
      per_subject: perSubject,
      ai_summary: aiSummary || undefined,
      ai_recommendation: aiRecommendation || undefined,
      results: staticResults.length ? staticResults : undefined,
    }

    const { data, error } = await supabase
      .from('academic_assessments')
      .insert({
        tutor_id: tutor.id,
        curation_progress_id: progress.id,
        answers,
        score: finalScore,
        passed,
        submitted_at: new Date().toISOString(),
        time_spent_seconds: Number(body.timeTaken) || 0,
        level_targeted: level,
        subjects: Array.from(new Set(perSubject.map((s) => s.subject))),
        questions_answered: staticResults.length || forGraderCount(body),
        total_questions: staticResults.length || forGraderCount(body),
      })
      .select()
      .single()

    if (error) throw error

    if (level) {
      await supabase
        .from('tutors')
        .update({ target_grade_level: level })
        .eq('id', tutor.id)
    }

    const existingSteps: string[] = progress.completed_steps || []
    const newSteps = existingSteps.includes('academic')
      ? existingSteps
      : [...existingSteps, 'academic']
    await supabase
      .from('curation_progress')
      .update({
        current_step: 'microteaching',
        completed_steps: newSteps,
        updated_at: new Date().toISOString(),
      })
      .eq('id', progress.id)

    return NextResponse.json({
      success: true,
      score: finalScore,
      passed,
      source,
      perSubject,
      breakdown: scorePayload,
      data,
    })
  } catch (error) {
    console.error('Error grading academic assessment:', error)
    return NextResponse.json(
      { error: 'Failed to grade assessment' },
      { status: 500 }
    )
  }
}

function forGraderCount(body: { questions?: unknown }): number {
  const items = body.questions
  return Array.isArray(items) ? items.length : 0
}
