'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'

// Static fallback questions — used when AI generation is unavailable
const PSYCHOLOGY_QUESTIONS = [
  {
    id: 1,
    question: "Ketika siswa tidak memahami penjelasan Anda untuk ketiga kalinya, Anda akan:",
    options: [
      { value: 'a', text: "Mengulang dengan suara lebih keras" },
      { value: 'b', text: "Mencari cara penjelasan yang berbeda" },
      { value: 'c', text: "Memberikan latihan soal tambahan" },
      { value: 'd', text: "Menyarankan siswa untuk belajar lebih giat" }
    ],
    correctAnswer: 'b',
    category: 'Teaching Approach'
  },
  {
    id: 2,
    question: "Bagaimana Anda merespons siswa yang sering terlambat?",
    options: [
      { value: 'a', text: "Memberikan teguran keras" },
      { value: 'b', text: "Mencari tahu alasan di balik keterlambatan" },
      { value: 'c', text: "Mengabaikan karena bukan urusan Anda" },
      { value: 'd', text: "Melaporkan ke orang tua/siswa" }
    ],
    correctAnswer: 'b',
    category: 'Student Management'
  },
  {
    id: 3,
    question: "Seorang siswa menunjukkan tanda-tanda kecemasan tinggi. Respons pertama Anda adalah:",
    options: [
      { value: 'a', text: "Mengabaikan karena fokus di akademik" },
      { value: 'b', text: "Mendiskusikan dengan siswa untuk memahami masalahnya" },
      { value: 'c', text: "Memberikan lebih banyak soal latihan" },
      { value: 'd', text: "Menyarankan siswa berkonsultasi dengan psikolog" }
    ],
    correctAnswer: 'b',
    category: 'Emotional Intelligence'
  },
  {
    id: 4,
    question: "Ketika siswa bertanya tentang topik di luar kompetensi Anda, Anda akan:",
    options: [
      { value: 'a', text: "Menjawab meskipun tidak yakin" },
      { value: 'b', text: "Jujur bahwa itu bukan keahlian Anda dan mencari sumber bersama" },
      { value: 'c', text: "Mengatakan itu tidak penting untuk belajar" },
      { value: 'd', text: "Mengubah topik" }
    ],
    correctAnswer: 'b',
    category: 'Integrity'
  },
  {
    id: 5,
    question: "Bagaimana Anda membangun kepercayaan dengan siswa baru?",
    options: [
      { value: 'a', text: "Menunjukkan otoritas dan kontrol kelas yang ketat" },
      { value: 'b', text: "Mengenal mereka, mendengarkan kebutuhan, dan konsisten" },
      { value: 'c', text: "Memberikan banyak PR untuk menunjukkan Anda peduli" },
      { value: 'd', text: "Bersikap friendly tanpa batasan" }
    ],
    correctAnswer: 'b',
    category: 'Relationship Building'
  },
  {
    id: 6,
    question: "Siswa Anda mengatakan mereka 'bodoh' dalam matematika. Respons Anda:",
    options: [
      { value: 'a', text: "Setuju dan pindah ke mata pelajaran yang lebih mudah" },
      { value: 'b', text: "Tidak setuju dan jelaskan bahwa kecerdasan dapat dikembangkan" },
      { value: 'c', text: "Tidak mengomentari" },
      { value: 'd', text: "Katakan bahwa beberapa orang memang kurang berbakat" }
    ],
    correctAnswer: 'b',
    category: 'Growth Mindset'
  },
  {
    id: 7,
    question: "Bagaimana pendekatan Anda terhadap diferensiasi pembelajaran?",
    options: [
      { value: 'a', text: "Semua siswa harus belajar dengan cara yang sama" },
      { value: 'b', text: "Menyesuaikan strategi berdasarkan gaya belajar dan kemampuan siswa" },
      { value: 'c', text: "Hanya fokus pada siswa yang cepat belajar" },
      { value: 'd', text: "Memberikan pekerjaan rumah yang sama untuk semua" }
    ],
    correctAnswer: 'b',
    category: 'Pedagogical Knowledge'
  },
  {
    id: 8,
    question: "Anda menemukan bahwa strategi mengajar Anda tidak efektif untuk kelas. Apa yang Anda lakukan?",
    options: [
      { value: 'a', text: "Terus gunakan strategi yang sama karena itu yang saya kuasai" },
      { value: 'b', text: "Refleksi, minta feedback, dan coba pendekatan baru" },
      { value: 'c', text: "Menyalahkan siswa karena tidak fokus" },
      { value: 'd', text: "Mengurangi ekspektasi akademik" }
    ],
    correctAnswer: 'b',
    category: 'Continuous Improvement'
  },
  {
    id: 9,
    question: "Bagaimana Anda menangani siswa yang mengganggu kelas?",
    options: [
      { value: 'a', text: "Mengeluarkan dari kelas tanpa diskusi" },
      { value: 'b', text: "Memahami penyebab, membantu dengan empati, dan menetapkan batasan jelas" },
      { value: 'c', text: "Meningkatkan hukuman" },
      { value: 'd', text: "Mengabaikan" }
    ],
    correctAnswer: 'b',
    category: 'Classroom Management'
  },
  {
    id: 10,
    question: "Sikap Anda tentang feedback dari siswa atau orang tua:",
    options: [
      { value: 'a', text: "Menolak karena saya tahu yang terbaik" },
      { value: 'b', text: "Menerima dengan terbuka dan gunakan untuk meningkatkan pengajaran" },
      { value: 'c', text: "Menerima tetapi tidak mengubah apa pun" },
      { value: 'd', text: "Hanya menerima jika positif" }
    ],
    correctAnswer: 'b',
    category: 'Professional Growth'
  },
  {
    id: 11,
    question: "Bagaimana Anda memotivasi siswa yang kurang tertarik belajar?",
    options: [
      { value: 'a', text: "Memberikan nilai bagus tanpa usaha" },
      { value: 'b', text: "Menemukan koneksi dengan minat mereka dan memberikan tantangan yang sesuai" },
      { value: 'c', text: "Mengancam nilai jelek" },
      { value: 'd', text: "Membiarkan mereka tidak belajar" }
    ],
    correctAnswer: 'b',
    category: 'Motivation'
  },
  {
    id: 12,
    question: "Pendekatan Anda dalam mengevaluasi pembelajaran siswa:",
    options: [
      { value: 'a', text: "Hanya melalui tes tertulis" },
      { value: 'b', text: "Beragam metode untuk mengukur pemahaman dan kemajuan" },
      { value: 'c', text: "Hanya pekerjaan rumah" },
      { value: 'd', text: "Tanpa evaluasi formal" }
    ],
    correctAnswer: 'b',
    category: 'Assessment'
  },
  {
    id: 13,
    question: "Siswa membuat kesalahan dalam pemahaman konsep. Anda:",
    options: [
      { value: 'a', text: "Langsung memberikan jawaban yang benar" },
      { value: 'b', text: "Memandu mereka untuk menemukan kesalahan dan cara memperbaikinya" },
      { value: 'c', text: "Mengatakan 'Anda salah' tanpa penjelasan" },
      { value: 'd', text: "Memberikan nilai jelek dan melanjutkan" }
    ],
    correctAnswer: 'b',
    category: 'Guided Learning'
  },
  {
    id: 14,
    question: "Bagaimana Anda menangani siswa dengan kebutuhan khusus atau kesulitan belajar?",
    options: [
      { value: 'a', text: "Mengabaikan karena bukan tanggung jawab Anda" },
      { value: 'b', text: "Beradaptasi dan mencari strategi khusus untuk mendukung mereka" },
      { value: 'c', text: "Menyarankan mereka mencari tutor khusus" },
      { value: 'd', text: "Mengurangi standar akademik tanpa dukungan" }
    ],
    correctAnswer: 'b',
    category: 'Inclusive Teaching'
  },
  {
    id: 15,
    question: "Apa prioritas utama Anda sebagai seorang guru?",
    options: [
      { value: 'a', text: "Menyelesaikan kurikulum tepat waktu" },
      { value: 'b', text: "Memastikan siswa memahami dan tumbuh" },
      { value: 'c', text: "Mendapatkan nilai akademik tertinggi" },
      { value: 'd', text: "Menyelesaikan pekerjaan rumah saya" }
    ],
    correctAnswer: 'b',
    category: 'Values'
  }
]

