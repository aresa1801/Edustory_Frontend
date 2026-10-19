'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader, TonePill } from '@/components/dashboard/ui'
import { useAuth } from '@/lib/auth-context'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, RotateCw, XCircle } from 'lucide-react'

type Question = {
  id: number
  level: string
  subject: string
  question: string
  options: { value: string; text: string }[]
  correctAnswer: string
}

type LevelPlan = {
  level: string
  subjects: string[]
  passedSubjects: string[]
  failedSubjects: string[]
  untestedSubjects: string[]
  nextSubjects: string[]
  score: number | null
  attempts: number
  passed: boolean
}

type Plan = {
  levels: LevelPlan[]
  academicScore: number | null
  allPassed: boolean
  completedLevels: number
  totalLevels: number
}

type SubjectResult = { subject: string; score: number; correct: number; total: number; passed: boolean }
type TestResult = {
  results: SubjectResult[]
  levelScore: number
  levelPassed: boolean
  failedSubjects: string[]
  allPassed: boolean
  academicScore: number | null
  plan: Plan
}

function statusOf(level: LevelPlan) {
  if (level.passed) return { label: 'Lulus', tone: 'secondary' as const }
  if (level.failedSubjects.length) return { label: 'Perlu Ulang', tone: 'danger' as const }
  if (level.untestedSubjects.length < level.subjects.length) return { label: 'Sebagian', tone: 'muted' as const }
  return { label: 'Belum Tes', tone: 'muted' as const }
}

