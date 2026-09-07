'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'

/**
 * Academic Test — server-authoritative.
 *
 * Questions are fetched from /api/ai/academic-questions and NEVER include the
 * correct answer. The score is computed on the server at /api/assessments/academic
 * and returned here; this page never trusts a locally computed figure.
 *
 * source: 'static' (SD/SMP — server bank) | 'ai' (SMA — AI grader)
 */

type PresentedQuestion = {
  id: number
  level: string
  subject: string
  question: string
  options: { value: string; text: string }[]
}

const LEVELS = [
  'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
  'SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9',
  'SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12',
]

type ServerResult = {
  score: number
  passed: boolean
  source: string | null
  perSubject?: { subject: string; correct: number; total: number; score: number }[]
}

export default function AcademicTestPage() {
  const router = useRouter()
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [questions, setQuestions] = useState<PresentedQuestion[]>([])
  const [source, setSource] = useState<'static' | 'ai' | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverResult, setServerResult] = useState<ServerResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleStartTest = async (level: string) => {
    setSelectedLevel(level)
    setLoadingQuestions(true)
    setError(null)
    setAnswers({})
    setCurrentQuestion(0)
    setServerResult(null)
    setQuestions([])

    try {
      const res = await fetch('/api/ai/academic-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, count: 10 }),
      })
      if (!res.ok) throw new Error('Gagal memuat soal')
      const data = await res.json()
      const qs: PresentedQuestion[] = Array.isArray(data?.questions) ? data.questions : []
      setQuestions(qs)
      setSource(data?.source === 'ai' ? 'ai' : 'static')
    } catch (e) {
      setError('Gagal memuat soal. Periksa koneksi dan coba lagi.')
    } finally {
      setLoadingQuestions(false)
    }
  }

  const handleAnswerChange = useCallback(
    (value: string) => {
      if (!questions.length) return
      const q = questions[currentQuestion]
      setAnswers((prev) => ({ ...prev, [q.id]: value }))
    },
    [questions, currentQuestion]
  )

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/assessments/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, level: selectedLevel, questions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal menilai')
      setServerResult({
        score: data.score,
        passed: data.passed,
        source: data.source,
        perSubject: data.perSubject,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menilai jawaban.')
      setSubmitting(false)
    }
  }

  // ── Loading screen ────────────────────────────────────────────────
  if (loadingQuestions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {selectedLevel?.startsWith('SMA')
              ? `Menyiapkan soal ${selectedLevel} dengan AI...`
              : `Menyiapkan soal ${selectedLevel}...`}
          </p>
        </div>
      </div>
    )
  }

  // ── Level picker ──────────────────────────────────────────────────
  if (!selectedLevel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">Tes Kemampuan Akademik</h1>
            <p className="text-muted-foreground">
              Pilih jenjang kelas yang ingin Anda uji. Soal mencakup berbagai mata pelajaran
              dari <strong>SD Kelas 1</strong> hingga <strong>SMA Kelas 12</strong> (Kurikulum Merdeka / K-13).
            </p>
          </div>
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              <strong>Penilaian transparan &amp; adil:</strong> skor dihitung otomatis di server.
              Untuk SD &amp; SMP (bank terkurasi) dan SMA (penilaian AI), Anda akan melihat rincian
              skor per mata pelajaran setelah selesai.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LEVELS.map((level) => {
              const isSD = level.startsWith('SD')
              const isSMP = level.startsWith('SMP')
              const isSMA = level.startsWith('SMA')
              return (
                <Card
                  key={level}
                  className="p-5 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                  onClick={() => handleStartTest(level)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{isSD ? '📖' : isSMP ? '📘' : '🎓'}</span>
                    <div>
                      <h3 className="font-semibold text-foreground">{level}</h3>
                      <p className="text-xs text-muted-foreground">
                        {isSMA ? 'Dinilai AI' : 'Bank terkurasi'}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="w-full mt-3 bg-primary hover:bg-primary/90">
                    Mulai Tes
                  </Button>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Result screen ─────────────────────────────────────────────────
  if (serverResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-2">Hasil Tes Kemampuan Akademik</h2>
          <p className="text-muted-foreground mb-6">{selectedLevel}</p>
          <div className="my-6">
            <div className="text-6xl font-bold text-primary mb-4">{serverResult.score}</div>
            <p className="text-xl text-muted-foreground mb-6">Skor Anda dari 100</p>
            {serverResult.passed ? (
              <Alert className="bg-green-50 border-green-200 mb-6">
                <AlertDescription className="text-green-800">
                  Selamat! Anda lulus tes kemampuan akademik. Mari lanjut ke bagian selanjutnya.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-yellow-50 border-yellow-200 mb-6">
                <AlertDescription className="text-yellow-800">
                  Skor Anda belum memenuhi standar minimum (70). Silakan coba lagi.
                </AlertDescription>
              </Alert>
            )}
          </div>
          {serverResult.perSubject && serverResult.perSubject.length > 0 && (
            <div className="text-left mx-auto max-w-md mb-6 space-y-2">
              <p className="font-semibold text-foreground">Rincian per mata pelajaran:</p>
              {serverResult.perSubject.map((s) => (
                <div key={s.subject} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{s.subject}</span>
                  <span className="font-medium">{s.correct}/{s.total} · {s.score}</span>
                </div>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setSelectedLevel(null)
              setServerResult(null)
              setAnswers({})
              setCurrentQuestion(0)
              setQuestions([])
            }}
          >
            Pilih Level Lain
          </Button>
        </Card>
      </div>
    )
  }

  // ── No questions / error before start ─────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h2 className="text-xl font-bold mb-4">Tidak ada soal tersedia</h2>
          <Alert className="mb-4 bg-yellow-50 border-yellow-200">
            <AlertDescription className="text-yellow-800">
              {error ?? 'Soal untuk jenjang ini belum tersedia. Coba lagi atau pilih jenjang lain.'}
            </AlertDescription>
          </Alert>
          <Button onClick={() => setSelectedLevel(null)} variant="outline">
            Kembali Pilih Level
          </Button>
        </Card>
      </div>
    )
  }

  // ── Quiz screen ───────────────────────────────────────────────────
  const question = questions[currentQuestion]
  const answeredCount = Object.keys(answers).length
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Tes Kemampuan Akademik</h1>
              <Badge variant="outline">{source === 'ai' ? 'Dinilai AI' : 'Terkurasi'}</Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              Terjawab {answeredCount}/{questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Pertanyaan {currentQuestion + 1} dari {questions.length}
          </p>
        </div>

        <Card className="p-8 mb-8">
          <div className="mb-4 flex gap-2">
            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20">
              {question.level}
            </Badge>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {question.subject}
            </Badge>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-6">{question.question}</h2>
          <RadioGroup value={answers[question.id] || ''} onValueChange={handleAnswerChange}>
            <div className="space-y-3">
              {question.options.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.value} id={`opt-${option.value}`} />
                  <Label htmlFor={`opt-${option.value}`} className="cursor-pointer flex-1">
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </Card>

        {error && (
          <Alert className="mb-4 bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between gap-4">
          <Button
            onClick={() => setCurrentQuestion((c) => Math.max(0, c - 1))}
            disabled={currentQuestion === 0}
            variant="outline"
          >
            Sebelumnya
          </Button>
          {currentQuestion === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              className="bg-secondary hover:bg-secondary/90"
              disabled={submitting}
            >
              {submitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Selesai &amp; Submit
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestion((c) => Math.min(questions.length - 1, c + 1))}
              className="bg-secondary hover:bg-secondary/90"
            >
              Selanjutnya
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
