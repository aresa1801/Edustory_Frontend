/**
 * POST /api/assessments/handwriting
 * ---------------------------------------------------------------------------
 * Server-authoritative, AI-graded Handwriting & Explanation (TEXT-based).
 *
 * Per product decision, candidates write out their worked solution + teaching
 * explanation as text (a photo upload is OPTIONAL for archival). An independent
 * AI grader evaluates each answer on: accuracy (is the math/logic correct?),
 * explanation quality (clear enough to teach a student), and address of the
 * prompt. Scores are computed here — never accepted from the client.
 *
 * Request (JSON):
 *   { problem1_answer: string, problem2_answer: string,
 *     problem1_image?: string, problem2_image?: string }
 * Response: { success, score, passed, dimensions, summary, per_problem }
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

const PASS_MARK = 70

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = getAdminClient()

    const ctype = (req.headers.get('content-type') ?? '').toLowerCase()
    let p1 = ''
    let p2 = ''
    let imgUrl1: string | null = null
    let imgUrl2: string | null = null

    if (ctype.includes('application/json')) {
      const b = await req.json().catch(() => ({}))
      p1 = String(b.problem1_answer ?? b.problem1_explanation ?? '').trim()
      p2 = String(b.problem2_answer ?? b.problem2_explanation ?? '').trim()
      imgUrl1 = b.problem1_image || null
      imgUrl2 = b.problem2_image || null
    } else {
      const fd = await req.formData()
      p1 = String(fd.get('problem1_answer') ?? fd.get('problem1_explanation') ?? '').trim()
      p2 = String(fd.get('problem2_answer') ?? fd.get('problem2_explanation') ?? '').trim()
      imgUrl1 = String(fd.get('problem1_image') ?? '') || null
      imgUrl2 = String(fd.get('problem2_image') ?? '') || null
    }

    if (p1.length < 50 || p2.length < 50) {
      return NextResponse.json(
        { error: 'Tulis jawaban/penjelasan tiap soal minimal 50 karakter.' },
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
    const { data: progress } = await supabase
      .from('curation_progress')
      .select('id, completed_steps')
      .eq('tutor_id', tutor.id)
      .single()
    if (!progress) {
      return NextResponse.json({ error: 'Curation progress not found' }, { status: 404 })
    }

    const PROBLEM_1 = `Soal MTK: Kolam balok panjang 25 m, lebar 10 m, kedalaman 2 m. Jika terisi 3/4, volume air? (Acuan: 25×10×2=500 m³; 3/4 × 500 = 375 m³).`
    const PROBLEM_2 = `Soal penalaran: Jelaskan mengapa 0,5 = 1/2 = 50% dengan minimal 2 cara berbeda yang mudah dipahami siswa SD kelas 5.`

    const system = `Anda adalah asesor kurasi guru Edustory. Nilailah JAWABAN TERTULIS calon tutor untuk dua soal berikut secara OBJEKTIF dan TRANSPARAN. Skala 0–100. Kembalikan HANYA JSON valid:
{
  "per_problem": [
    { "accuracy": 0, "explanation_quality": 0, "justification": "..." },
    { "accuracy": 0, "explanation_quality": 0, "justification": "..." }
  ],
  "overall_score": 0,
  "recommendation": "LULUS | PERTIMBANGAN | TIDAK LULUS",
  "summary": "ringkasan singkat mulai dari ketepatan matematika & kejelasan cara menjelaskan",
  "accuracy_issues": ["opsional poin kurang tepat"]
}`

    const rubric = `RUBRIK PER SOAL (0–100):
- accuracy: kebenaran matematika / logika argumen (cek acuan: ${PROBLEM_1} --- ${PROBLEM_2}).
- explanation_quality: kejelasan & kelengkapan menjelaskan sehingga siswa paham (mis. analogi, diagram verbal, langkah).
Nilai overall = rata-rata dari keempat sub-skor. Passing >= 70.`

    const evidence = `JAWABAN KANDIDAT:\n\nSoal 1 (${PROBLEM_1})\nJawaban: """\n${p1}\n"""\n\nSoal 2 (${PROBLEM_2})\nJawaban: """\n${p2}\n"""`

    let dims = { p1Accuracy: 0, p1Expl: 0, p2Accuracy: 0, p2Expl: 0 }
    let perProblem: { accuracy: number; explanation_quality: number; justification: string }[] = []
    let overall = 0
    let summary = ''
    let recommendation = ''
    let accuracyIssues: string[] = []

    try {
      const raw = await deepseekJSON<{
        per_problem?: {
          accuracy?: number
          explanation_quality?: number
          justification?: string
        }[]
        overall_score?: number
        recommendation?: string
        summary?: string
        accuracy_issues?: string[]
      }>(
        [
          { role: 'system', content: system },
          { role: 'user', content: `${rubric}\n\n${evidence}` },
        ],
        { temperature: 0.15, max_tokens: 1600 }
      )

      const clamp = (n: unknown) => {
        const v = Number(n)
        return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0
      }
      perProblem = Array.isArray(raw?.per_problem)
        ? raw.per_problem.map((p) => ({
            accuracy: clamp(p?.accuracy),
            explanation_quality: clamp(p?.explanation_quality),
            justification: String(p?.justification ?? '').trim(),
          }))
        : []
      dims = {
        p1Accuracy: perProblem[0]?.accuracy ?? 0,
        p1Expl: perProblem[0]?.explanation_quality ?? 0,
        p2Accuracy: perProblem[1]?.accuracy ?? 0,
        p2Expl: perProblem[1]?.explanation_quality ?? 0,
      }
      const fromSub = Math.round(
        (dims.p1Accuracy + dims.p1Expl + dims.p2Accuracy + dims.p2Expl) / 4
      )
      overall = clamp(raw?.overall_score) || fromSub
      summary = String(raw?.summary ?? '').trim()
      recommendation = String(raw?.recommendation ?? '').trim()
      accuracyIssues = Array.isArray(raw?.accuracy_issues)
        ? raw.accuracy_issues.map((i) => String(i)).filter(Boolean)
        : []
    } catch (e) {
      console.error('[handwriting] AI grading error:', e)
      return NextResponse.json(
        { error: 'Gagal menilai jawaban. Silakan coba lagi.' },
        { status: 502 }
      )
    }

    const passed = overall >= PASS_MARK
    const legibility = Math.round((dims.p1Expl + dims.p2Expl) / 2) // explanation lucidity
    const accuracy = Math.round((dims.p1Accuracy + dims.p2Accuracy) / 2)

    const ocrResults = {
      problem_1_ai: { ...perProblem[0] },
      problem_2_ai: { ...perProblem[1] },
      accuracy_issues: accuracyIssues,
      graded_by: 'deepseek-ai', // text input; OCR-equivalent is the written answer
    }

    const { data, error } = await supabase
      .from('handwriting_assessments')
      .insert({
        tutor_id: tutor.id,
        curation_progress_id: progress.id,
        problem_1_image_url: imgUrl1,
        problem_2_image_url: imgUrl2,
        problem_1_explanation: p1,
        problem_2_explanation: p2,
        // Legacy sub-score columns are DECIMAL(3,2) → store a 0–10 value;
        // the authoritative 0–100 figure lives in overall_score + ai_analysis.
        legibility_score: round1(legibility / 10),
        accuracy_score: round1(accuracy / 10),
        explanation_quality_score: round1(legibility / 10),
        overall_score: overall,
        passed,
        ocr_results: ocrResults,
        ai_analysis: {
          dimensions: dims,
          per_problem: perProblem,
          summary,
          recommendation,
          accuracy_issues: accuracyIssues,
        },
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error

    const existingSteps: string[] = progress.completed_steps || []
    const newSteps = existingSteps.includes('handwriting')
      ? existingSteps
      : [...existingSteps, 'handwriting']
    await supabase
      .from('curation_progress')
      .update({
        current_step: 'interview',
        completed_steps: newSteps,
        updated_at: new Date().toISOString(),
      })
      .eq('id', progress.id)

    return NextResponse.json({
      success: true,
      score: overall,
      passed,
      dimensions: dims,
      per_problem: perProblem,
      summary,
      data,
    })
  } catch (error) {
    console.error('Error saving handwriting assessment:', error)
    return NextResponse.json({ error: 'Failed to save assessment' }, { status: 500 })
  }
}
