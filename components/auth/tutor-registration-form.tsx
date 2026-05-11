'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { registerUser, createClient } from '@/lib/auth'

const SPECIALIZATIONS = [
  'Matematika',
  'Bahasa Inggris',
  'Bahasa Indonesia',
  'Sains',
  'Sejarah',
  'Geografi',
  'IPA',
  'IPS',
  'Pemrograman',
  'Desain Grafis',
  'Musik',
  'Olahraga',
]

export default function TutorRegistrationForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    specializations: [] as string[],
    qualifications: '',
    experienceYears: '0',
    hourlyRate: '',
    educationBackground: '',
    whyTeach: '',
    tutorReferences: '',
    agreeTerms: false,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSpecializationToggle = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec],
    }))
  }

  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    setFormData(prev => ({ ...prev, agreeTerms: checked === true }))
  }

  const validateStep1 = () => {
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Semua field wajib diisi')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter')
      return false
    }
    setError(null)
    return true
  }

  const validateStep2 = () => {
    if (formData.specializations.length === 0 || !formData.experienceYears || !formData.hourlyRate) {
      setError('Isi semua field yang diperlukan')
      return false
    }
    if (!formData.educationBackground || !formData.whyTeach) {
      setError('Jelaskan latar belakang pendidikan dan alasan Anda mengajar')
      return false
    }
    if (!formData.agreeTerms) {
      setError('Anda harus setuju dengan syarat dan ketentuan')
      return false
    }
    setError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (step === 1) {
      if (validateStep1()) {
        setStep(2)
      }
      return
    }

    if (!validateStep2()) {
      return
    }

    setLoading(true)
    try {
      // Register user
      const user = await registerUser(
        formData.email,
        formData.password,
        formData.fullName,
        'tutor'
      )

      const supabase = createClient()

      // Create tutor record
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutors')
        .insert([
          {
            user_id: user.id,
            specializations: formData.specializations,
            qualifications: formData.qualifications,
            experience_years: parseInt(formData.experienceYears),
            hourly_rate: parseFloat(formData.hourlyRate),
            approval_status: 'pending',
          },
        ])
        .select()

      if (tutorError) {
        throw new Error(tutorError.message)
      }

      // Create tutor application for curation
      const { error: appError } = await supabase
        .from('tutor_applications')
        .insert([
          {
            tutor_id: tutorData[0].id,
            education_background: formData.educationBackground,
            why_teach: formData.whyTeach,
            tutor_references: formData.tutorReferences,
            status: 'pending',
          },
        ])

      if (appError) {
        throw new Error(appError.message)
      }

      // Update user profile with phone
      await supabase
        .from('user_profiles')
        .update({ phone: formData.phone })
        .eq('id', user.id)

      router.push('/login?message=pending_approval')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mendaftar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 1 ? (
        // Step 1: Basic Information
        <div className="space-y-4">
          <div>
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <Input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Masukkan nama lengkap"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Masukkan email"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="phone">Nomor Telepon</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="08xxxxxxxxxx"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Minimal 6 karakter"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Konfirmasi password"
              className="mt-1"
            />
          </div>
        </div>
      ) : (
        // Step 2: Professional Information
        <div className="space-y-4">
          <div>
            <Label>Spesialisasi Mata Pelajaran</Label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {SPECIALIZATIONS.map(spec => (
                <div key={spec} className="flex items-center space-x-2">
                  <Checkbox
                    id={spec}
                    checked={formData.specializations.includes(spec)}
                    onCheckedChange={() => handleSpecializationToggle(spec)}
                  />
                  <Label htmlFor={spec} className="font-normal cursor-pointer">
                    {spec}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="experienceYears">Pengalaman Mengajar (Tahun)</Label>
              <Input
                id="experienceYears"
                name="experienceYears"
                type="number"
                min="0"
                value={formData.experienceYears}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="hourlyRate">Tarif Per Jam (Rp)</Label>
              <Input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                min="0"
                step="1000"
                value={formData.hourlyRate}
                onChange={handleInputChange}
                placeholder="50000"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="qualifications">Sertifikasi/Kualifikasi (Opsional)</Label>
            <textarea
              id="qualifications"
              name="qualifications"
              value={formData.qualifications}
              onChange={handleInputChange}
              placeholder="Sebutkan sertifikat atau kualifikasi Anda"
              className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="educationBackground">Latar Belakang Pendidikan</Label>
            <textarea
              id="educationBackground"
              name="educationBackground"
              value={formData.educationBackground}
              onChange={handleInputChange}
              placeholder="Jelaskan pendidikan dan gelar Anda"
              className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="whyTeach">Mengapa Anda Ingin Mengajar?</Label>
            <textarea
              id="whyTeach"
              name="whyTeach"
              value={formData.whyTeach}
              onChange={handleInputChange}
              placeholder="Ceritakan motivasi Anda mengajar"
              className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="tutorReferences">Referensi (Opsional)</Label>
            <textarea
              id="tutorReferences"
              name="tutorReferences"
              value={formData.tutorReferences}
              onChange={handleInputChange}
              placeholder="Sebutkan referensi atau pengalaman mengajar sebelumnya"
              className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm"
              rows={3}
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={formData.agreeTerms}
              onCheckedChange={handleCheckboxChange}
            />
            <Label htmlFor="terms" className="font-normal cursor-pointer text-sm">
              Saya setuju dengan syarat dan ketentuan serta kebijakan privasi EduStory, dan memahami bahwa profil saya akan diverifikasi oleh tim kami
            </Label>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {step === 2 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(1)}
            className="flex-1"
          >
            Kembali
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1 bg-primary hover:bg-primary/90"
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Loading...
            </>
          ) : step === 1 ? (
            'Lanjutkan'
          ) : (
            'Daftar Sekarang'
          )}
        </Button>
      </div>
    </form>
  )
}
