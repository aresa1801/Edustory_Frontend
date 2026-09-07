'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/**
 * Micro Teaching — TEXT-based, AI-graded.
 *
 * Per product decision we do not require a video (which would need speech
 * transcription). The candidate demonstrates teaching by writing a short,
 * structured lesson on a chosen topic. An independent AI grader evaluates it on
 * pedagogy dimensions and returns an auditable 0–100 score server-side.
 */

const TEACHING_TOPICS = [
  'Aljabar Dasar (SMP)',
  'Persamaan Linear (SMP)',
  'Trigonometri (SMA)',
  'Kalkulus Dasar (SMA)',
  'Fisika: Hukum Newton',
  'Fisika: Energi dan Daya',
  'Kimia: Reaksi Kimia Dasar',
  'Biologi: Fotosintesis',
  'Inggris: Tense Grammar',
  'Bahasa Indonesia: Analisis Puisi',
]

type DimensionScore = { key: string; label: string; score: number }

export default function MicroTeachingPage() {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [lessonText, setLessonText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    score: number
    passed: boolean
    dimensions?: Record<string, number>
    aiSummary?: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic) {
      setError('Pilih topik terlebih dahulu.')
      return
    }
    if (lessonText.trim().length < 100) {
      setError('Tulis penjelasan mengajar Anda minimal 100 karakter.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/assessments/microteaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, lessonText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal menilai penjelasan')
      setResult({
        score: Math.round(Number(data.score) || 0),
        passed: !!data.passed,
        dimensions: data.dimensions,
        aiSummary: data.aiSummary,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  // Success screen
  if (result) {
    const dimLabel: Record<string, string> = {
      clarity: 'Kejelasan',
      structure: 'Struktur',
      engagement: 'Keterlibatan',
      correctness: 'Akurasi Materi',
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-2">Hasil Micro Teaching</h2>
          <p className="text-muted-foreground mb-6">Topik: {topic}</p>
          <div className="my-6">
            <div className="text-6xl font-bold text-primary mb-4">{result.score}</div>
            <p className="text-xl text-muted-foreground mb-6">Skor Anda dari 100</p>
            {result.passed ? (
              <Alert className="bg-green-50 border-green-200 mb-6">
                <AlertDescription className="text-green-800">
                  Bagus! Penjelasan mengajar Anda dinilai memenuhi standar. Mari lanjut ke tahap berikutnya.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-yellow-50 border-yellow-200 mb-6">
                <AlertDescription className="text-yellow-800">
                  Skor belum memenuhi standar minimum (70). Silakan perbaiki penjelasan lalu coba lagi.
                </AlertDescription>
              </Alert>
            )}
          </div>
          {result.dimensions && (
            <div className="text-left mx-auto max-w-md mb-6 space-y-1">
              {Object.entries(result.dimensions).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{dimLabel[k] || k}</span>
                  <span className="font-medium">{Math.round(v)}</span>
                </div>
              ))}
            </div>
          )}
          {result.aiSummary && (
            <p className="text-sm text-muted-foreground italic mb-6">{result.aiSummary}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="bg-primary hover:bg-primary/90" onClick={() => router.push('/curation/progress')}>
              Lihat Progres
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null)
                setLessonText('')
              }}
            >
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Micro Teaching</h1>
          <p className="text-muted-foreground max-w-3xl">
            Tuliskan bagaimana Anda akan <strong>menjelaskan</strong> topik berikut kepada seorang siswa,
            secara tertulis dan terstruktur. AI akan menilai kejelasan, struktur, keterlibatan, dan akurasi
            materi Anda. Usahakan 300+ karakter (kira-kira 4–8 kalimat).
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="topic" className="text-base font-semibold mb-2 block">
                Pilih Topik * 
              </Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger id="topic" className="w-full">
                  <SelectValue placeholder="Pilih topik..." />
                </SelectTrigger>
                <SelectContent>
                  {TEACHING_TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="explanation" className="text-base font-semibold mb-2 block">
                Penjelasan Mengajar Anda (Tertulis) *
              </Label>
              <Textarea
                id="explanation"
                value={lessonText}
                onChange={(e) => setLessonText(e.target.value)}
                placeholder={'Contoh struktur yang baik:\n1) Pembukaan: apa yang akan kita pelajari & mengapa penting.\n2) Inti: jelaskan konsep langkah demi langkah dengan contoh.\n3) Cek pemahaman: beri 1 pertanyaan singkat dan cara mengatasinya jika siswa bingung.'}
                className="min-h-56"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Minimal 100 karakter. Ikuti struktur pembukaan → inti → penutup untuk hasil terbaik.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Kembali
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90"
                disabled={loading || !topic || lessonText.trim().length < 100}
              >
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
        </Card>
      </div>
    </div>
  )
}
