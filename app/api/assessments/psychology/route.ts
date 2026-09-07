/**
 * POST /api/assessments/psychology
 * ---------------------------------------------------------------------------
 * Server-authoritative submission + AI grading for the Psychology test.
 *
 * The client sends raw situational responses + the question set it was shown
 * (no answer keys exist). An independent AI grader scores the candidate across
 * the relevant tutor attributes and returns an overall 0–100 WITH a per-category
 * breakdown so the result is auditable and transparent. Scores cannot be forged.
 */

import { createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { deepseekJSON } from '@/lib/deepseek'
import { NextRequest, NextResponse } from 'next/server'

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
    const answers: Record<number, string> = body.answers ?? {}
    const questions: {
      id: number
      question: string
      options: { value: string; text: string }[]
      category?: string
    }[] = Array.isArray(body.questions) ? body.questions : []

    if (!questions.length) {
      return NextResponse.json(
        { error: 'questions payload required for grading' },
        { status: 400 }
      )
    }

    const { data: tutor } = await supabase
      .from('tutors')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!tutor) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    // --- Build evidence string (question + the candidate's own chosen action)
    const answered = questions.filter(
      (q) => answers[q.id] !== undefined && answers[q.id] !== ''
    )
    const evidence = answered
      .map((q) => {
        const chosen = (q.options ?? []).find((o) => o.value === answers[q.id])
        const chosenText = chosen ? `${chosen.value.toUpperCase()}. ${chosen.text}` : '(tidak dijawab)'
        return `Konteks [${q.category ?? 'Umum'}]: ${q.question}\nYang dipilih kandidat: ${chosenText}`
      })
      .join('\n\n')

    if (answered.length === 0) {
      return NextResponse.json(
        { score: 0, passed: false, error: 'Tidak ada jawaban yang dikirim' },
        { status: 200 }
      )
    }

    // --- AI grading against tutor-attribute rubrics
    const system = `Anda adalah psikolog pendidikan yang mengevaluasi orientasi/profesionalisme calon tutor privat Indonesia (SD/SMP/SMA). Nilai KONSISTEN dan OBJEKTIF berdasarkan tindakan yang dipilih kandidat pada tiap skenario. Gunakan skala per dimensi 0–100. Tidak ada jawaban tunggal yang benar; nilai kualitas pedagogis & etis dari pilihan yang diambil.
Kembalikan HANYA JSON valid:
{
  "overall_score": 0,
  "recommendation": "LULUS | PERTIMBANGAN | TIDAK LULUS",
  "summary": "ringkasan singkat kekuatan & catatan",
  "dimensions": [
    {"dimension":"empathy","label":"Empati","score":0,"justification":"..."}
  ]
}`

    const rubric = `Dimensi yang dinilai (label): 
- classroom_management (Manajemen Kelas)
- empathy (Empati)
- integrity (Integritas)
- communication (Komunikasi)
- student_support (Dukungan terhadap Siswa)
- growth (Pola Pikir Bertumbuh)
Nilai tiap dimensi 0–100. overall_score rata-rata tertimbang. Beri justifikasi singkat berdasar tindakan yg dipilih.`

    const gradedRaw = await deepseekJSON<{
      overall_score: number
      recommendation: string
      summary: string
      dimensions: { dimension: string; label: string; score: number; justification: string }[]
    }>(
      [
        { role: 'system', content: system },
        { role: 'user', content: `${rubric}\n\nJAWABAN KANDIDAT:\n"""\n${evidence}\n"""` },
      ],
      { temperature: 0.2, max_tokens: 1400 }
    )

    const dims = Array.isArray(gradedRaw?.dimensions) ? gradedRaw.dimensions : []
    const safeDims = dims
      .filter((d) => d && Number.isFinite(Number(d.score)))
      .map((d) => ({
        dimension: String(d.dimension ?? 'umum').trim(),
        label: String(d.label ?? 'Umum').trim(),
        score: Math.max(0, Math.min(100, Math.round(Number(d.score)))),
        justification: String(d.justification ?? '').trim(),
      }))

    let overall = Number(gradedRaw?.overall_score)
    if (!Number.isFinite(overall)) {
      overall = safeDims.length
        ? safeDims.reduce((s, d) => s + d.score, 0) / safeDims.length
        : 0
    }
    overall = Math.max(0, Math.min(100, Math.round(overall)))
    const passed = overall >= 70
    const summary = String(gradedRaw?.summary ?? '').trim()

    // --- taxonomy categories actually probed (for the student-facing breakdown)
    const probedCategories = Array.from(
      new Set(questions.map((q) => q.category || 'Umum'))
    )

    const responseRecord = {
      transcript_evidence: evidence,
      ai_dimensions: safeDims,
      ai_summary: summary,
      recommendation: String(gradedRaw?.recommendation ?? '').trim(),
      categories_probed: probedCategories,
    }

    // --- persist
    const { data: progress, error: progErr } = await supabase
      .from('curation_progress')
      .upsert(
        { tutor_id: tutor.id, current_step: 'academic' },
        { onConflict: 'tutor_id', ignoreDuplicates: false }
      )
      .select('id, completed_steps')
      .single()
    if (progErr || !progress) {
      return NextResponse.json({ error: 'Failed to init progress' }, { status: 500 })
    }

    const answersForDb: Record<string, unknown> = {}
    for (const q of questions) {
      const chosen = (q.options ?? []).find((o) => o.value === answers[q.id])
      answersForDb[String(q.id)] = {
        selected: answers[q.id] ?? null,
        chosenText: chosen ? `${chosen.text}` : null,
        category: q.category ?? null,
      }
    }

    const { error } = await supabase
      .from('psychology_assessments')
      .insert({
        tutor_id: tutor.id,
        curation_progress_id: progress.id,
        answers: answersForDb,
        score: overall,
        passed,
        total_questions: questions.length,
        questions_answered: answered.length,
        submitted_at: new Date().toISOString(),
        time_spent_seconds: Number(body.timeTaken) || 0,
      })
      .select()
      .single()
    if (error) throw error

    const steps: string[] = progress.completed_steps || []
    const newSteps = steps.includes('psychology')
      ? steps
      : [...steps, 'psychology']
    await supabase
      .from('curation_progress')
      .update({ current_step: 'academic', completed_steps: newSteps })
      .eq('id', progress.id)

    return NextResponse.json({
      success: true,
      score: overall,
      passed,
      dimensions: safeDims,
      summary,
      response: responseRecord,
    })
  } catch (error) {
    console.error('Error grading psychology assessment:', error)
    return NextResponse.json({ error: 'Failed to grade assessment' }, { status: 500 })
  }
}
