'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'

const INTERVIEW_QUESTIONS = [
  {
    id: 1,
    question: 'Ceritakan latar belakang pendidikan dan pengalaman mengajar Anda.',
    timeLimit: 120,
    tips: 'Fokus pada pengalaman relevan dan pencapaian yang dapat Anda tonjolkan.',
  },
  {
    id: 2,
    question: 'Apa motivasi utama Anda untuk menjadi pengajar privat di EduStory?',
    timeLimit: 90,
    tips: 'Tunjukkan antusiasme dan komitmen Anda terhadap dunia pendidikan.',
  },
  {
    id: 3,
    question: 'Bagaimana pendekatan Anda dalam menghadapi siswa yang kesulitan memahami materi?',
    timeLimit: 120,
    tips: 'Berikan contoh nyata atau strategi konkret yang pernah Anda gunakan.',
  },
  {
    id: 4,
    question: 'Mata pelajaran apa yang paling Anda kuasai dan mengapa?',
    timeLimit: 90,
    tips: 'Jelaskan keahlian spesifik dan pengalaman Anda di bidang tersebut.',
  },
  {
    id: 5,
    question: 'Bagaimana Anda mengukur keberhasilan proses pembelajaran dengan siswa?',
    timeLimit: 90,
    tips: 'Sebutkan metode evaluasi yang Anda gunakan.',
  },
]

export default function InterviewPage() {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(INTERVIEW_QUESTIONS[0].timeLimit)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [phase, setPhase] = useState<'intro' | 'interview' | 'done'>('intro')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (phase !== 'interview') return

    setTimeRemaining(INTERVIEW_QUESTIONS[currentQuestion].timeLimit)

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleNextQuestion()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentQuestion, phase])

  const handleNextQuestion = () => {
    if (timerRef.current) clearInterval(timerRef.current)

    const updatedAnswers = {
      ...answers,
      [INTERVIEW_QUESTIONS[currentQuestion].id]: currentAnswer,
    }
    setAnswers(updatedAnswers)
    setCurrentAnswer('')

    if (currentQuestion < INTERVIEW_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      handleSubmit(updatedAnswers)
    }
  }

  const handleSubmit = async (finalAnswers: Record<number, string>) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/assessments/psychology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'interview',
          answers: finalAnswers,
          score: 75,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Gagal mengirim jawaban')
      }

      setSubmitted(true)
      setPhase('done')
      setTimeout(() => {
        router.push('/curation/progress')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const progress = ((currentQuestion + 1) / INTERVIEW_QUESTIONS.length) * 100
  const timeProgress = (timeRemaining / INTERVIEW_QUESTIONS[currentQuestion]?.timeLimit) * 100
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-2xl p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">💬</div>
            <h1 className="text-3xl font-bold text-foreground mb-3">Sesi Interview AI</h1>
            <p className="text-muted-foreground">
              Tahap 5 dari 5 — Jawab pertanyaan interview untuk menyelesaikan proses kurasi
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">Panduan Interview:</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                Terdiri dari {INTERVIEW_QUESTIONS.length} pertanyaan dengan batas waktu per pertanyaan
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                Jawaban Anda akan direkam dalam bentuk teks
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                Jika waktu habis, sistem akan otomatis pindah ke pertanyaan berikutnya
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                Jawablah dengan jujur dan sejelas mungkin
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✓</span>
                Pastikan Anda berada di lingkungan yang tenang
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-amber-800">
              ⚠️ Setelah memulai, interview tidak dapat dihentikan atau diulang. Pastikan Anda siap sebelum melanjutkan.
            </p>
          </div>

          <Button
            onClick={() => setPhase('interview')}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white text-base font-semibold"
          >
            Mulai Interview Sekarang
          </Button>
        </Card>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-2xl p-8 text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold mb-4 text-foreground">Interview Selesai!</h2>
          <p className="text-muted-foreground mb-6">
            Semua tahapan kurasi telah diselesaikan. Tim kami akan meninjau aplikasi Anda dan menghubungi dalam 3–5 hari kerja.
          </p>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {loading ? (
            <Spinner className="mx-auto" />
          ) : (
            <p className="text-sm text-muted-foreground">Mengalihkan ke halaman progres...</p>
          )}
        </Card>
      </div>
    )
  }

  const question = INTERVIEW_QUESTIONS[currentQuestion]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold text-foreground">Interview AI</h1>
            <Badge variant="outline">
              Pertanyaan {currentQuestion + 1} dari {INTERVIEW_QUESTIONS.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2 mb-4" />

          {/* Timer */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Progres keseluruhan</p>
            <div className={`text-lg font-bold ${timeRemaining <= 10 ? 'text-destructive' : 'text-primary'}`}>
              ⏱ {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
          </div>
          <Progress
            value={timeProgress}
            className={`h-1.5 mt-1 ${timeRemaining <= 10 ? '[&>div]:bg-destructive' : ''}`}
          />
        </div>

        <Card className="p-8 mb-6">
          <div className="mb-6">
            <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold mb-4">
              Pertanyaan {currentQuestion + 1}
            </span>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {question.question}
            </h2>
            <p className="text-sm text-muted-foreground italic">
              💡 Tips: {question.tips}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Jawaban Anda:
            </label>
            <textarea
              value={currentAnswer}
              onChange={e => setCurrentAnswer(e.target.value)}
              placeholder="Ketik jawaban Anda di sini..."
              rows={6}
              className="w-full px-4 py-3 rounded-lg border border-border/50 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {currentAnswer.length} karakter
            </p>
          </div>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleNextQuestion}
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-white px-8 h-12"
          >
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Memproses...
              </>
            ) : currentQuestion < INTERVIEW_QUESTIONS.length - 1 ? (
              'Pertanyaan Selanjutnya →'
            ) : (
              'Selesaikan Interview'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
