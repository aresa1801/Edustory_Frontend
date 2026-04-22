'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface InterviewQuestion {
  id: number
  category: string
  question: string
  keywords: string[]
  minWords: number
}

const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 1,
    category: 'Motivasi Mengajar',
    question:
      'Ceritakan mengapa Anda memilih menjadi tutor dan apa yang membuat Anda bersemangat dalam mengajar?',
    keywords: ['siswa', 'belajar', 'mengajar', 'ilmu', 'motivasi', 'passion', 'pendidikan'],
    minWords: 50,
  },
  {
    id: 2,
    category: 'Strategi Pembelajaran',
    question:
      'Bagaimana cara Anda menjelaskan konsep yang sulit kepada siswa yang mengalami kesulitan memahami materi?',
    keywords: ['analogi', 'contoh', 'visual', 'langkah', 'sabar', 'sederhana', 'cara lain'],
    minWords: 60,
  },
  {
    id: 3,
    category: 'Manajemen Kelas',
    question:
      'Apa yang Anda lakukan ketika siswa tampak bosan atau tidak termotivasi selama sesi pembelajaran?',
    keywords: ['interaktif', 'variasi', 'permainan', 'istirahat', 'motivasi', 'tanya', 'cerita'],
    minWords: 50,
  },
  {
    id: 4,
    category: 'Penanganan Masalah',
    question:
      'Bagaimana Anda menangani situasi di mana seorang siswa merasa minder karena nilai akademiknya rendah?',
    keywords: ['empati', 'dorongan', 'positif', 'progress', 'kecil', 'percaya', 'usaha'],
    minWords: 60,
  },
  {
    id: 5,
    category: 'Persiapan Mengajar',
    question:
      'Jelaskan bagaimana proses persiapan Anda sebelum sesi mengajar berlangsung.',
    keywords: ['materi', 'RPP', 'silabus', 'latihan', 'soal', 'contoh', 'media', 'rencana'],
    minWords: 50,
  },
  {
    id: 6,
    category: 'Evaluasi Pembelajaran',
    question:
      'Bagaimana Anda mengetahui bahwa siswa benar-benar memahami materi yang telah diajarkan?',
    keywords: ['evaluasi', 'tes', 'pertanyaan', 'diskusi', 'latihan', 'feedback', 'ulang'],
    minWords: 50,
  },
  {
    id: 7,
    category: 'Komunikasi dengan Orang Tua',
    question:
      'Bagaimana Anda berkomunikasi dengan orang tua siswa mengenai perkembangan akademik anak mereka?',
    keywords: ['laporan', 'update', 'progress', 'komunikasi', 'transparan', 'jelas', 'rutin'],
    minWords: 50,
  },
  {
    id: 8,
    category: 'Pengembangan Diri',
    question:
      'Apa yang Anda lakukan untuk terus meningkatkan kemampuan mengajar dan pengetahuan akademik Anda?',
    keywords: ['belajar', 'kursus', 'buku', 'seminar', 'refleksi', 'feedback', 'pelatihan'],
    minWords: 50,
  },
  {
    id: 9,
    category: 'Etika Profesional',
    question:
      'Bagaimana sikap Anda jika siswa bertanya tentang topik yang di luar pengetahuan atau kompetensi Anda?',
    keywords: ['jujur', 'tidak tahu', 'cari', 'referensi', 'sumber', 'bersama', 'transparan'],
    minWords: 40,
  },
  {
    id: 10,
    category: 'Visi sebagai Tutor',
    question:
      'Apa tujuan jangka panjang Anda sebagai seorang tutor dan dampak apa yang ingin Anda berikan kepada siswa-siswa Anda?',
    keywords: ['tujuan', 'dampak', 'masa depan', 'potensi', 'karakter', 'mandiri', 'prestasi'],
    minWords: 60,
  },
]

function scoreResponse(response: string, question: InterviewQuestion): number {
  if (!response || response.trim().length === 0) return 0

  const words = response.trim().split(/\s+/).length
  const wordScore = Math.min(40, (words / question.minWords) * 40)

  const lowerResponse = response.toLowerCase()
  const matchedKeywords = question.keywords.filter(kw =>
    lowerResponse.includes(kw.toLowerCase())
  )
  const keywordScore = Math.min(60, (matchedKeywords.length / question.keywords.length) * 60)

  return Math.round(wordScore + keywordScore)
}

type SubmitResult = { score: number; passed: boolean; strengths?: string[]; improvements?: string[] }

