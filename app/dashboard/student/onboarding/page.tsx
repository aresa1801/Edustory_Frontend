'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  User, School, Users, BookOpen, Calendar, Wallet, CreditCard,
  CheckCircle, ArrowRight, ArrowLeft, ChevronRight
} from 'lucide-react'

const GRADE_LEVELS = [
  'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
  'SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9',
  'SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12',
  'Mahasiswa', 'Umum',
]

const SUBJECTS = [
  'Matematika', 'Bahasa Inggris', 'Bahasa Indonesia', 'Fisika', 'Kimia', 'Biologi',
  'Sejarah', 'Geografi', 'IPA', 'IPS', 'Ekonomi', 'Akuntansi',
  'Pemrograman', 'Desain Grafis', 'Musik', 'Seni Rupa',
]

const SCHEDULE_OPTIONS = [
  'Senin – Jumat (Pagi 07.00–12.00)',
  'Senin – Jumat (Siang 12.00–15.00)',
  'Senin – Jumat (Sore 15.00–19.00)',
  'Sabtu – Minggu (Pagi)',
  'Sabtu – Minggu (Siang)',
  'Sabtu – Minggu (Sore)',
  'Fleksibel',
]

const SESSION_OPTIONS = ['2', '4', '6', '8', '10', '12', '16', '20']

const PAYMENT_METHODS = [
  { id: 'bca', label: 'Transfer BCA', icon: '🏦', account: '1234567890 a/n EduStory Escrow' },
  { id: 'bni', label: 'Transfer BNI', icon: '🏦', account: '0987654321 a/n EduStory Escrow' },
  { id: 'mandiri', label: 'Transfer Mandiri', icon: '🏦', account: '1122334455 a/n EduStory Escrow' },
  { id: 'gopay', label: 'GoPay', icon: '💚', account: '0895-1370-0000' },
  { id: 'ovo', label: 'OVO', icon: '💜', account: '0812-3456-7890' },
  { id: 'dana', label: 'DANA', icon: '💙', account: '0822-3456-7890' },
]

const STEPS = [
  { id: 1, label: 'Profil Siswa', icon: User, description: 'Data pribadi, sekolah & orang tua' },
  { id: 2, label: 'Minat Belajar', icon: BookOpen, description: 'Kelas & mata pelajaran' },
  { id: 3, label: 'Rencana Belajar', icon: Calendar, description: 'Jadwal & anggaran belajar' },
  { id: 4, label: 'Deposit', icon: Wallet, description: 'Konfirmasi biaya belajar' },
]

const PROFILE_TABS = [
  { id: 'siswa', label: 'Data Siswa', icon: User },
  { id: 'sekolah', label: 'Data Sekolah', icon: School },
  { id: 'ortu', label: 'Data Orang Tua', icon: Users },
]