type Question = typeof PSYCHOLOGY_QUESTIONS[0]

export default function PsychologyTestPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>(PSYCHOLOGY_QUESTIONS)
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(30 * 60)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  // Attempt to load AI-generated questions; fall back to static list on error
  useEffect(() => {
    let cancelled = false
    const loadAIQuestions = async () => {
      try {
        const res = await fetch('/api/ai/psychology-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 15 }),
        })
        if (!res.ok) throw new Error('AI questions unavailable')
        const data = await res.json()
        if (!cancelled && Array.isArray(data.questions) && data.questions.length >= 5) {
          setQuestions(data.questions)
        }
      } catch {
        // Keep static fallback questions
      } finally {
        if (!cancelled) setQuestionsLoading(false)
      }
    }
    loadAIQuestions()
    return () => { cancelled = true }
  }, [])

  const calculateScore = useCallback((qs: Question[], ans: Record<number, string>) => {
    let correct = 0
    qs.forEach((q) => {
      if (ans[q.id] === q.correctAnswer) correct++
    })
    return Math.round((correct / qs.length) * 100)
  }, [])

  const handleSubmit = useCallback(async (
    currentAnswers: Record<number, string>,
    currentQuestions: Question[],
    elapsed: number,
  ) => {
    setLoading(true)
    const finalScore = calculateScore(currentQuestions, currentAnswers)
    setScore(finalScore)
    setSubmitted(true)

    try {
      const response = await fetch('/api/assessments/psychology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: currentAnswers,
          score: finalScore,
          timeTaken: elapsed,
        }),
      })

      if (response.ok) {
        setTimeout(() => {
          router.push('/curation/progress')
        }, 2000)
      }
    } catch (error) {
      console.error('Error submitting psychology test:', error)
    } finally {
      setLoading(false)
    }
  }, [calculateScore, router])

  useEffect(() => {
    if (questionsLoading) return
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Use functional updates to capture latest state in the interval callback
          setAnswers((latestAnswers) => {
            setQuestions((latestQuestions) => {
              handleSubmit(latestAnswers, latestQuestions, 30 * 60)
              return latestQuestions
            })
            return latestAnswers
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [questionsLoading, handleSubmit])

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questions[currentQuestion].id]: value,
    }))
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleSubmitClick = () => {
    handleSubmit(answers, questions, 30 * 60 - timeRemaining)
  }

  if (questionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Mempersiapkan soal dengan AI...</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Hasil Tes Psikologi</h2>
          <div className="my-8">
            <div className="text-6xl font-bold text-primary mb-4">{score}</div>
            <p className="text-xl text-muted-foreground mb-6">
              Skor Anda dari 100
            </p>
            {score >= 70 ? (
              <Alert className="bg-green-50 border-green-200 mb-6">
                <AlertDescription className="text-green-800">
                  Selamat! Anda lulus tes psikologi. Mari lanjut ke bagian selanjutnya.
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
          {loading && <Spinner className="mx-auto" />}
        </Card>
      </div>
    )
  }

  const question = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-foreground">Tes Psikologi Tutor</h1>
            <div className="text-2xl font-bold text-primary">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Pertanyaan {currentQuestion + 1} dari {questions.length}
          </p>
        </div>

        <Card className="p-8 mb-8">
          <div className="mb-4">
            <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold mb-4">
              {question.category}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-6">
            {question.question}
          </h2>

          <RadioGroup
            value={answers[question.id] || ''}
            onValueChange={handleAnswerChange}
          >
            <div className="space-y-3">
              {question.options.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label
                    htmlFor={option.value}
                    className="cursor-pointer flex-1"
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </Card>

        <div className="flex justify-between gap-4">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            variant="outline"
          >
            Sebelumnya
          </Button>

          {currentQuestion === questions.length - 1 ? (
            <Button
              onClick={handleSubmitClick}
              className="bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Selesai & Submit
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-primary hover:bg-primary/90"
            >
              Selanjutnya
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
