'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'
import { useAuth } from '@/lib/auth-context'
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

// ============================================================
// KONSTANTA
// ============================================================
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

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function StudentOnboardingPage() {
  const router = useRouter()
  const { user: authUser, loading: authLoading } = useAuth()
  const [step, setStep] = useState(1)
  const [profileTab, setProfileTab] = useState('siswa')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Step 1 – Profile
  const [siswaData, setSiswaData] = useState({
    name: '', phone: '', gender: '', bio: '',
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

  const isMounted = useRef(true)
  const userIdRef = useRef<string | null>(null)

  // Keep ref in sync
  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  // ============================================================
  // RESOLVE USER ID (hanya dari auth, tanpa sentuh user_profiles)
  // ============================================================
  const resolveUserId = async (): Promise<string> => {
    if (userIdRef.current) return userIdRef.current
    if (authUser?.id) {
      setUserId(authUser.id)
      userIdRef.current = authUser.id
      return authUser.id
    }
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setUserId(session.user.id)
        userIdRef.current = session.user.id
        return session.user.id
      }
    } catch (err) {
      console.error('[Onboarding] resolveUserId fallback error:', err)
    }
    throw new Error('Sesi tidak ditemukan. Silakan login ulang.')
  }

  // ============================================================
  // LOAD DATA – HANYA DARI TABEL students
  // ============================================================
  const loadStudentData = async (uid: string) => {
    try {
      const supabase = createClient()
      // Ambil semua data dari students
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle()

      if (studentErr) {
        console.warn('[Onboarding] Load student error:', studentErr)
        return
      }

      if (student) {
        // Data Siswa (kolom baru di students)
        setSiswaData({
          name: student.name || '',
          phone: student.phone || '',
          gender: student.gender || '',
          bio: student.bio || '',
        })
        // Data Sekolah
        setSekolahData({
          school_name: student.school_name || '',
          school_type: student.school_type || '',
          school_city: student.school_city || '',
          school_address: student.school_address || '',
        })
        // Data Orang Tua
        setOrtuData({
          parent_name: student.parent_name || '',
          parent_phone: student.parent_phone || '',
          parent_email: student.parent_email || '',
          parent_relation: student.parent_relation || '',
        })
        // Step 2
        setGradeLevel(student.grade_level || '')
        setSubjects(student.subjects || [])
        setLearningGoals(student.learning_goals || '')
        // Step 3
        setSchedule(student.preferred_schedule || '')
        setBudgetPerMonth(student.budget_per_month?.toString() || '')
        setSessionsPerMonth(student.sessions_per_month?.toString() || '')
      }
    } catch (err) {
      console.error('[Onboarding] Load data error:', err)
    }
  }

  // ============================================================
  // INISIALISASI
  // ============================================================
  useEffect(() => {
    isMounted.current = true
    const init = async () => {
      try {
        const supabase = createClient()
        let currentUser = null
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (user) {
          currentUser = user
        } else {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) currentUser = session.user
        }
        if (!currentUser) {
          if (authUser) {
            currentUser = authUser
          } else if (!authLoading) {
            router.push('/auth/login')
            return
          } else {
            return
          }
        }
        if (isMounted.current) {
          setUserId(currentUser.id)
          setUserEmail(currentUser.email || '')
          await loadStudentData(currentUser.id)
        }
      } catch (err) {
        console.error('[Onboarding] Init error:', err)
        if (authUser && isMounted.current) {
          setUserId(authUser.id)
          setUserEmail(authUser.email || '')
          await loadStudentData(authUser.id)
        } else {
          setError('Gagal memuat data user.')
        }
      }
    }
    init()
    return () => { isMounted.current = false }
  }, [router, authUser, authLoading])

  // ============================================================
  // VALIDASI
  // ============================================================
  const validateStep = () => {
    setError(null)
    if (step === 1) {
      if (!siswaData.name.trim()) {
        setError('Nama lengkap siswa wajib diisi')
        return false
      }
      if (!ortuData.parent_name.trim()) {
        setError('Nama orang tua / wali wajib diisi (tab Data Orang Tua)')
        return false
      }
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

  // ============================================================
  // SAVE STEP 1 – SEMUA DATA KE TABEL students
  // ============================================================
  const saveStep1Data = async () => {
  console.log('[ONBOARDING] 🔥 saveStep1Data FIRED')

  try {
    // 1. Ambil session dan token
    const supabase = createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error('[ONBOARDING] ❌ Session error:', sessionError)
      throw sessionError
    }
    if (!session) {
      console.error('[ONBOARDING] ❌ No session')
      throw new Error('No session')
    }
    console.log('[ONBOARDING] ✅ Session OK, user:', session.user.email)

    // 2. Payload statis untuk testing
    const payload = {
      user_id: session.user.id,
      name: 'Test Student From Hardcode',
      parent_name: 'Test Parent',
      status: 'active',
      onboarding_complete: false,
    }
    console.log('[ONBOARDING] 📦 Payload:', payload)

    // 3. Fetch dengan URL absolut
    const url = 'http://localhost:3000/api/students/onboarding'
    console.log('[ONBOARDING] 🌐 Fetching:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token,
      },
      body: JSON.stringify(payload),
    })

    console.log('[ONBOARDING] 📡 Response status:', response.status)
    const result = await response.json()
    console.log('[ONBOARDING] 📡 Response data:', result)

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`)
    }

    console.log('[ONBOARDING] ✅ SUCCESS!')
    return true
  } catch (err) {
    console.error('[ONBOARDING] ❌ CATCH ERROR:', err)
    throw err
  }
}

  // ============================================================
  // SAVE STEP 2
  // ============================================================
  const saveStep2Data = async () => {
    const currentUserId = await resolveUserId()
    const supabase = createClient()
    const payload: Record<string, any> = {
      user_id: currentUserId,
      grade_level: gradeLevel || null,
      subjects: subjects,
      learning_goals: learningGoals.trim() || null,
    }
    Object.keys(payload).forEach(key => {
      if (key !== 'user_id' && key !== 'subjects' && (payload[key] === null || payload[key] === undefined)) {
        delete payload[key]
      }
    })
    const { error } = await supabase.from('students').upsert(payload, { onConflict: 'user_id' })
    if (error) throw new Error(`Gagal simpan minat belajar: ${error.message}`)
  }

  // ============================================================
  // SAVE STEP 3
  // ============================================================
  const saveStep3Data = async () => {
    const currentUserId = await resolveUserId()
    const supabase = createClient()
    const payload: Record<string, any> = {
      user_id: currentUserId,
      preferred_schedule: schedule || null,
      budget_per_month: budgetPerMonth ? Number(budgetPerMonth) : null,
      sessions_per_month: sessionsPerMonth ? Number(sessionsPerMonth) : null,
    }
    Object.keys(payload).forEach(key => {
      if (key !== 'user_id' && (payload[key] === null || payload[key] === undefined)) {
        delete payload[key]
      }
    })
    const { error } = await supabase.from('students').upsert(payload, { onConflict: 'user_id' })
    if (error) throw new Error(`Gagal simpan rencana belajar: ${error.message}`)
  }

  // ============================================================
  // FINALIZE ONBOARDING
  // ============================================================
  const finalizeOnboarding = async () => {
    const currentUserId = await resolveUserId()
    const supabase = createClient()
    const { error: completeErr } = await supabase
      .from('students')
      .update({ onboarding_complete: true })
      .eq('user_id', currentUserId)
    if (completeErr) throw new Error(`Gagal update status: ${completeErr.message}`)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sesi tidak ditemukan')
    const amount = budgetPerMonth ? Number(budgetPerMonth) : 0
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token
      },
      body: JSON.stringify({
        amount,
        paymentMethod: selectedPayment,
        isOnboardingDeposit: true,
        transactionRef: transferProof.trim() || null,
      }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Gagal memproses pembayaran')
    }
  }

  // ============================================================
  // HANDLE NEXT
  // ============================================================
  const handleNext = async () => {
    console.log('[Onboarding] handleNext triggered', { step, saving })

    if (!validateStep()) {
      console.log('[Onboarding] Validasi gagal')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (step === 1) {
        console.log('[Onboarding] Menyimpan step 1...')
        await saveStep1Data()
        console.log('[Onboarding] Step 1 tersimpan, pindah ke step 2')
        setStep(2)
      } else if (step === 2) {
        console.log('[Onboarding] Menyimpan step 2...')
        await saveStep2Data()
        setStep(3)
      } else if (step === 3) {
        console.log('[Onboarding] Menyimpan step 3...')
        await saveStep3Data()
        setStep(4)
      } else if (step === 4) {
        console.log('[Onboarding] Menyelesaikan onboarding...')
        await finalizeOnboarding()
        router.push('/dashboard/student')
      }
    } catch (err: any) {
      console.error('[Onboarding] Error:', err)
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // HANDLE BACK
  // ============================================================
  const handleBack = () => {
    if (step > 1) setStep(s => s - 1)
    else router.push('/auth/select-role')
  }

  // ============================================================
  // RENDER (semua input siswa sudah bisa diedit)
  // ============================================================
  const depositAmount = budgetPerMonth ? Number(budgetPerMonth) : 0
  const selectedMethod = PAYMENT_METHODS.find(m => m.id === selectedPayment)

  const toggleSubject = (s: string) => {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

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
                      <p className={`text-xs font-semibold ${active ? 'text-primary' : done ? 'text-green-300' : 'text-muted-foreground'}`}>
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

        {/* ========== STEP 1 ========== */}
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
              {/* Tabs */}
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

              {/* Tab Siswa – semua input bisa diedit */}
              {profileTab === 'siswa' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Nama Lengkap <span className="text-red-500">*</span></Label>
                      <Input
                        value={siswaData.name}
                        onChange={e => setSiswaData(p => ({ ...p, name: e.target.value }))}
                        placeholder="Nama lengkap"
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
                        <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="laki-laki">Laki-laki</SelectItem>
                          <SelectItem value="perempuan">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
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

              {/* Tab Sekolah (sama) */}
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

              {/* Tab Orang Tua (sama) */}
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

        {/* ========== STEP 2 ========== */}
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

        {/* ========== STEP 3 ========== */}
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
                  <p className="text-xs text-blue-300 mt-1">
                    Total Rp {Number(budgetPerMonth).toLocaleString('id-ID')}/bulan × {sessionsPerMonth} pertemuan
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ========== STEP 4 ========== */}
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
                  <p className="text-sm text-green-300">{selectedMethod.account}</p>
                  <p className="text-lg font-bold text-green-900 mt-2">
                    Rp {depositAmount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-green-300 mt-2">
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
            onClick={handleBack}
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