export default function StudentOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [profileTab, setProfileTab] = useState('siswa')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Step 1 – Profile
  const [siswaData, setSiswaData] = useState({
    name: '', phone: '', gender: '', birth_date: '', bio: '',
  })
  const [sekolahData, setSekolahData] = useState({
    school_name: '', school_type: '', school_city: '', school_address: '',
  })
  const [ortuData, setOrtuData] = useState({
    parent_name: '', parent_phone: '', parent_email: '', parent_relation: '',
  })

  // Step 2 – Minat Belajar
  const [gradeLevel, setGradeLevel] = useState('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [learningGoals, setLearningGoals] = useState('')

  // Step 3 – Rencana Belajar
  const [schedule, setSchedule] = useState('')
  const [budgetPerMonth, setBudgetPerMonth] = useState('')
  const [sessionsPerMonth, setSessionsPerMonth] = useState('')

  // Step 4 – Deposit
  const [selectedPayment, setSelectedPayment] = useState('')
  const [transferProof, setTransferProof] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      // Pre-fill name from auth
      setSiswaData(prev => ({ ...prev, name: user.user_metadata?.full_name || '' }))
    }
    init()
  }, [router])

  const toggleSubject = (s: string) => {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const validateStep = () => {
    setError(null)
    if (step === 1) {
      if (!siswaData.name.trim()) { setError('Nama lengkap wajib diisi'); return false }
      if (!ortuData.parent_name.trim()) { setError('Nama orang tua wajib diisi (tab Data Orang Tua)'); return false }
    }
    if (step === 2) {
      if (!gradeLevel) { setError('Pilih tingkat kelas'); return false }
      if (subjects.length === 0) { setError('Pilih minimal 1 mata pelajaran'); return false }
    }
    if (step === 3) {
      if (!schedule) { setError('Pilih jadwal belajar'); return false }
      if (!budgetPerMonth || Number(budgetPerMonth) < 50000) { setError('Budget minimum Rp 50.000'); return false }
      if (!sessionsPerMonth) { setError('Pilih jumlah pertemuan per bulan'); return false }
    }
    if (step === 4) {
      if (!selectedPayment) { setError('Pilih metode pembayaran'); return false }
    }
    return true
  }

  const saveProfile = async () => {
    if (!userId) return
    const { error: upErr } = await supabase.from('user_profiles').update({
      name: siswaData.name.trim(),
      phone: siswaData.phone.trim() || null,
      gender: siswaData.gender || null,
      bio: siswaData.bio.trim() || null,
    }).eq('id', userId)
    if (upErr) throw upErr

    const { error: sdErr } = await supabase.from('students').upsert({
      user_id: userId,
      grade_level: gradeLevel || null,
      subjects,
      learning_goals: learningGoals.trim() || null,
      preferred_schedule: schedule || null,
      budget_per_month: budgetPerMonth ? Number(budgetPerMonth) : null,
      sessions_per_month: sessionsPerMonth ? Number(sessionsPerMonth) : null,
      school_name: sekolahData.school_name.trim() || null,
      school_type: sekolahData.school_type || null,
      school_city: sekolahData.school_city.trim() || null,
      school_address: sekolahData.school_address.trim() || null,
      parent_name: ortuData.parent_name.trim() || null,
      parent_phone: ortuData.parent_phone.trim() || null,
      parent_email: ortuData.parent_email.trim() || null,
      parent_relation: ortuData.parent_relation || null,
      onboarding_complete: true,
      status: 'active',
    }, { onConflict: 'user_id' })
    if (sdErr) throw sdErr
  }

  const handleNext = async () => {
    if (!validateStep()) return
    if (step === 4) {
      setSaving(true)
      try {
        await saveProfile()
        router.push('/dashboard/student?onboarded=1')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menyimpan data')
      } finally {
        setSaving(false)
      }
      return
    }
    setStep(s => s + 1)
  }

  const depositAmount = budgetPerMonth ? Number(budgetPerMonth) : 0
  const selectedMethod = PAYMENT_METHODS.find(m => m.id === selectedPayment)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/3 to-blue-50/30">
      {/* Header */}
      <div className="bg-card border-b border-border/30 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-lg">📚</span>
          </div>
          <span className="font-bold text-foreground text-lg">EduStory</span>
          <span className="text-muted-foreground text-sm ml-2">— Selamat datang! Mari lengkapi profil Anda</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Progress Roadmap */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-foreground mb-1">Mulai Perjalanan Belajar Anda</h1>
          <p className="text-muted-foreground text-sm mb-6">Lengkapi {STEPS.length} langkah berikut untuk mulai mencari tutor terbaik</p>

          <div className="flex items-center gap-0">
            {STEPS.map((s, idx) => {
              const Icon = s.icon
              const done = step > s.id
              const active = step === s.id
              return (
                <div key={s.id} className="flex items-center flex-1 min-w-0">
                  <div className={`flex flex-col items-center gap-1.5 flex-shrink-0 ${active ? 'opacity-100' : done ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      done ? 'bg-green-500 border-green-500 text-white' :
                      active ? 'bg-primary border-primary text-white' :
                      'bg-card border-border text-muted-foreground'
                    }`}>
                      {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className={`text-xs font-semibold ${active ? 'text-primary' : done ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {s.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 transition-all ${done ? 'bg-green-400' : 'bg-border'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ========== STEP 1: PROFILE ========== */}
        {step === 1 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profil Siswa
              </CardTitle>
              <p className="text-sm text-muted-foreground">Lengkapi data diri, informasi sekolah, dan data orang tua / wali</p>
            </CardHeader>
            <CardContent>
              {/* Sub-tabs */}
              <div className="flex gap-1 border-b border-border mb-6">
                {PROFILE_TABS.map(tab => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setProfileTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                        profileTab === tab.id
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
              {profileTab === 'siswa' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Nama Lengkap <span className="text-red-500">*</span></Label>
                      <Input
                        value={siswaData.name}
                        onChange={e => setSiswaData(p => ({ ...p, name: e.target.value }))}
                        placeholder="Nama lengkap sesuai KK"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>No. HP / WhatsApp</Label>
                      <Input
                        value={siswaData.phone}
                        onChange={e => setSiswaData(p => ({ ...p, phone: e.target.value }))}
                        placeholder="08xx-xxxx-xxxx"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Jenis Kelamin</Label>
                      <Select value={siswaData.gender} onValueChange={v => setSiswaData(p => ({ ...p, gender: v }))}>
                        <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Laki-laki</SelectItem>
                          <SelectItem value="female">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tanggal Lahir</Label>
                      <Input
                        type="date"
                        value={siswaData.birth_date}
                        onChange={e => setSiswaData(p => ({ ...p, birth_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tentang Saya / Catatan</Label>
                    <Textarea
                      value={siswaData.bio}
                      onChange={e => setSiswaData(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Ceritakan tentang diri Anda, kebiasaan belajar, dll."
                      rows={3}
                    />
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" size="sm" onClick={() => setProfileTab('sekolah')}>
                      Lanjut: Data Sekolah <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Tab: Data Sekolah */}
              {profileTab === 'sekolah' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Nama Sekolah</Label>
                      <Input
                        value={sekolahData.school_name}
                        onChange={e => setSekolahData(p => ({ ...p, school_name: e.target.value }))}
                        placeholder="Contoh: SMA Negeri 1 Jakarta"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Jenjang Sekolah</Label>
                      <Select value={sekolahData.school_type} onValueChange={v => setSekolahData(p => ({ ...p, school_type: v }))}>
                        <SelectTrigger><SelectValue placeholder="Pilih jenjang" /></SelectTrigger>
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
                      <Label>Kota Sekolah</Label>
                      <Input
                        value={sekolahData.school_city}
                        onChange={e => setSekolahData(p => ({ ...p, school_city: e.target.value }))}
                        placeholder="Contoh: Jakarta Selatan"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Alamat Sekolah</Label>
                      <Input
                        value={sekolahData.school_address}
                        onChange={e => setSekolahData(p => ({ ...p, school_address: e.target.value }))}
                        placeholder="Jl. ..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setProfileTab('siswa')}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setProfileTab('ortu')}>
                      Lanjut: Data Orang Tua <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Tab: Data Orang Tua */}
              {profileTab === 'ortu' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Nama Orang Tua / Wali <span className="text-red-500">*</span></Label>
                      <Input
                        value={ortuData.parent_name}
                        onChange={e => setOrtuData(p => ({ ...p, parent_name: e.target.value }))}
                        placeholder="Nama lengkap orang tua"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Hubungan</Label>
                      <Select value={ortuData.parent_relation} onValueChange={v => setOrtuData(p => ({ ...p, parent_relation: v }))}>
                        <SelectTrigger><SelectValue placeholder="Pilih hubungan" /></SelectTrigger>
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
                      <Label>No. HP Orang Tua</Label>
                      <Input
                        value={ortuData.parent_phone}
                        onChange={e => setOrtuData(p => ({ ...p, parent_phone: e.target.value }))}
                        placeholder="08xx-xxxx-xxxx"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email Orang Tua</Label>
                      <Input
                        type="email"
                        value={ortuData.parent_email}
                        onChange={e => setOrtuData(p => ({ ...p, parent_email: e.target.value }))}
                        placeholder="email@contoh.com"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setProfileTab('sekolah')}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ========== STEP 2: MINAT BELAJAR ========== */}
        {step === 2 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Form Minat Belajar
              </CardTitle>
              <p className="text-sm text-muted-foreground">Pilih tingkat kelas dan mata pelajaran yang ingin dipelajari</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Tingkat Kelas <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GRADE_LEVELS.map(level => (
                    <button
                      key={level}
                      onClick={() => setGradeLevel(level)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${
                        gradeLevel === level
                          ? 'bg-primary text-white border-primary'
                          : 'bg-card border-border text-foreground hover:border-primary/50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-base font-semibold">Mata Pelajaran <span className="text-red-500">*</span></Label>
                <p className="text-xs text-muted-foreground">Pilih satu atau lebih mata pelajaran</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {SUBJECTS.map(subject => (
                    <label key={subject} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      subjects.includes(subject)
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-card border-border text-foreground hover:border-primary/40'
                    }`}>
                      <Checkbox
                        checked={subjects.includes(subject)}
                        onCheckedChange={() => toggleSubject(subject)}
                        className="shrink-0"
                      />
                      <span className="text-sm font-medium">{subject}</span>
                    </label>
                  ))}
                </div>
                {subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {subjects.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label className="text-base font-semibold">Tujuan Belajar</Label>
                <Textarea
                  value={learningGoals}
                  onChange={e => setLearningGoals(e.target.value)}
                  placeholder="Contoh: Ingin meningkatkan nilai Matematika untuk persiapan UTBK..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========== STEP 3: RENCANA BELAJAR ========== */}
        {step === 3 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Rencana Belajar
              </CardTitle>
              <p className="text-sm text-muted-foreground">Tentukan jadwal, anggaran, dan frekuensi belajar Anda per bulan</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Jadwal Belajar yang Diinginkan <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SCHEDULE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSchedule(opt)}
                      className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left ${
                        schedule === opt
                          ? 'bg-primary text-white border-primary'
                          : 'bg-card border-border text-foreground hover:border-primary/50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label className="text-base font-semibold">
                    Budget Belajar per Bulan (Rp) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                    <Input
                      type="number"
                      min="50000"
                      step="50000"
                      value={budgetPerMonth}
                      onChange={e => setBudgetPerMonth(e.target.value)}
                      placeholder="500000"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum Rp 50.000/bulan</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-base font-semibold">
                    Jumlah Pertemuan per Bulan <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {SESSION_OPTIONS.map(n => (
                      <button
                        key={n}
                        onClick={() => setSessionsPerMonth(n)}
                        className={`py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                          sessionsPerMonth === n
                            ? 'bg-primary text-white border-primary'
                            : 'bg-card border-border text-foreground hover:border-primary/50'
                        }`}
                      >
                        {n}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {budgetPerMonth && sessionsPerMonth && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800 mb-1">Estimasi Biaya per Sesi</p>
                  <p className="text-2xl font-bold text-blue-900">
                    Rp {Math.round(Number(budgetPerMonth) / Number(sessionsPerMonth)).toLocaleString('id-ID')}
                    <span className="text-sm font-normal text-blue-700">/sesi</span>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Total Rp {Number(budgetPerMonth).toLocaleString('id-ID')}/bulan × {sessionsPerMonth} pertemuan
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ========== STEP 4: DEPOSIT ========== */}
        {step === 4 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Form Deposit Biaya Belajar
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Dana Anda akan disimpan di <strong>Escrow Account EduStory</strong> dan hanya dicairkan setelah sesi belajar selesai
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-2">
                <p className="text-sm font-semibold text-foreground">Ringkasan Rencana Belajar</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tingkat Kelas</span>
                    <p className="font-medium">{gradeLevel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Jadwal</span>
                    <p className="font-medium">{schedule}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pertemuan/Bulan</span>
                    <p className="font-medium">{sessionsPerMonth}× sesi</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mata Pelajaran</span>
                    <p className="font-medium">{subjects.slice(0, 2).join(', ')}{subjects.length > 2 ? ` +${subjects.length - 2}` : ''}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Total Deposit</span>
                  <span className="text-xl font-bold text-primary">
                    Rp {depositAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Pilih Metode Pembayaran <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(method => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPayment(method.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedPayment === method.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/40'
                      }`}
                    >
                      <span className="text-xl block mb-1">{method.icon}</span>
                      <p className="text-sm font-semibold text-foreground">{method.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {selectedMethod && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800 mb-1 flex items-center gap-1">
                    <CreditCard className="w-4 h-4" /> Instruksi Transfer via {selectedMethod.label}
                  </p>
                  <p className="text-sm text-green-700">{selectedMethod.account}</p>
                  <p className="text-lg font-bold text-green-900 mt-2">
                    Rp {depositAmount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Dana disimpan di Escrow Account yang aman. Tutor hanya menerima pembayaran setelah sesi belajar selesai.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Catatan / Konfirmasi Transfer (opsional)</Label>
                <Textarea
                  value={transferProof}
                  onChange={e => setTransferProof(e.target.value)}
                  placeholder="Contoh: Sudah transfer via BCA tanggal 22 April 2026 jam 10:00..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/auth/select-role')}
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step === 1 ? 'Kembali' : 'Sebelumnya'}
          </Button>

          <Button onClick={handleNext} disabled={saving} className="bg-primary hover:bg-primary/90 px-8">
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyimpan...
              </span>
            ) : step === 4 ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Selesai & Masuk Dashboard
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Selanjutnya
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Anda bisa melengkapi atau mengubah data ini kapan saja di halaman Profil
        </p>
      </div>
    </div>
  )
}
