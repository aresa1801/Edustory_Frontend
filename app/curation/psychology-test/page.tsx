'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
 * Psychology Test — server-authoritative, AI-graded.
 * - Questions are situational (no single "correct" key, so the client cannot
 *   cheat by matching an answer key).
 * - On submit the client sends its chosen responses + the question set.
 * - The server AI-grades across tutor attributes (empathy, classroom management,
 *   integrity…) and returns an auditable per-dimension breakdown.
 */

type PresentedPsychologyQuestion = {
  id: number
  question: string
  options: { value: string; text: string }[]
  category: string
}

type Dimension = { dimension: string; label: string; score: number; justification: string }

type ServerResult = {
  score: number
  passed: boolean
  dimensions: Dimension[]
  summary?: string
}

// Lightweight offline fallback scenarios (no answer key ever shipped).
const FALLBACK_QUESTIONS: PresentedPsychologyQuestion[] = [
  {
    id: 1,
    category: 'Student Management',
    question: 'Seorang siswa terus menjawab dengan suara keras dan mengganggu saat Anda menjelaskan. Tindakan paling profesional Anda:',
    options: [
      { value: 'a', text: 'Menghentikan kelas dan menegurnya di depan semua siswa' },
      { value: 'b', text: 'Mendekatinya, lalu berbicara pelan secara pribadi sambil tetap melanjutkan kelas' },
      { value: 'c', text: 'Mengabaikannya dan berharap ia berhenti sendiri' },
      { value: 'd', text: 'Menambah volume suara agar lebih dominan' },
    ],
  },
  {
    id: 2,
    category: 'Empathy',
    question: 'Siswa terlihat murung dan tidak fokus pada sesi hari itu. Sikap Anda:',
    options: [
      { value: 'a', text: 'Langsung menuntut ia fokus karena waktu terbatas' },
      { value: 'b', text: 'Menyapa dengan hangat dan menanyakan apakah ada yang ingin ia ceritakan' },
      { value: 'c', text: 'Menganggap itu bukan bagian dari tugas tutor' },
      { value: 'd', text: 'Mengurangi jam sesinya agar tidak mengganggu ritme' },
    ],
  },
  {
    id: 3,
    category: 'Integrity',
    question: 'Anda tidak yakin menjawab pertanyaan siswa di luar bidang Anda. Yang Anda lakukan:',
    options: [
      { value: 'a', text: 'Menjawab sekenanya agar terlihat menguasai' },
      { value: 'b', text: 'Mengatakan jujur bahwa ini di luar bidang Anda, lalu mencari jawabannya bersama' },
      { value: 'c', text: 'Mengatakan itu tidak penting untuk ujian' },
      { value: 'd', text: 'Mengalihkan pembicaraan' },
    ],
  },
  {
    id: 4,
    category: 'Teaching Approach',
    question: 'Siswa belum paham meski sudah dua kali Anda jelaskan dengan cara sama. Langkah terbaik:',
    options: [
      { value: 'a', text: 'Mengulang lebih keras dan lebih lambat' },
      { value: 'b', text: 'Mencoba pendekatan/analogi berbeda yang disesuaikan dengan gaya belajarnya' },
      { value: 'c', text: 'Memberi banyak soal agar ia hafal pola' },
      { value: 'd', text: 'Menyuruhnya bertanya pada teman' },
    ],
  },
  {
    id: 5,
    category: 'Growth Mindset',
    question: 'Siswa bilang "saya memang payah di matematika." Respons Anda:',
    options: [
      { value: 'a', text: 'Menggantinya ke pelajaran yang ia kuasai' },
      { value: 'b', text: 'Menormalkan kesulitan dan menjelaskan bahwa kemampuan bisa dilatih bertahap' },
      { value: 'c', text: 'Diam saja agar tidak mempermalukannya' },
      { value: 'd', text: 'Mengatakan sebagian orang memang kurang berbakat' },
    ],
  },
  {
    id: 6,
    category: 'Inclusive Teaching',
    question: 'Seorang siswa dengan kesulitan belajar baru bergabung. Pendekatan Anda:',
    options: [
      { value: 'a', text: 'Memberi materi sama dan berharap ia mengejar' },
      { value: 'b', text: 'Menyesuaikan kecepatan & cara penjelasan untuk mendukungnya tanpa menurunkan harapan' },
      { value: 'c', text: 'Menetapkan standar lebih rendah tanpa dukungan' },
      { value: 'd', text: 'Menyarankan orang tua mencari tutor lain yang lebih khusus' },
    ],
  },
  {
    id: 7,
    category: 'Professional Conduct',
    question: 'Orang tua meminta Anda mengerjakan PR anak sepenuhnya. Keputusan Anda:',
    options: [
      { value: 'a', text: 'Menerima karena takut kehilangan klien' },
      { value: 'b', text: 'Menolak dengan sopan dan menjelaskan pentingnya anak memahami sendiri' },
      { value: 'c', text: 'Mengerjakan sebagian agar cepat selesai' },
      { value: 'd', text: 'Meminta tambahan bayaran untuk itu' },
    ],
  },
  {
    id: 8,
    category: 'Communication',
    question: 'Saat menjelaskan konsep sulit, bahasa yang paling tepat digunakan tutor:',
    options: [
      { value: 'a', text: 'Istilah teknis agar terlihat kompeten' },
      { value: 'b', text: 'Bahasa sederhana yang dipahami siswa, lalu hubungkan dengan istilah resminya' },
      { value: 'c', text: 'Banyak singkatan supaya cepat' },
      { value: 'd', text: 'Berbicara cepat agar materi habis' },
    ],
  },
]

