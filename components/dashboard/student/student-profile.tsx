'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/auth'
import {
  User, BookOpen, MapPin, Mail, Phone, ShieldCheck,
  Target, Calendar, Wallet, CheckCircle2, Users, School, Edit
} from 'lucide-react'
import Link from 'next/link'

export default function StudentProfile() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeProfileTab, setActiveProfileTab] = useState('siswa')
  const [userEmail, setUserEmail] = useState('')

  // Data lengkap dari students
  const [studentData, setStudentData] = useState({
    id: '',
    user_id: '',
    name: '',
    phone: '',
    gender: '',
    bio: '',
    grade_level: '',
    subjects: [] as string[],
    learning_goals: '',
    preferred_schedule: '',
    budget_per_month: '',
    sessions_per_month: '',
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
    onboarding_complete: false,
  })

  // Helper untuk fallback "kosong"
  const displayValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return 'kosong'
    if (Array.isArray(value) && value.length === 0) return 'kosong'
    if (typeof value === 'string') return value
    if (typeof value === 'number') return value.toString()
    return 'kosong'
  }

  const displaySubjects = (subjects: string[]) => {
    if (!subjects || subjects.length === 0) {
      return <span className="text-muted-foreground">kosong</span>
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {subjects.map(s => (
          <Badge key={s} variant="secondary">{s}</Badge>
        ))}
      </div>
    )
  }

  const displayBudget = (amount: string) => {
    if (!amount) return 'kosong'
    return `Rp ${Number(amount).toLocaleString('id-ID')}`
  }

  // Hitung kelengkapan profil (hanya untuk ditampilkan)
  const completionScore = useMemo(() => {
    const fields = [
      studentData.name.trim(),
      studentData.phone.trim(),
      studentData.gender,
      studentData.bio.trim(),
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
  }, [studentData])

  // Fetch data dari Supabase
  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Anda harus login terlebih dahulu')
        return
      }
      setUserEmail(user.email || '')

      const { data: sd, error: sdErr } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (sdErr && sdErr.code !== 'PGRST116') throw sdErr

      if (sd) {
        setStudentData({
          id: sd.id || '',
          user_id: user.id,
          name: sd.name || '',
          phone: sd.phone || '',
          gender: sd.gender || '',
          bio: sd.bio || '',
          grade_level: sd.grade_level || '',
          subjects: sd.subjects || [],
          learning_goals: sd.learning_goals || '',
          preferred_schedule: sd.preferred_schedule || '',
          budget_per_month: sd.budget_per_month?.toString() || '',
          sessions_per_month: sd.sessions_per_month?.toString() || '',
          address: sd.address || '',
          city: sd.city || '',
          status: sd.status || '',
          parent_name: sd.parent_name || '',
          parent_email: sd.parent_email || '',
          parent_phone: sd.parent_phone || '',
          parent_relation: sd.parent_relation || '',
          school_name: sd.school_name || '',
          school_type: sd.school_type || '',
          school_city: sd.school_city || '',
          school_address: sd.school_address || '',
          onboarding_complete: sd.onboarding_complete || false,
        })
      } else {
        // Jika belum ada data, set default
        setStudentData(prev => ({ ...prev, user_id: user.id }))
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

  // --- State loading ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">Memuat profil…</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const initials = studentData.name
    ? studentData.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const completionColor =
    completionScore >= 80 ? 'text-green-300' :
    completionScore >= 50 ? 'text-yellow-300' :
    'text-red-500'

  // --- Tampilan read-only ---
  return (
    <div className="max-w-2xl space-y-6">
      {/* Header Profile Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0 ring-2 ring-primary/20">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg leading-tight truncate">
                {displayValue(studentData.name)}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{userEmail}</span>
              </p>
              {studentData.status && (
                <span className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  studentData.status === 'active' ? 'bg-green-100 text-green-300' : 'bg-slate-500/20 text-slate-300'
                }`}>
                  <ShieldCheck className="w-3 h-3" />
                  {studentData.status === 'active' ? 'Akun Aktif' : displayValue(studentData.status)}
                </span>
              )}
            </div>
            {/* Tombol Ubah Data → redirect ke onboarding */}
            <Link href="/dashboard/student/onboarding">
              <Button variant="outline" size="sm" className="gap-1">
                <Edit className="w-4 h-4" /> Ubah Data
              </Button>
            </Link>
          </div>

          {/* Progress kelengkapan profil (read-only) */}
          <Separator className="my-4" />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Kelengkapan Profil</span>
              <span className={`font-semibold ${completionColor}`}>{completionScore}%</span>
            </div>
            <Progress value={completionScore} className="h-1.5" />
            {completionScore < 100 && (
              <p className="text-xs text-muted-foreground">
                Lengkapi profil Anda agar lebih mudah dicocokkan dengan pengajar.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== TABS ===== */}
      <div>
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

        {/* ===== TAB: Data Siswa ===== */}
        {activeProfileTab === 'siswa' && (
          <div className="space-y-6">
            {/* Informasi Pribadi */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4 text-primary" /> Informasi Pribadi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nama Lengkap</p>
                    <p className="font-medium">{displayValue(studentData.name)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{userEmail}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nomor Telepon</p>
                    <p className="font-medium">{displayValue(studentData.phone)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jenis Kelamin</p>
                    <p className="font-medium">{displayValue(studentData.gender)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tentang Saya</p>
                  <p className="font-medium whitespace-pre-wrap">{displayValue(studentData.bio)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Informasi Pembelajaran */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="w-4 h-4 text-primary" /> Informasi Pembelajaran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tingkat Kelas</p>
                    <p className="font-medium">{displayValue(studentData.grade_level)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jadwal Belajar</p>
                    <p className="font-medium">{displayValue(studentData.preferred_schedule)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mata Pelajaran</p>
                  {displaySubjects(studentData.subjects)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tujuan Belajar</p>
                  <p className="font-medium whitespace-pre-wrap">{displayValue(studentData.learning_goals)}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Budget per Bulan</p>
                    <p className="font-medium">{displayBudget(studentData.budget_per_month)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pertemuan per Bulan</p>
                    <p className="font-medium">
                      {studentData.sessions_per_month ? `${studentData.sessions_per_month}× sesi` : 'kosong'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lokasi */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4 text-primary" /> Lokasi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Alamat Lengkap</p>
                  <p className="font-medium">{displayValue(studentData.address)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kota / Kabupaten</p>
                  <p className="font-medium">{displayValue(studentData.city)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== TAB: Data Sekolah ===== */}
        {activeProfileTab === 'sekolah' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <School className="w-4 h-4 text-primary" /> Data Sekolah
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nama Sekolah</p>
                  <p className="font-medium">{displayValue(studentData.school_name)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jenjang Sekolah</p>
                  <p className="font-medium">{displayValue(studentData.school_type)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kota Sekolah</p>
                  <p className="font-medium">{displayValue(studentData.school_city)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alamat Sekolah</p>
                  <p className="font-medium">{displayValue(studentData.school_address)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== TAB: Data Orang Tua ===== */}
        {activeProfileTab === 'ortu' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-primary" /> Informasi Orang Tua / Wali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nama</p>
                  <p className="font-medium">{displayValue(studentData.parent_name)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hubungan</p>
                  <p className="font-medium">{displayValue(studentData.parent_relation)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{displayValue(studentData.parent_email)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telepon</p>
                  <p className="font-medium">{displayValue(studentData.parent_phone)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tombol ubah data di bagian bawah (opsional, sudah ada di header) */}
      <div className="flex justify-end">
        <Link href="/dashboard/student/onboarding">
          <Button variant="outline" className="gap-1">
            <Edit className="w-4 h-4" /> Ubah Data (via Onboarding)
          </Button>
        </Link>
      </div>
    </div>
  )
}