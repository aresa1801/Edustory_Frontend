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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  'Bahasa Indonesia: Analisis Puisi'
]

export default function MicroTeachingPage() {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string>('')
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setError('Video tidak boleh lebih dari 100MB')
        return
      }
      setVideoFile(file)
      setVideoPreview(URL.createObjectURL(file))
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!topic || !videoFile || !explanation) {
        setError('Semua field harus diisi')
        return
      }

      // Create FormData for video upload
      const formData = new FormData()
      formData.append('topic', topic)
      formData.append('video', videoFile)
      formData.append('explanation', explanation)
      formData.append('duration', videoFile.duration?.toString() || '0')

      const response = await fetch('/api/assessments/microteaching', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Gagal mengunggah video')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/curation/progress')
      }, 2000)
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
          <h2 className="text-3xl font-bold mb-4">Video Berhasil Diunggah</h2>
          <p className="text-lg text-muted-foreground mb-6">
            Tim kami akan meninjau video Anda dalam 24-48 jam. Terima kasih telah menunggu!
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
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Micro Teaching: Penjelasan Video
          </h1>
          <p className="text-muted-foreground">
            Rekam video penjelasan Anda mengajar tentang topik yang dipilih. Durasi ideal: 5-10 menit.
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic Selection */}
            <div>
              <Label htmlFor="topic" className="text-base font-semibold mb-2 block">
                Pilih Topik untuk Diajarkan *
              </Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger id="topic">
                  <SelectValue placeholder="Pilih topik..." />
                </SelectTrigger>
                <SelectContent>
                  {TEACHING_TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Video Upload */}
            <div>
              <Label htmlFor="video" className="text-base font-semibold mb-2 block">
                Upload Video Penjelasan *
              </Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-accent/5 transition">
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                />
                <label
                  htmlFor="video"
                  className="cursor-pointer block"
                >
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground mb-2">
                      Drag & drop video atau klik untuk browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Format: MP4, WebM, MOV (Maks 100MB)
                    </p>
                  </div>
                </label>
              </div>

              {videoPreview && (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">Preview:</p>
                  <video
                    src={videoPreview}
                    controls
                    className="w-full rounded-lg border border-border"
                    style={{ maxHeight: '300px' }}
                  />
                </div>
              )}
            </div>

            {/* Teaching Explanation */}
            <div>
              <Label htmlFor="explanation" className="text-base font-semibold mb-2 block">
                Penjelasan Metode Pengajaran Anda *
              </Label>
              <Textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Jelaskan pendekatan pengajaran Anda, strategi interaksi dengan siswa, penggunaan visual/media, dll..."
                className="min-h-40"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Minimal 100 karakter
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Kembali
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90"
                disabled={loading || !topic || !videoFile || !explanation}
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Mengunggah...
                  </>
                ) : (
                  'Submit Video'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