export default function PsychologyTestPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<PresentedPsychologyQuestion[]>([])
  const [loaderText, setLoaderText] = useState('Mempersiapkan soal psikologi...')
  const [failed, setFailed] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ServerResult | null>(null)
  const [stage, setStage] = useState<'loading' | 'ready' | 'done'>('loading')

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const answeredCount = Object.keys(answers).length

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/ai/psychology-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 15 }),
        })
        const data = await res.json()
        if (cancelled) return
        const qs = Array.isArray(data?.questions)
          ? (data.questions as PresentedPsychologyQuestion[]).slice(0, 15)
          : []
        setQuestions(qs.length >= 5 ? qs : FALLBACK_QUESTIONS)
        setLoaderText(qs.length ? '' : 'Soal AI belum siap — memakai soal cadangan.')
        setStage('ready')
      } catch {
        if (!cancelled) {
          setQuestions(FALLBACK_QUESTIONS)
          setLoaderText('')
          setStage('ready')
        }
      }
    }
    load()
    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/assessments/psychology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, questions }),
      })
      const data = await res.json()
      if (!res.ok && !data.passed) throw new Error(data?.error || 'Gagal menilai')
      setResult({
        score: Math.round(Number(data.score) || 0),
        passed: !!data.passed,
        dimensions: Array.isArray(data.dimensions) ? data.dimensions : [],
        summary: data.summary,
      })
      setStage('done')
    } catch (e) {
      setFailed(true)
      alert(e instanceof Error ? e.message : 'Gagal menilai jawaban psikologi.')
    } finally {
      setSubmitting(false)
    }
  }, [answers, questions])

  // ---- RENDER -------------------------------------------------------

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-muted-foreground">{loaderText}</p>
        </div>
      </div>
    )
  }

  if (stage === 'done' && result) {
    const pass = result.passed
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Hasil Tes Psikologi</h2>
          <div className="my-6">
            <div className="text-6xl font-bold text-primary mb-4">{result.score}</div>
            <p className="text-xl text-muted-foreground mb-4">Skor Anda dari 100</p>
            {pass ? (
              <Alert className="bg-green-50 border-green-200 mb-4">
                <AlertDescription className="text-green-800">
                  Selamat! Anda lulus tes psikologi.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-yellow-50 border-yellow-200 mb-4">
                <AlertDescription className="text-yellow-800">
                  Skor Anda belum memenuhi standar minimum (70). Silakan coba lagi.
                </AlertDescription>
              </Alert>
            )}
          </div>
          {result.dimensions.length > 0 && (
            <div className="text-left mx-auto max-w-md mb-6 space-y-2">
              <p className="font-semibold text-foreground">Rincian atribut mengajar:</p>
              {result.dimensions.map((d) => (
                <div key={d.dimension} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-medium">{d.score}</span>
                  </div>
                  {d.justification && (
                    <p className="text-xs text-muted-foreground italic">{d.justification}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {result.summary && (
            <p className="text-sm text-muted-foreground italic mb-4">{result.summary}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {pass ? (
              <Button className="bg-primary hover:bg-primary/90" onClick={() => router.push('/curation/academic-test')}>
                Lanjut ke Kemampuan Akademik →
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => router.push('/curation/progress')}>
              Lihat Progres
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (failed && !result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h2 className="text-xl font-bold mb-4">Terjadi kesalahan</h2>
          <Button onClick={() => router.push('/curation/progress')} variant="outline">
            Kembali ke Progres
          </Button>
        </Card>
      </div>
    )
  }

  const question = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-foreground">Tes Psikologi Tutor</h1>
            <span className="text-sm text-muted-foreground">Terjawab {answeredCount}/{questions.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Situasi {currentIndex + 1} dari {questions.length}
          </p>
        </div>

        <Card className="p-8 mb-8">
          <div className="mb-4">
            <Badge variant="outline" className="bg-primary/10 text-primary">{question.category}</Badge>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-6">{question.question}</h2>
          <RadioGroup
            value={answers[question.id] || ''}
            onValueChange={(v) => setAnswers((prev) => ({ ...prev, [question.id]: v }))}
          >
            <div className="space-y-3">
              {question.options.map((o) => (
                <div key={o.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={o.value} id={`${question.id}-${o.value}`} className="mt-1" />
                  <Label htmlFor={`${question.id}-${o.value}`} className="cursor-pointer">{o.text}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </Card>

        <div className="flex justify-between gap-4">
          <Button onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0} variant="outline">
            Sebelumnya
          </Button>
          {currentIndex === questions.length - 1 ? (
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90" disabled={submitting}>
              {submitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Selesai & Submit
            </Button>
          ) : (
            <Button onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))} className="bg-primary hover:bg-primary/90">
              Selanjutnya
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