export default function AcademicTestPage() {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [activeSubjects, setActiveSubjects] = useState<string[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [current, setCurrent] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(40 * 60)
  const [timerActive, setTimerActive] = useState(false)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const submitRef = useRef<() => void>(() => {})

  const loadPlan = useCallback(async () => {
    try {
      const response = await fetch('/api/assessments/academic/plan', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Gagal memuat status akademik')
      setPlan(payload.plan)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat status akademik')
    } finally {
      setLoadingPlan(false)
    }
  }, [])

  useEffect(() => {
    if (!authUser) return
    void loadPlan()
  }, [authUser, loadPlan])

  useEffect(() => {
    if (!timerActive) return
    const timer = setInterval(() => {
      setTimeRemaining((previous) => {
        if (previous <= 1) {
          submitRef.current()
          return 0
        }
        return previous - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timerActive])

  const currentQuestion = questions[current]
  const answeredCount = Object.keys(answers).length
  const subjectProgress = useMemo(() => {
    if (!currentQuestion) return { answered: 0, total: 0 }
    const subjectQuestions = questions.filter((q) => q.subject === currentQuestion.subject)
    return {
      answered: subjectQuestions.filter((q) => answers[q.id]).length,
      total: subjectQuestions.length,
    }
  }, [answers, currentQuestion, questions])

  async function startTest(level: string, overrideSubjects?: string[]) {
    const entry = plan?.levels.find((item) => item.level === level)
    const subjects = overrideSubjects?.length ? overrideSubjects : entry?.nextSubjects ?? []
    if (!entry || !subjects.length) return

    setSelectedLevel(level)
    setActiveSubjects(subjects)
    setQuestions([])
    setAnswers({})
    setCurrent(0)
    setResult(null)
    setError(null)
    setTimeRemaining(40 * 60)
    setLoadingQuestions(true)

    try {
      const response = await fetch('/api/ai/academic-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, subjects, perSubject: 10 }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Gagal menyiapkan soal')
      }
      const received: Question[] = Array.isArray(payload.questions) ? payload.questions : []
      const perSubject = new Map<string, number>()
      for (const question of received) {
        perSubject.set(question.subject, (perSubject.get(question.subject) ?? 0) + 1)
      }
      const incomplete = subjects.filter((subject) => (perSubject.get(subject) ?? 0) !== 10)
      if (incomplete.length) {
        throw new Error(`Soal untuk ${incomplete.join(', ')} belum lengkap (harus 10 soal per mapel).`)
      }
      setQuestions(received)
      setTimerActive(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyiapkan soal')
      setSelectedLevel(null)
    } finally {
      setLoadingQuestions(false)
    }
  }

  async function submit() {
    if (!selectedLevel || submitting || !questions.length) return
    setTimerActive(false)
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/assessments/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: selectedLevel,
          questions,
          answers,
          timeTaken: 40 * 60 - timeRemaining,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Gagal menyimpan hasil tes')
      setResult(payload)
      if (payload.plan) setPlan(payload.plan)
      setQuestions([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan hasil tes')
      setTimerActive(true)
    } finally {
      setSubmitting(false)
    }
  }
  submitRef.current = submit

  if (loadingPlan) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <Spinner className="h-8 w-8" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat rencana tes akademik...</p>
      </div>
    )
  }

  if (!plan || plan.levels.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert>
          <AlertDescription>
            Anda belum menetapkan kelas dan mata pelajaran. Atur <strong>Minat Mengajar</strong> terlebih dahulu agar tes akademik dapat disusun.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push('/dashboard/tutor/teaching-interest')}>
          Atur Minat Mengajar
        </Button>
      </div>
    )
  }

  // ===== RESULT VIEW =====
  if (result) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <PageHeader
          eyebrow="Hasil Tes Akademik"
          title={result.levelPassed ? 'Tes akademik lulus.' : 'Beberapa mapel perlu diulang.'}
          description="Setiap mata pelajaran harus mencapai minimal 70. Mapel yang sudah lulus tidak perlu diulang."
        />

        <Card className="surface mt-6 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skor level</p>
              <p className="mt-1 text-5xl font-bold text-primary">{result.levelScore}</p>
            </div>
            <TonePill tone={result.levelPassed ? 'secondary' : 'danger'}>
              {result.levelPassed ? 'Lulus level' : 'Belum lulus level'}
            </TonePill>
          </div>

          <div className="mt-6 space-y-2">
            {result.results.map((item) => (
              <div key={item.subject} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  {item.passed ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />}
                  <span className="text-sm font-medium">{item.subject}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{item.correct}/{item.total} benar</span>
                  <span className={`text-sm font-bold ${item.passed ? 'text-success' : 'text-destructive'}`}>{item.score}</span>
                </div>
              </div>
            ))}
          </div>

          {!result.levelPassed ? (
            <Alert className="mt-5 border-warning/40 bg-warning/10">
              <AlertDescription>
                Mapel yang perlu diulang: <strong>{result.failedSubjects.join(', ')}</strong>. Nilai rata-rata level tetap dihitung, tetapi hanya mapel dengan nilai ≥ 70 yang dianggap lulus.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            {!result.levelPassed ? (
              <Button
                className="flex-1"
                onClick={() => startTest(selectedLevel ?? plan.levels.find((l) => l.failedSubjects.length)?.level ?? '', result.failedSubjects)}
              >
                <RotateCw className="mr-2 size-4" /> Ulangi {result.failedSubjects.join(', ')}
              </Button>
            ) : (
              <Button className="flex-1" onClick={() => router.push('/dashboard/tutor/curation/progress')}>
                {result.allPassed ? 'Lanjut ke Micro Teaching' : 'Kembali ke Status Kurasi'}
              </Button>
            )}
            <Button variant="outline" onClick={() => { setResult(null); void loadPlan() }}>
              Kembali ke daftar tes
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ===== TEST VIEW =====
  if (selectedLevel && questions.length > 0) {
    return (
      <div className="min-h-screen px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{selectedLevel} · {activeSubjects.join(' · ')}</p>
              <h1 className="mt-1 text-xl font-semibold">Tes Kemampuan Akademik</h1>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold">
              <Clock3 className="size-4 text-primary" />
              {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}
            </div>
          </div>

          <Progress value={(answeredCount / questions.length) * 100} className="mb-2 h-2" />
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Terjawab {answeredCount} dari {questions.length}</span>
            <span>{currentQuestion?.subject} · {subjectProgress.answered}/{subjectProgress.total}</span>
          </div>

          <Card className="surface rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <TonePill tone="muted">Soal {current + 1} / {questions.length}</TonePill>
              <BadgeSubject subject={currentQuestion?.subject ?? ''} />
            </div>
            <h2 className="mt-5 text-lg font-medium leading-relaxed">{currentQuestion?.question}</h2>
            <RadioGroup
              className="mt-5 space-y-2.5"
              value={answers[currentQuestion?.id ?? -1] ?? ''}
              onValueChange={(value) => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: value }))}
            >
              {currentQuestion?.options.map((option) => (
                <div key={option.value} className="flex items-start gap-3 rounded-xl border border-border px-4 py-3 hover:bg-muted/40">
                  <RadioGroupItem value={option.value} id={`option-${option.value}`} className="mt-0.5" />
                  <Label htmlFor={`option-${option.value}`} className="cursor-pointer text-sm leading-6">
                    <span className="mr-2 font-semibold uppercase text-muted-foreground">{option.value}.</span>
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {error ? <Alert className="mt-4" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

            <div className="mt-6 flex items-center justify-between">
              <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}>
                <ChevronLeft className="mr-1 size-4" /> Sebelumnya
              </Button>
              {current < questions.length - 1 ? (
                <Button onClick={() => setCurrent((value) => value + 1)}>
                  Berikutnya <ChevronRight className="ml-1 size-4" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Kirim Jawaban
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ===== LEVEL LIST =====
  return (
    <div className="min-h-screen px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="Tahap 1 dari 5"
          title="Tes Kemampuan Akademik"
          description="Satu tes per kelas. Setiap mata pelajaran berisi 10 soal dan harus mencapai minimal 70. Mapel yang sudah lulus tidak perlu diulang."
        />

        {error ? <Alert className="mt-5" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        {loadingQuestions ? (
          <div className="flex flex-col items-center py-16">
            <Spinner className="h-8 w-8" />
            <p className="mt-4 text-sm text-muted-foreground">Menyiapkan 10 soal per mata pelajaran...</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {plan.levels.map((level) => {
            const status = statusOf(level)
            return (
              <Card key={level.level} className="surface rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{level.level}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {level.subjects.length} mata pelajaran · percobaan {level.attempts}
                    </p>
                  </div>
                  <TonePill tone={status.tone}>{status.label}</TonePill>
                </div>

                <div className="mt-4 space-y-2">
                  {level.subjects.map((subject) => {
                    const passed = level.passedSubjects.some((item) => item === subject)
                    const failed = level.failedSubjects.some((item) => item === subject)
                    return (
                      <div key={subject} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          {passed ? <CheckCircle2 className="size-3.5 text-success" /> : failed ? <XCircle className="size-3.5 text-destructive" /> : <span className="size-3.5 rounded-full border border-border" />}
                          {subject}
                        </span>
                        <span className={`text-xs font-semibold ${passed ? 'text-success' : failed ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {passed ? 'Lulus' : failed ? 'Ulang' : 'Belum tes'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">
                    {level.score !== null ? `Skor ${level.score}` : 'Belum ada skor'}
                  </span>
                  {level.passed ? (
                    <Button size="sm" variant="outline" disabled>Sudah Lulus</Button>
                  ) : (
                    <Button size="sm" onClick={() => startTest(level.level)} disabled={loadingQuestions}>
                      {level.attempts > 0 ? 'Ulangi Tes' : 'Mulai Tes'}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>

        <Card className="surface mt-6 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Skor akademik keseluruhan</p>
              <p className="text-xs text-muted-foreground">Rata-rata skor level yang sudah diuji. Semua mapel wajib ≥ 70.</p>
            </div>
            <p className="text-3xl font-bold text-primary">{plan.academicScore ?? '—'}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function BadgeSubject({ subject }: { subject: string }) {
  return (
    <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {subject}
    </span>
  )
}