export default function InterviewPage() {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(40 * 60)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(Date.now())
  // Keep a stable ref to handleSubmit so the interval doesn't capture a stale closure
  const handleSubmitRef = useRef<() => void>(() => {})

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmitRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleResponseChange = (value: string) => {
    const qId = INTERVIEW_QUESTIONS[currentQuestion].id
    setResponses(prev => ({ ...prev, [qId]: value }))
  }

  const handleNext = () => {
    if (currentQuestion < INTERVIEW_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const calculateOverallScore = () => {
    let total = 0
    INTERVIEW_QUESTIONS.forEach(q => {
      total += scoreResponse(responses[q.id] || '', q)
    })
    return Math.round(total / INTERVIEW_QUESTIONS.length)
  }

  const handleSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setLoading(true)
    setError(null)

    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000)

    // Attempt AI scoring; fall back to keyword-based scoring on error
    let overallScore = calculateOverallScore()
    let strengths: string[] | undefined
    let improvements: string[] | undefined

    try {
      const aiRes = await fetch('/api/ai/score-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses,
          questions: INTERVIEW_QUESTIONS.map(q => ({
            id: q.id,
            category: q.category,
            question: q.question,
          })),
        }),
      })
      if (aiRes.ok) {
        const aiData = await aiRes.json()
        if (typeof aiData.overallScore === 'number') {
          overallScore = aiData.overallScore
          strengths = aiData.strengths
          improvements = aiData.improvements
        }
      }
    } catch {
      // Keep keyword-based fallback score
    }

    try {
      const res = await fetch('/api/assessments/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, overallScore, timeTaken }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error || 'Gagal menyimpan hasil interview')
      }

      setResult({ score: overallScore, passed: overallScore >= 70, strengths, improvements })
      setSubmitted(true)

      setTimeout(() => router.push('/curation/progress'), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  // Keep the ref in sync so the timer always calls the latest version
  handleSubmitRef.current = handleSubmit

  const question = INTERVIEW_QUESTIONS[currentQuestion]
  const currentResponse = responses[question.id] || ''
  const wordCount = currentResponse.trim() ? currentResponse.trim().split(/\s+/).length : 0
  const answeredCount = INTERVIEW_QUESTIONS.filter(q => (responses[q.id] || '').trim().length > 0).length
  const overallProgress = ((currentQuestion + 1) / INTERVIEW_QUESTIONS.length) * 100
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-2xl p-8 text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-3xl font-bold mb-2">AI Interview Selesai!</h2>
          <p className="text-muted-foreground mb-8">
            Anda telah menyelesaikan semua tahapan kurasi.
          </p>
          <div className="text-7xl font-bold text-primary mb-4">{result.score}</div>
          <p className="text-xl text-muted-foreground mb-8">Skor Interview Anda dari 100</p>

          {result.passed ? (
            <Alert className="bg-green-50 border-green-200 mb-6">
              <AlertDescription className="text-green-800">
                🎉 <strong>Selamat!</strong> Anda telah menyelesaikan semua 5 tahap kurasi dengan
                skor yang memenuhi syarat. Tim kami akan meninjau dan mengumumkan hasilnya dalam
                3-5 hari kerja.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-yellow-50 border-yellow-200 mb-6">
              <AlertDescription className="text-yellow-800">
                Anda telah menyelesaikan semua tahapan kurasi. Skor interview belum memenuhi
                standar minimum (70). Tim admin akan mengevaluasi aplikasi Anda secara menyeluruh.
              </AlertDescription>
            </Alert>
          )}

          {result.strengths && result.strengths.length > 0 && (
            <div className="text-left mb-4">
              <p className="font-semibold text-green-700 mb-2">✅ Kekuatan Anda:</p>
              <ul className="space-y-1 text-sm text-green-800">
                {result.strengths.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.improvements && result.improvements.length > 0 && (
            <div className="text-left mb-6">
              <p className="font-semibold text-amber-700 mb-2">📈 Area Pengembangan:</p>
              <ul className="space-y-1 text-sm text-amber-800">
                {result.improvements.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          )}

          <Spinner className="mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">
            Mengalihkan ke halaman progress...
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-primary border-primary">
                Tahap 5 dari 5
              </Badge>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">💬 AI Interview</Badge>
            </div>
            <div
              className={`text-2xl font-bold font-mono ${
                timeRemaining < 300 ? 'text-red-600 animate-pulse' : 'text-primary'
              }`}
            >
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">AI Interview Tutor</h1>
          <p className="text-muted-foreground">
            Jawab 10 pertanyaan wawancara untuk mengevaluasi kesiapan Anda sebagai tutor.
            Jawab dengan jelas, jujur, dan komprehensif.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Pertanyaan {currentQuestion + 1} dari {INTERVIEW_QUESTIONS.length}</span>
            <span>{answeredCount}/{INTERVIEW_QUESTIONS.length} sudah dijawab</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="p-8 mb-6">
          <div className="mb-4">
            <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
              {question.category}
            </span>
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-6 leading-relaxed">
            {question.question}
          </h2>

          <Textarea
            value={currentResponse}
            onChange={e => handleResponseChange(e.target.value)}
            placeholder="Ketik jawaban Anda di sini..."
            className="min-h-48 text-base"
          />

          <div className="flex justify-between items-center mt-2">
            <p className="text-sm text-muted-foreground">
              {wordCount} kata
              {wordCount < question.minWords && (
                <span className="text-amber-600 ml-2">
                  (direkomendasikan ≥ {question.minWords} kata)
                </span>
              )}
              {wordCount >= question.minWords && (
                <span className="text-green-600 ml-2">✓</span>
              )}
            </p>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between gap-4 mb-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            ← Sebelumnya
          </Button>

          <div className="flex gap-2 flex-wrap justify-center">
            {INTERVIEW_QUESTIONS.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(idx)}
                className={`w-9 h-9 rounded-full text-sm font-bold transition-all border-2 ${
                  idx === currentQuestion
                    ? 'bg-primary text-white border-primary'
                    : (responses[q.id] || '').trim().length > 0
                    ? 'bg-green-100 text-green-700 border-green-400'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {currentQuestion < INTERVIEW_QUESTIONS.length - 1 ? (
            <Button onClick={handleNext} className="bg-primary hover:bg-primary/90">
              Selanjutnya →
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Selesaikan Interview
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Info */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">
            <ul className="space-y-1 text-sm">
              <li>💡 Tidak ada jawaban yang benar atau salah — evaluasi berdasarkan kualitas dan kedalaman jawaban Anda.</li>
              <li>⏰ Waktu tersisa ditampilkan di kanan atas. Interview akan otomatis terkirim saat waktu habis.</li>
              <li>🔢 Anda dapat berpindah antar pertanyaan menggunakan tombol nomor di atas.</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
