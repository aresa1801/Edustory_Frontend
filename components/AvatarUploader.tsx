'use client'

import { useState, useRef } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/auth'
import { Camera } from 'lucide-react'

interface AvatarUploaderProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete: (url: string) => void
  userId: string
}

export function AvatarUploader({ isOpen, onClose, onUploadComplete, userId }: AvatarUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 60,
    height: 60,
    x: 20,
    y: 20,
  })
  const [croppedImage, setCroppedImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [step, setStep] = useState<'select' | 'crop'>('select')
  const imgRef = useRef<HTMLImageElement | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
      setStep('crop')
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = (crop: PixelCrop) => {
    if (!imgRef.current || !crop.width || !crop.height) return

    const canvas = document.createElement('canvas')
    const image = imgRef.current
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = crop.width * scaleX
    canvas.height = crop.height * scaleY

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        setCroppedImage(url)
      }
    }, 'image/jpeg', 0.9)
  }

  const handleUpload = async () => {
    if (!croppedImage) {
      console.warn('No cropped image')
      return
    }

    setUploading(true)
    console.log('🚀 Starting upload...')

    try {
      // 1. Fetch blob dari croppedImage
      console.log('📥 Fetching blob from:', croppedImage)
      const response = await fetch(croppedImage)
      if (!response.ok) {
        throw new Error(`Gagal fetch blob: ${response.status}`)
      }
      const blob = await response.blob()
      console.log('📦 Blob size:', blob.size, 'bytes')

      // 2. Upload ke Supabase Storage
      const supabase = createClient()
      const fileExt = 'jpg'
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      console.log('⬆️ Uploading to avatars bucket:', fileName)
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true })

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        throw new Error(`Upload error: ${uploadError.message}`)
      }
      console.log('✅ Upload successful:', uploadData)

      // 3. Dapatkan URL publik
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const avatarUrl = urlData.publicUrl
      console.log('🔗 Public URL:', avatarUrl)

      // 4. Update avatar_url di tabel tutors
      console.log('🔄 Updating tutors table...')
      const { error: updateError } = await supabase
        .from('tutors')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId)

      if (updateError) {
        console.error('❌ Update error:', updateError)
        throw new Error(`Update error: ${updateError.message}`)
      }
      console.log('✅ Update successful')

      // 5. Panggil callback sukses
      onUploadComplete(avatarUrl)
      onClose()
    } catch (error) {
      console.error('❌ Upload avatar error:', error)
      alert('Gagal upload foto: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setUploading(false)
      console.log('🏁 Upload process finished')
    }
  }

  const resetState = () => {
    setSelectedFile(null)
    setPreview(null)
    setCroppedImage(null)
    setStep('select')
    setCrop({ unit: '%', width: 60, height: 60, x: 20, y: 20 })
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {step === 'select' ? 'Pilih Foto Profil' : 'Crop Foto'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === 'select' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                <Camera className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Klik tombol di bawah untuk memilih gambar</p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="max-w-xs cursor-pointer"
              />
            </div>
          )}

          {step === 'crop' && preview && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={handleCropComplete}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={preview}
                    alt="Crop preview"
                    className="max-h-80 object-contain"
                  />
                </ReactCrop>
              </div>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setStep('select')}>
                  Pilih Ulang
                </Button>
                <Button onClick={handleUpload} disabled={uploading || !croppedImage}>
                  {uploading ? <Spinner className="h-4 w-4" /> : 'Simpan'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Batal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}