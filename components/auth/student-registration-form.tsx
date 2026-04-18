'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { registerUser } from '@/lib/auth'
import { createClient } from '@/lib/auth'

const GRADE_LEVELS = [
  'SD Kelas 1',
  'SD Kelas 2',
  'SD Kelas 3',
  'SD Kelas 4',
  'SD Kelas 5',
  'SD Kelas 6',
  'SMP Kelas 7',
  'SMP Kelas 8',
  'SMP Kelas 9',
  'SMA Kelas 10',
  'SMA Kelas 11',
  'SMA Kelas 12',
  'Mahasiswa',
]

const SUBJECTS = [
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

export default function StudentRegistrationForm() {
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
    gradeLevel: '',
    subjects: [] as string[],
    learningGoals: '',
    address: '',
    agreeTerms: false,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, gradeLevel: value }))
  }

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, agreeTerms: e.target.checked }))
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
    if (!formData.gradeLevel || formData.subjects.length === 0) {
      setError('Pilih tingkat kelas dan minimal satu mata pelajaran')
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
        'student'
      )

      // Create student record
      const supabase = createClient()
      const { error: studentError } = await supabase
        .from('students')
        .insert([
          {
            user_id: user.id,
            grade_level: formData.gradeLevel,
            subjects: formData.subjects,
            learning_goals: formData.learningGoals,
            address: formData.address,
          },
        ])

      if (studentError) {
        throw new Error(studentError.message)
      }

      // Update user profile with phone
      await supabase
        .from('user_profiles')
        .update({ phone: formData.phone })
        .eq('id', user.id)

      router.push('/login')
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
        // Step 2: Education Information
        <div className="space-y-4">
          <div>
            <Label htmlFor="gradeLevel">Tingkat Kelas</Label>
            <Select value={formData.gradeLevel} onValueChange={handleSelectChange}>
              <SelectTrigger id="gradeLevel" className="mt-1">
                <SelectValue placeholder="Pilih tingkat kelas" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_LEVELS.map(level => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mata Pelajaran yang Ingin Dipelajari</Label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {SUBJECTS.map(subject => (
                <div key={subject} className="flex items-center space-x-2">
                  <Checkbox
                    id={subject}
                    checked={formData.subjects.includes(subject)}
                    onCheckedChange={() => handleSubjectToggle(subject)}
                  />
                  <Label htmlFor={subject} className="font-normal cursor-pointer">
                    {subject}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="learningGoals">Tujuan Belajar (Opsional)</Label>
            <textarea
              id="learningGoals"
              name="learningGoals"
              value={formData.learningGoals}
              onChange={handleInputChange}
              placeholder="Ceritakan tujuan belajar Anda"
              className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="address">Alamat (Opsional)</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Masukkan alamat Anda"
              className="mt-1"
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={formData.agreeTerms}
              onCheckedChange={handleCheckboxChange}
            />
            <Label htmlFor="terms" className="font-normal cursor-pointer text-sm">
              Saya setuju dengan syarat dan ketentuan serta kebijakan privasi EduStory
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
