'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'

/**
 * Handwriting & Explanation — TEXT-based, AI-graded.
 *
 * Shows two problems; the candidate writes their worked answer + a teaching
 * explanation in words (how they would explain it to a student). An independent
 * AI grader checks mathematical accuracy and explanation quality and returns a
 * transparent server-side 0–100 score.
 */

const HANDWRITING_PROBLEMS = [
  {
    id: 1,
    title: 'Soal 1 — Matematika',
    problem:
      'Sebuah kolam renang berbentuk balok dengan panjang 25 m, lebar 10 m, dan kedalaman 2 m. Jika kolam terisi 3/4 penuh, berapakah volume air di dalam kolam tersebut? (dalam m³)',
    hint: 'Tuliskan rumus, langkah-langkah penyelesaian, dan jawaban akhir yang jelas.',
  },
  {
    id: 2,
    title: 'Soal 2 — Penalaran & Penjelasan',
    problem:
      'Jelaskan dengan kata-kata dan ilustrasi (verbal/diagram) mengapa 0,5 = 1/2 = 50%. Tunjukkan setidaknya 2 cara berbeda yang mudah dipahami siswa SD kelas 5.',
    hint: 'Gunakan contoh nyata dari kehidupan sehari-hari atau analogi.',
  },
]

type Result = {
  score: number
  passed: boolean
  dims?: { p1Accuracy: number; p1Expl: number; p2Accuracy: number; p2Expl: number }
  summary?: string
}

export default function HandwritingPage() {
  const router = useRouter()
  const [answers, setAnswers] = useState<{ one: string; two: string }>({ one: '', two: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const valid = answers.one.trim().length >= 50 && answers.two.trim().length >= 50

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) {
      setError('Tulis jawaban/penjelasan tiap soal minimal 50 karakter.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/assessments/handwriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem1_answer: answers.one, problem2_answer: answers.two }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal menilai jawaban')
      setResult({
        score: Math.round(Number(data.score) || 0),
        passed: !!data.passed,
        dims: data.dimensions,
        summary: data.summary,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-2xl p-8 text-center">
          <div className="text-6xl mb-4">✍️</div>
          <h2 className="text-3xl font-bold mb-2">Hasil Tes Penjelasan</h2>
          <div className="my-6">
            <div className="text-6xl font-bold text-primary mb-4">{result.score}</div>
            <p className="text-xl text-muted-foreground mb-6">Skor Anda dari 100</p>
            {result.passed ? (
              <Alert className="bg-green-50 border-green-200 mb-6">
                <AlertDescription className="text-green-800">
                  Bagus! Jawaban dan cara menjelaskan Anda dinilai memenuhi standar. Lanjut ke AI Interview.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-yellow-50 border-yellow-200 mb-6">
                <AlertDescription className="text-yellow-800">
                  Skor belum memenuhi standar minimum (70). Silakan perbaiki lalu coba lagi.
                </AlertDescription>
              </Alert>
            )}
          </div>
          {result.summary && (
            <p className="text-sm text-muted-foreground italic mb-6">{result.summary}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="bg-primary hover:bg-primary/90" onClick={() => router.push('/curation/progress')}>
              Lihat Progres
            </Button>
            <Button variant="outline" onClick={() => { setResult(null); setAnswers({ one: '', two: '' }) }}>
              Coba Lagi
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="outline" className="text-primary border-primary">Tahap 4 dari 5</Badge>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">✍️ Penjelasan & Logika</Badge>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Tes Penjelasan & Logika</h1>
          <p className="text-muted-foreground">
            Kerjakan soal di bawah <strong>secara tertulis</strong> (cara penyelesaian + cara Anda
            menjelaskannya kepada siswa). AI menilai ketepatan dan kejelasan Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {HANDWRITING_PROBLEMS.map((problem, idx) => {
            const key = idx === 0 ? 'one' : 'two'
            return (
              <Card key={problem.id} className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-2">{problem.title}</h2>
                <div className="bg-muted/50 rounded-lg p-4 mb-4 whitespace-pre-line text-sm text-foreground border border-border">
                  {problem.problem}
                </div>
                <p className="text-xs text-muted-foreground italic mb-4">💡 Petunjuk: {problem.hint}</p>
                <Label className="text-base font-semibold mb-2 block">
                  Jawaban &amp; cara menjelaskan *
                </Label>
                <Textarea
                  value={answers[key]}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="Tuliskan langkah penyelesaian, jawaban akhir, DAN cara Anda menerangkan soal ini kepada siswa (analogi/contoh)."
                  className="min-h-40"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {answers[key].trim().length}/50 karakter minimum
                  {answers[key].trim().length >= 50 && <span className="text-green-300 ml-2">✓ Mencukupi</span>}
                </p>
              </Card>
            )
          })}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>Kembali</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 flex-1" disabled={loading || !valid}>
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Menilai dengan AI...
                </>
              ) : (
                'Submit & Nilai'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
