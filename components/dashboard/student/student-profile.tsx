'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/auth'
import { User, BookOpen, MapPin, Settings } from 'lucide-react'

const GRADE_LEVELS = [
  'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
  'SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9',
  'SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12',
  'Mahasiswa', 'Umum',
]

const SUBJECTS = [
  'Matematika', 'Bahasa Inggris', 'Bahasa Indonesia', 'Sains', 'Fisika', 'Kimia', 'Biologi',
  'Sejarah', 'Geografi', 'IPA', 'IPS', 'Ekonomi', 'Pemrograman', 'Desain Grafis', 'Musik',
]

const SCHEDULE_OPTIONS = [
  'Senin – Jumat (Pagi)', 'Senin – Jumat (Siang)', 'Senin – Jumat (Sore)',
  'Sabtu – Minggu (Pagi)', 'Sabtu – Minggu (Siang)', 'Sabtu – Minggu (Sore)',
  'Fleksibel',
]

const CITIES = [
  'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Utara', 'Jakarta Pusat',
  'Bogor', 'Depok', 'Tangerang', 'Bekasi', 'Bandung', 'Surabaya', 'Medan',
  'Makassar', 'Semarang', 'Yogyakarta', 'Palembang', 'Lainnya',
]

export default function StudentProfile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // user_profiles fields
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    gender: '',
  })

  // students table fields
  const [studentData, setStudentData] = useState({
    id: '',
    grade_level: '',
    subjects: [] as string[],
    learning_goals: '',
    preferred_schedule: '',
    budget_per_month: '',
    address: '',
    city: '',
    status: '',
  })

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Anda harus login terlebih dahulu')
        return
      }

      const { data: up, error: upErr } = await supabase
        .from('user_profiles')
        .select('name, email, phone, bio, gender')
        .eq('id', user.id)
        .single()

      if (upErr) throw upErr

      setUserProfile({
        name: up?.name || '',
        email: up?.email || '',
        phone: up?.phone || '',
        bio: up?.bio || '',
        gender: up?.gender || '',
      })

      const { data: sd, error: sdErr } = await supabase
        .from('students')
        .select('id, grade_level, subjects, learning_goals, preferred_schedule, budget_per_month, address, city, status')
        .eq('user_id', user.id)
        .single()

      if (sdErr && sdErr.code !== 'PGRST116') throw sdErr

      if (sd) {
        setStudentData({
          id: sd.id || '',
          grade_level: sd.grade_level || '',
          subjects: sd.subjects || [],
          learning_goals: sd.learning_goals || '',
          preferred_schedule: sd.preferred_schedule || '',
          budget_per_month: sd.budget_per_month?.toString() || '',
          address: sd.address || '',
          city: sd.city || '',
          status: sd.status || '',
        })
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat profil')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSubjectToggle = (subject: string) => {
    setStudentData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }))
  }

  const handleSave = async () => {
    if (!userProfile.name.trim()) {
      setError('Nama lengkap tidak boleh kosong')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Anda harus login terlebih dahulu')

      // Update user_profiles
      const { error: upErr } = await supabase
        .from('user_profiles')
        .update({
          name: userProfile.name.trim(),
          phone: userProfile.phone.trim(),
          bio: userProfile.bio.trim(),
          gender: userProfile.gender || null,
        })
        .eq('id', user.id)

      if (upErr) throw upErr

      // Update students table
      if (studentData.id) {
        const { error: sdErr } = await supabase
          .from('students')
          .update({
            grade_level: studentData.grade_level || null,
            subjects: studentData.subjects,
            learning_goals: studentData.learning_goals.trim() || null,
            preferred_schedule: studentData.preferred_schedule || null,
            budget_per_month: studentData.budget_per_month ? Number(studentData.budget_per_month) : null,
            address: studentData.address.trim() || null,
            city: studentData.city || null,
          })
          .eq('id', studentData.id)

        if (sdErr) throw sdErr
      }

      setSuccess('Profil berhasil disimpan!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-700">✓ {success}</AlertDescription>
        </Alert>
      )}

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4" /> Informasi Pribadi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nama Lengkap *</Label>
              <Input
                id="name"
                value={userProfile.name}
                onChange={e => setUserProfile(p => ({ ...p, name: e.target.value }))}
                placeholder="Nama lengkap"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={userProfile.email}
                disabled
                className="mt-1 bg-muted/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                value={userProfile.phone}
                onChange={e => setUserProfile(p => ({ ...p, phone: e.target.value }))}
                placeholder="08xxxxxxxxxx"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="gender">Jenis Kelamin</Label>
              <Select value={userProfile.gender} onValueChange={v => setUserProfile(p => ({ ...p, gender: v }))}>
                <SelectTrigger id="gender" className="mt-1">
                  <SelectValue placeholder="Pilih jenis kelamin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="laki-laki">Laki-laki</SelectItem>
                  <SelectItem value="perempuan">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Tentang Saya</Label>
            <textarea
              id="bio"
              value={userProfile.bio}
              onChange={e => setUserProfile(p => ({ ...p, bio: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Ceritakan sedikit tentang diri Anda..."
            />
          </div>

          {studentData.status && (
            <div>
              <Label>Status Akun</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  studentData.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {studentData.status === 'active' ? '✓ Aktif' : studentData.status}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4" /> Informasi Pembelajaran
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gradeLevel">Tingkat Kelas</Label>
              <Select value={studentData.grade_level} onValueChange={v => setStudentData(p => ({ ...p, grade_level: v }))}>
                <SelectTrigger id="gradeLevel" className="mt-1">
                  <SelectValue placeholder="Pilih tingkat kelas" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="schedule">Jadwal Belajar Pilihan</Label>
              <Select value={studentData.preferred_schedule} onValueChange={v => setStudentData(p => ({ ...p, preferred_schedule: v }))}>
                <SelectTrigger id="schedule" className="mt-1">
                  <SelectValue placeholder="Pilih jadwal" />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Mata Pelajaran yang Ingin Dipelajari</Label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUBJECTS.map(subject => (
                <div key={subject} className="flex items-center gap-2">
                  <Checkbox
                    id={`subj-${subject}`}
                    checked={studentData.subjects.includes(subject)}
                    onCheckedChange={() => handleSubjectToggle(subject)}
                  />
                  <Label htmlFor={`subj-${subject}`} className="font-normal cursor-pointer text-sm">
                    {subject}
                  </Label>
                </div>
              ))}
            </div>
            {studentData.subjects.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {studentData.subjects.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="learningGoals">Tujuan Belajar</Label>
            <textarea
              id="learningGoals"
              value={studentData.learning_goals}
              onChange={e => setStudentData(p => ({ ...p, learning_goals: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Jelaskan tujuan belajar Anda, misalnya: persiapan ujian, meningkatkan nilai, dll."
            />
          </div>

          <div>
            <Label htmlFor="budget">Anggaran Per Bulan (Rp)</Label>
            <Input
              id="budget"
              type="number"
              value={studentData.budget_per_month}
              onChange={e => setStudentData(p => ({ ...p, budget_per_month: e.target.value }))}
              placeholder="Contoh: 500000"
              className="mt-1"
            />
            {studentData.budget_per_month && (
              <p className="text-xs text-muted-foreground mt-1">
                Rp {Number(studentData.budget_per_month).toLocaleString('id-ID')} / bulan
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4" /> Alamat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address">Alamat Lengkap</Label>
            <Input
              id="address"
              value={studentData.address}
              onChange={e => setStudentData(p => ({ ...p, address: e.target.value }))}
              placeholder="Jl. Contoh No. 1, RT/RW, Kelurahan, Kecamatan"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="city">Kota / Kabupaten</Label>
            <Select value={studentData.city} onValueChange={v => setStudentData(p => ({ ...p, city: v }))}>
              <SelectTrigger id="city" className="mt-1">
                <SelectValue placeholder="Pilih kota" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {saving ? (
          <><Spinner className="mr-2 h-4 w-4" />Menyimpan...</>
        ) : (
          <><Settings className="mr-2 h-4 w-4" />Simpan Perubahan</>
        )}
      </Button>
    </div>
  )
}
