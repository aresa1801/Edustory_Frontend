'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { User, BookOpen, MapPin, Save, Mail, Phone, ShieldCheck, Target, Calendar, Wallet, CheckCircle2, Users, School } from 'lucide-react'

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
  const [activeProfileTab, setActiveProfileTab] = useState('siswa')

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
    user_id: '',
    grade_level: '',
    subjects: [] as string[],
    learning_goals: '',
    preferred_schedule: '',
    budget_per_month: '',
    address: '',
    city: '',
    status: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    parent_relation: '',
    school_name: '',
    school_type: '',
    school_city: '',
    school_address: '',
    sessions_per_month: '',
  })

  // Profile completion score (0–100)
  const completionScore = useMemo(() => {
    const fields = [
      userProfile.name.trim(),
      userProfile.phone.trim(),
      userProfile.gender,
      userProfile.bio.trim(),
      studentData.grade_level,
      studentData.subjects.length > 0 ? 'ok' : '',
      studentData.learning_goals.trim(),
      studentData.preferred_schedule,
      studentData.address.trim(),
      studentData.city,
      studentData.parent_name.trim(),
      studentData.parent_phone.trim(),
    ]
    const filled = fields.filter(Boolean).length
    return Math.round((filled / fields.length) * 100)
  }, [userProfile, studentData])

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user

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
        // Always use the auth email as the authoritative source
        email: user.email || up?.email || '',
        phone: up?.phone || '',
        bio: up?.bio || '',
        gender: up?.gender || '',
      })

      const { data: sd, error: sdErr } = await supabase
        .from('students')
        .select('id, user_id, grade_level, subjects, learning_goals, preferred_schedule, budget_per_month, sessions_per_month, address, city, status, parent_name, parent_email, parent_phone, parent_relation, school_name, school_type, school_city, school_address')
        .eq('user_id', user.id)
        .single()

      if (sdErr && sdErr.code !== 'PGRST116') throw sdErr

      setStudentData({
        id: sd?.id || '',
        user_id: user.id,
        grade_level: sd?.grade_level || '',
        subjects: sd?.subjects || [],
        learning_goals: sd?.learning_goals || '',
        preferred_schedule: sd?.preferred_schedule || '',
        budget_per_month: sd?.budget_per_month?.toString() || '',
        sessions_per_month: sd?.sessions_per_month?.toString() || '',
        address: sd?.address || '',
        city: sd?.city || '',
        status: sd?.status || '',
        parent_name: sd?.parent_name || '',
        parent_email: sd?.parent_email || '',
        parent_phone: sd?.parent_phone || '',
        parent_relation: sd?.parent_relation || '',
        school_name: sd?.school_name || '',
        school_type: sd?.school_type || '',
        school_city: sd?.school_city || '',
        school_address: sd?.school_address || '',
      })

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
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
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

      // Upsert students table (update if exists, insert if not)
      const studentPayload = {
        grade_level: studentData.grade_level || null,
        subjects: studentData.subjects,
        learning_goals: studentData.learning_goals.trim() || null,
        preferred_schedule: studentData.preferred_schedule || null,
        budget_per_month: studentData.budget_per_month ? Number(studentData.budget_per_month) : null,
        sessions_per_month: studentData.sessions_per_month ? Number(studentData.sessions_per_month) : null,
        address: studentData.address.trim() || null,
        city: studentData.city || null,
        parent_name: studentData.parent_name.trim() || null,
        parent_email: studentData.parent_email.trim() || null,
        parent_phone: studentData.parent_phone.trim() || null,
        parent_relation: studentData.parent_relation || null,
        school_name: studentData.school_name.trim() || null,
        school_type: studentData.school_type || null,
        school_city: studentData.school_city.trim() || null,
        school_address: studentData.school_address.trim() || null,
      }

      if (studentData.id) {
        const { error: sdErr } = await supabase
          .from('students')
          .update(studentPayload)
          .eq('id', studentData.id)
        if (sdErr) throw sdErr
      } else {
        const { data: newSd, error: sdErr } = await supabase
          .from('students')
          .insert({ user_id: user.id, ...studentPayload })
          .select('id')
          .single()
        if (sdErr) throw sdErr
        if (newSd) setStudentData(prev => ({ ...prev, id: newSd.id }))
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
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">Memuat profil…</p>
      </div>
    )
  }

  const initials = userProfile.name
    ? userProfile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const completionColor =
    completionScore >= 80 ? 'text-green-600' :
    completionScore >= 50 ? 'text-yellow-600' :
    'text-red-500'

  return (
    <div className="max-w-2xl space-y-6">
      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Header Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0 ring-2 ring-primary/20">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg leading-tight truncate">{userProfile.name || 'Nama belum diisi'}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{userProfile.email}</span>
              </p>
              {studentData.status && (
                <span className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  studentData.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  <ShieldCheck className="w-3 h-3" />
                  {studentData.status === 'active' ? 'Akun Aktif' : studentData.status}
                </span>
              )}
            </div>
          </div>

          {/* Profile completion */}
          <Separator className="my-4" />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Kelengkapan Profil</span>
              <span className={`font-semibold ${completionColor}`}>{completionScore}%</span>
            </div>
            <Progress value={completionScore} className="h-1.5" />
            {completionScore < 100 && (
              <p className="text-xs text-muted-foreground">Lengkapi profil Anda agar lebih mudah dicocokkan dengan pengajar.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== TABS ===== */}
      <div>
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border mb-6">
          {[
            { id: 'siswa', label: 'Data Siswa', icon: User },
            { id: 'sekolah', label: 'Data Sekolah', icon: School },
            { id: 'ortu', label: 'Data Orang Tua', icon: Users },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveProfileTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                  activeProfileTab === tab.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab: Data Siswa */}
        {activeProfileTab === 'siswa' && (
          <div className="space-y-6">
            {/* Personal Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  Informasi Pribadi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">
                      Nama Lengkap <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={userProfile.name}
                      onChange={e => setUserProfile(p => ({ ...p, name: e.target.value }))}
                      placeholder="Nama lengkap Anda"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="flex items-center gap-1">
                      Email
                      <span className="text-xs text-muted-foreground font-normal">(dari akun login)</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        value={userProfile.email}
                        readOnly
                        className="pl-9 bg-muted/40 cursor-not-allowed text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Nomor Telepon
                    </Label>
                    <Input
                      id="phone"
                      value={userProfile.phone}
                      onChange={e => setUserProfile(p => ({ ...p, phone: e.target.value }))}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gender">Jenis Kelamin</Label>
                    <Select value={userProfile.gender} onValueChange={v => setUserProfile(p => ({ ...p, gender: v }))}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Pilih jenis kelamin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="laki-laki">Laki-laki</SelectItem>
                        <SelectItem value="perempuan">Perempuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio">Tentang Saya</Label>
                  <Textarea
                    id="bio"
                    value={userProfile.bio}
                    onChange={e => setUserProfile(p => ({ ...p, bio: e.target.value }))}
                    placeholder="Ceritakan sedikit tentang diri Anda…"
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">{userProfile.bio.length} karakter</p>
                </div>
              </CardContent>
            </Card>

            {/* Learning Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                  </div>
                  Informasi Pembelajaran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="gradeLevel">Tingkat Kelas</Label>
                    <Select value={studentData.grade_level} onValueChange={v => setStudentData(p => ({ ...p, grade_level: v }))}>
                      <SelectTrigger id="gradeLevel">
                        <SelectValue placeholder="Pilih tingkat kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_LEVELS.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="schedule" className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Jadwal Belajar
                    </Label>
                    <Select value={studentData.preferred_schedule} onValueChange={v => setStudentData(p => ({ ...p, preferred_schedule: v }))}>
                      <SelectTrigger id="schedule">
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

                <div className="space-y-2">
                  <Label>
                    Mata Pelajaran
                    {studentData.subjects.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs font-normal">
                        {studentData.subjects.length} dipilih
                      </Badge>
                    )}
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg border border-input bg-muted/20">
                    {SUBJECTS.map(subject => (
                      <label
                        key={subject}
                        htmlFor={`subj-${subject}`}
                        className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-background transition-colors"
                      >
                        <Checkbox
                          id={`subj-${subject}`}
                          checked={studentData.subjects.includes(subject)}
                          onCheckedChange={() => handleSubjectToggle(subject)}
                        />
                        <span className="text-sm leading-none">{subject}</span>
                      </label>
                    ))}
                  </div>
                  {studentData.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {studentData.subjects.map(s => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="text-xs cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                          onClick={() => handleSubjectToggle(s)}
                        >
                          {s} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="learningGoals" className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-muted-foreground" /> Tujuan Belajar
                  </Label>
                  <Textarea
                    id="learningGoals"
                    value={studentData.learning_goals}
                    onChange={e => setStudentData(p => ({ ...p, learning_goals: e.target.value }))}
                    placeholder="Jelaskan tujuan belajar Anda, misalnya: persiapan ujian, meningkatkan nilai, dll."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="budget" className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-muted-foreground" /> Budget/Bulan (Rp)
                    </Label>
                    <Input
                      id="budget"
                      type="number"
                      min={0}
                      value={studentData.budget_per_month}
                      onChange={e => setStudentData(p => ({ ...p, budget_per_month: e.target.value }))}
                      placeholder="500000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sessions">Pertemuan/Bulan</Label>
                    <Select value={studentData.sessions_per_month} onValueChange={v => setStudentData(p => ({ ...p, sessions_per_month: v }))}>
                      <SelectTrigger id="sessions">
                        <SelectValue placeholder="Pilih jumlah" />
                      </SelectTrigger>
                      <SelectContent>
                        {['2', '4', '6', '8', '10', '12', '16', '20'].map(n => (
                          <SelectItem key={n} value={n}>{n}× per bulan</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                  </div>
                  Lokasi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="address">Alamat Lengkap</Label>
                  <Input
                    id="address"
                    value={studentData.address}
                    onChange={e => setStudentData(p => ({ ...p, address: e.target.value }))}
                    placeholder="Jl. Contoh No. 1, RT/RW, Kelurahan, Kecamatan"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">Kota / Kabupaten</Label>
                  <Select value={studentData.city} onValueChange={v => setStudentData(p => ({ ...p, city: v }))}>
                    <SelectTrigger id="city">
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
          </div>
        )}

        {/* Tab: Data Sekolah */}
        {activeProfileTab === 'sekolah' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <School className="w-4 h-4 text-indigo-600" />
                </div>
                Data Sekolah
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="schoolName">Nama Sekolah</Label>
                  <Input
                    id="schoolName"
                    value={studentData.school_name}
                    onChange={e => setStudentData(p => ({ ...p, school_name: e.target.value }))}
                    placeholder="Contoh: SMA Negeri 1 Jakarta"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="schoolType">Jenjang Sekolah</Label>
                  <Select value={studentData.school_type} onValueChange={v => setStudentData(p => ({ ...p, school_type: v }))}>
                    <SelectTrigger id="schoolType">
                      <SelectValue placeholder="Pilih jenjang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SD">SD (Sekolah Dasar)</SelectItem>
                      <SelectItem value="SMP">SMP (Sekolah Menengah Pertama)</SelectItem>
                      <SelectItem value="SMA">SMA / SMK</SelectItem>
                      <SelectItem value="PT">Perguruan Tinggi</SelectItem>
                      <SelectItem value="other">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="schoolCity">Kota Sekolah</Label>
                  <Input
                    id="schoolCity"
                    value={studentData.school_city}
                    onChange={e => setStudentData(p => ({ ...p, school_city: e.target.value }))}
                    placeholder="Contoh: Jakarta Selatan"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="schoolAddress">Alamat Sekolah</Label>
                  <Input
                    id="schoolAddress"
                    value={studentData.school_address}
                    onChange={e => setStudentData(p => ({ ...p, school_address: e.target.value }))}
                    placeholder="Jl. ..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab: Data Orang Tua */}
        {activeProfileTab === 'ortu' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-orange-600" />
                </div>
                Informasi Orang Tua / Wali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="parentName">Nama Orang Tua / Wali</Label>
                  <Input
                    id="parentName"
                    value={studentData.parent_name}
                    onChange={e => setStudentData(p => ({ ...p, parent_name: e.target.value }))}
                    placeholder="Nama lengkap orang tua / wali"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parentRelation">Hubungan</Label>
                  <Select value={studentData.parent_relation} onValueChange={v => setStudentData(p => ({ ...p, parent_relation: v }))}>
                    <SelectTrigger id="parentRelation">
                      <SelectValue placeholder="Pilih hubungan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ayah">Ayah</SelectItem>
                      <SelectItem value="ibu">Ibu</SelectItem>
                      <SelectItem value="wali">Wali</SelectItem>
                      <SelectItem value="other">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="parentEmail" className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email Orang Tua / Wali
                  </Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    value={studentData.parent_email}
                    onChange={e => setStudentData(p => ({ ...p, parent_email: e.target.value }))}
                    placeholder="email@contoh.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parentPhone" className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Telepon Orang Tua / Wali
                  </Label>
                  <Input
                    id="parentPhone"
                    value={studentData.parent_phone}
                    onChange={e => setStudentData(p => ({ ...p, parent_phone: e.target.value }))}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        size="lg"
        className="w-full"
      >
        {saving ? (
          <><Spinner className="mr-2 h-4 w-4" />Menyimpan…</>
        ) : (
          <><Save className="mr-2 h-4 w-4" />Simpan Perubahan</>
        )}
      </Button>
    </div>
  )
}
