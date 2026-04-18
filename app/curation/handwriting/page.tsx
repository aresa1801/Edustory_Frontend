'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'

const HANDWRITING_PROMPT = `Salin teks berikut dengan tulisan tangan Anda yang jelas dan rapi, lalu foto hasilnya:

"Pendidikan adalah investasi terbaik yang dapat kita berikan kepada generasi penerus bangsa. Seorang pengajar yang baik tidak hanya mentransfer pengetahuan, tetapi juga menginspirasi siswa untuk terus belajar dan berkembang. Dengan dedikasi, kesabaran, dan kreativitas, setiap anak dapat mencapai potensi terbaiknya."`

export default function HandwritingPage() {
  const router = useRouter()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('File harus berupa gambar (JPG, PNG, dll.)')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Ukuran gambar tidak boleh lebih dari 10MB')
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!imageFile) {
      setError('Harap unggah foto tulisan tangan Anda')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('notes', notes)
      formData.append('step', 'handwriting')

      const response = await fetch('/api/assessments/microteaching', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Gagal mengirim data')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/curation/progress')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-2xl p-8 text-center">
          <div className="text-6xl mb-6">✍️</div>
          <h2 className="text-3xl font-bold mb-4 text-foreground">Berhasil Dikirim!</h2>
          <p className="text-muted-foreground mb-6">
            Sampel tulisan tangan Anda telah berhasil dikirim. Admin akan meninjau dalam 1-2 hari kerja.
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
          <h1 className="text-4xl font-bold text-foreground mb-2">Penilaian Tulisan Tangan</h1>
          <p className="text-lg text-muted-foreground">
            Tahap 4 dari 5 — Kirimkan foto sampel tulisan tangan Anda
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Instructions */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">📋 Panduan</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>1. Salin teks berikut dengan tulisan tangan Anda di kertas putih bersih.</p>
              <p>2. Pastikan tulisan terbaca dengan jelas dan rapi.</p>
              <p>3. Foto hasilnya dengan pencahayaan yang cukup.</p>
              <p>4. Unggah foto tersebut di formulir ini.</p>
            </div>

            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold text-foreground mb-2">Teks yang harus disalin:</h3>
              <p className="text-sm text-foreground leading-relaxed italic">{HANDWRITING_PROMPT}</p>
            </div>

            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-1">Tips:</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>✓ Gunakan pulpen atau pena dengan tinta hitam/biru</li>
                <li>✓ Foto dalam kondisi cahaya yang baik</li>
                <li>✓ Pastikan seluruh tulisan terlihat dalam foto</li>
                <li>✓ Hindari foto yang buram atau terpotong</li>
              </ul>
            </div>
          </Card>

          {/* Upload Form */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">📤 Unggah Foto</h2>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="image" className="block mb-2 font-medium">
                  Foto Tulisan Tangan <span className="text-destructive">*</span>
                </Label>
                <div
                  className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => document.getElementById('image-input')?.click()}
                >
                  {imagePreview && imagePreview.startsWith('blob:') ? (
                    <img
                      src={imagePreview}
                      alt="Preview tulisan tangan"
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />
                  ) : (
                    <>
                      <div className="text-4xl mb-3">📷</div>
                      <p className="text-muted-foreground text-sm">
                        Klik untuk memilih gambar atau seret ke sini
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG, atau WEBP — maks. 10MB
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {imageFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    File dipilih: {imageFile.name}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="notes" className="block mb-2 font-medium">
                  Catatan Tambahan (opsional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Informasi tambahan jika ada..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !imageFile}
                className="w-full bg-primary hover:bg-primary/90 text-white h-12"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Mengirim...
                  </>
                ) : (
                  'Kirim Sampel Tulisan Tangan'
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
