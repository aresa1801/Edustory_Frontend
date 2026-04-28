'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'

const HANDWRITING_PROBLEMS = [
  {
    id: 1,
    title: 'Soal 1 — Matematika',
    problem: 'Selesaikan soal berikut dengan cara lengkap dan tulisan tangan yang jelas:\n\nSebuah kolam renang berbentuk balok dengan panjang 25 m, lebar 10 m, dan kedalaman 2 m. Jika kolam terisi 3/4 penuh, berapakah volume air di dalam kolam tersebut? (dalam m³)',
    hint: 'Tuliskan rumus, langkah-langkah penyelesaian, dan jawaban akhir dengan jelas.',
  },
  {
    id: 2,
    title: 'Soal 2 — Penalaran & Penjelasan',
    problem: 'Jelaskan dengan kata-kata dan diagram/ilustrasi mengapa 0,5 = 1/2 = 50%. Tunjukkan setidaknya 2 cara berbeda untuk membuktikan kesetaraan ini kepada siswa SD kelas 5.',
    hint: 'Gunakan gambar, diagram batang, atau contoh nyata dari kehidupan sehari-hari.',
  },
]

interface ProblemState {
  imageFile: File | null
  imagePreview: string
  explanation: string
}

export default function HandwritingPage() {
  const router = useRouter()
  const [problems, setProblems] = useState<ProblemState[]>(
    HANDWRITING_PROBLEMS.map(() => ({ imageFile: null, imagePreview: '', explanation: '' }))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran gambar tidak boleh lebih dari 10MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Hanya file gambar yang diperbolehkan (JPG, PNG, WEBP)')
      return
    }

    const preview = URL.createObjectURL(file)
    setProblems(prev =>
      prev.map((p, i) =>
        i === index ? { ...p, imageFile: file, imagePreview: preview } : p
      )
    )
    setError(null)
  }

  const handleExplanationChange = (index: number, value: string) => {
    setProblems(prev =>
      prev.map((p, i) => (i === index ? { ...p, explanation: value } : p))
    )
  }

  const isFormValid = () =>
    problems.every(p => p.imageFile !== null && p.explanation.trim().length >= 50)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid()) {
      setError('Unggah foto jawaban dan isi penjelasan (minimal 50 karakter) untuk setiap soal.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('problem1_image', problems[0].imageFile!)
      formData.append('problem1_explanation', problems[0].explanation)
      formData.append('problem2_image', problems[1].imageFile!)
      formData.append('problem2_explanation', problems[1].explanation)

      const response = await fetch('/api/assessments/handwriting', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Gagal mengirim jawaban')
      }

      setSuccess(true)
      setTimeout(() => router.push('/curation/progress'), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-2xl p-8 text-center">
          <div className="text-6xl mb-4">✍️</div>
          <h2 className="text-3xl font-bold mb-4">Jawaban Berhasil Dikirim</h2>
          <p className="text-lg text-muted-foreground mb-6">
            Tim kami akan meninjau tulisan tangan Anda. Lanjutkan ke tahap AI Interview!
          </p>
          <Spinner className="mx-auto" />
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="outline" className="text-primary border-primary">
              Tahap 4 dari 5
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">✍️ Tulisan Tangan</Badge>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Tes Tulisan Tangan & Penjelasan
          </h1>
          <p className="text-muted-foreground">
            Selesaikan soal-soal di bawah ini dengan tulisan tangan yang jelas. Foto jawaban Anda
            dan unggah bersama penjelasan metode pengajaran yang akan Anda gunakan.
          </p>
        </div>

        <Alert className="mb-8 bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">
            <ul className="space-y-1">
              <li>📷 Ambil foto jawaban tulisan tangan Anda dengan pencahayaan yang baik</li>
              <li>✏️ Pastikan tulisan jelas, rapi, dan mudah dibaca</li>
              <li>📝 Sertakan penjelasan cara Anda akan menerangkan soal ini ke siswa</li>
              <li>📁 Format gambar: JPG/PNG, maks. 10MB per gambar</li>
            </ul>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-8">
          {HANDWRITING_PROBLEMS.map((problem, index) => (
            <Card key={problem.id} className="p-8">
              <h2 className="text-xl font-bold text-foreground mb-2">{problem.title}</h2>

              <div className="bg-muted/50 rounded-lg p-4 mb-6 whitespace-pre-line text-sm text-foreground border border-border">
                {problem.problem}
              </div>

              <p className="text-xs text-muted-foreground italic mb-6">
                💡 Petunjuk: {problem.hint}
              </p>

              {/* Image Upload */}
              <div className="mb-6">
                <Label className="text-base font-semibold mb-2 block">
                  Foto Jawaban Tulisan Tangan *
                </Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    problems[index].imageFile
                      ? 'border-green-400 bg-green-50'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Input
                    id={`image-${index}`}
                    type="file"
                    accept="image/*"
                    onChange={e => handleImageChange(index, e)}
                    className="hidden"
                  />
                  <label htmlFor={`image-${index}`} className="cursor-pointer block">
                    {problems[index].imagePreview ? (
                      <img
                        src={problems[index].imagePreview}
                        alt={`Preview soal ${index + 1}`}
                        className="mx-auto max-h-64 rounded-lg object-contain border border-border"
                      />
                    ) : (
                      <div>
                        <p className="text-4xl mb-2">📷</p>
                        <p className="font-semibold text-foreground">Klik untuk unggah foto</p>
                        <p className="text-sm text-muted-foreground">JPG, PNG, WEBP • Maks 10MB</p>
                      </div>
                    )}
                  </label>
                  {problems[index].imageFile && (
                    <p className="text-sm text-green-300 mt-2 font-medium">
                      ✓ {problems[index].imageFile!.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <Label className="text-base font-semibold mb-2 block">
                  Penjelasan Metode Pengajaran *
                </Label>
                <Textarea
                  value={problems[index].explanation}
                  onChange={e => handleExplanationChange(index, e.target.value)}
                  placeholder="Bagaimana Anda akan menjelaskan soal dan solusi ini kepada siswa? Metode apa yang akan digunakan? Analogi apa yang membantu pemahaman siswa?"
                  className="min-h-32"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {problems[index].explanation.length}/50 karakter minimum
                  {problems[index].explanation.length >= 50 && (
                    <span className="text-green-300 ml-2">✓ Mencukupi</span>
                  )}
                </p>
              </div>
            </Card>
          ))}

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
              className="bg-primary hover:bg-primary/90 flex-1"
              disabled={loading || !isFormValid()}
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Mengirim...
                </>
              ) : (
                'Kirim Jawaban Tulisan Tangan'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
