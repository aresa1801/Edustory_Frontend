'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/auth'
import Link from 'next/link'
import {
  Users, Clock, BookOpen, CheckCircle, Search,
  ArrowRight, Calendar, Star, Edit,
  UserCircle, School, BookMarked, MapPin, DollarSign,
  Camera
} from 'lucide-react'
import { AvatarUploader } from '@/components/AvatarUploader'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Menunggu', color: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30' },
  matched:   { label: 'Dikonfirmasi', color: 'bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30' },
  active:    { label: 'Aktif', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30' },
  completed: { label: 'Selesai', color: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30' },
}

// 🔥 Fungsi untuk mengecek kelengkapan data siswa
const isProfileComplete = (profile: any) => {
  if (!profile) return false
  return (
    profile.name &&
    profile.name !== 'Nama belum diisi' &&
    profile.grade_level &&
    profile.grade_level !== '' &&
    Array.isArray(profile.subjects) &&
    profile.subjects.length > 0 &&
    profile.preferred_schedule &&
    profile.preferred_schedule !== '' &&
    profile.budget_per_month &&
    profile.budget_per_month > 0 &&
    profile.sessions_per_month &&
    profile.sessions_per_month > 0 &&
    profile.address &&
    profile.address !== '' // ✅ ganti school_address menjadi address
  )
}

export default function StudentDashboard() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<any>({
    id: null,
    name: 'Siswa',
    grade_level: '',
    subjects: [],
    preferred_schedule: '',
    budget_per_month: 0,
    sessions_per_month: 0,
    address: '', // ✅ ganti school_address menjadi address
    avatar_url: null,
    onboarding_complete: false,
    status: 'active',
  })
  const [matches, setMatches] = useState<any[]>([])
  const [tutorOffers, setTutorOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)

  // 🔥 State untuk mode belajar (default Online)
  const [isOnline, setIsOnline] = useState(true)

  // 🔥 State untuk notifikasi pop-up
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')

  const fetchStudentData = async (userId: string) => {
    try {
      const response = await fetch(`/api/students/onboarding?user_id=${userId}`)
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Gagal memuat data')
      }
      const { student } = await response.json()
      return student
    } catch (err) {
      console.error('[DASHBOARD] ❌ Load data error:', err)
      return null
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!authUser) {
      setLoading(false)
      return
    }

    let isMounted = true

    const loadData = async () => {
      try {
        const studentData = await fetchStudentData(authUser.id)
        if (!isMounted) return

        if (studentData) {
          setProfile({
            id: studentData.id,
            name: studentData.name || 'Nama belum diisi',
            grade_level: studentData.grade_level || '',
            subjects: studentData.subjects || [],
            preferred_schedule: studentData.preferred_schedule || '',
            budget_per_month: studentData.budget_per_month || 0,
            sessions_per_month: studentData.sessions_per_month || 0,
            address: studentData.address || studentData.school_address || '', // ✅ fallback
            avatar_url: studentData.avatar_url || null,
            onboarding_complete: studentData.onboarding_complete || false,
            status: studentData.status || 'active',
          })
        } else {
          setProfile({
            id: null,
            name: authUser.user_metadata?.full_name || authUser.email || 'Siswa',
            grade_level: '',
            subjects: [],
            preferred_schedule: '',
            budget_per_month: 0,
            sessions_per_month: 0,
            address: '', // ✅ ganti
            avatar_url: null,
            onboarding_complete: false,
            status: 'active',
          })
        }

        // Ambil matches jika ada student id
        if (studentData?.id) {
          const supabase = createClient()
          const { data: md, error: mdError } = await supabase
            .from('matches')
            .select(`
              id, status, subject, start_date, lesson_frequency,
              tutors:tutor_id(hourly_rate, user_profiles:user_id(name))
            `)
            .eq('student_id', studentData.id)
            .order('start_date', { ascending: false })
            .limit(5)
          if (!mdError) setMatches(md || [])

          const { data: offers, error: offersError } = await supabase
            .from('matches')
            .select('id, status, subject, tutors:tutor_id(user_profiles:user_id(name))')
            .eq('student_id', studentData.id)
            .eq('initiated_by', 'tutor')
            .eq('status', 'pending')
          if (!offersError) setTutorOffers(offers || [])
        }

      } catch (err) {
        console.error('[DASHBOARD] ❌ Error:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[DASHBOARD] ⚠️ Force loading false after 5s')
        setLoading(false)
      }
    }, 5000)

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [authUser, authLoading])

  // 🔥 Efek untuk menampilkan notifikasi saat mode berubah
  useEffect(() => {
    const message = isOnline ? 'Mode Pembelajaran Online' : 'Mode Pembelajaran Offline'
    setNotificationMessage(message)
    setShowNotification(true)
    const timer = setTimeout(() => {
      setShowNotification(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [isOnline])

  // 🔥 Handle avatar upload
  const handleAvatarUpload = async (url: string) => {
    if (!authUser) {
      console.error('[DASHBOARD] No authenticated user')
      alert('Silakan login terlebih dahulu')
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('students')
        .update({ avatar_url: url })
        .eq('user_id', authUser.id)
      if (error) throw error
      setProfile((prev: any) => ({ ...prev, avatar_url: url }))
      console.log('[DASHBOARD] Avatar updated successfully')
    } catch (err) {
      console.error('[DASHBOARD] Failed to update avatar:', err)
      alert('Gagal memperbarui foto profil')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner className="h-10 w-10 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat dashboard...</p>
      </div>
    )
  }

  if (!authUser) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Silakan login untuk mengakses dashboard.</p>
        <Link href="/auth/login">
          <Button className="mt-4">Login</Button>
        </Link>
      </div>
    )
  }

  const activeMatches = matches.filter(m => ['matched', 'active'].includes(m.status))
  const pendingMatches = matches.filter(m => m.status === 'pending')
  const completedMatches = matches.filter(m => m.status === 'completed')

  const costPerSession = profile?.budget_per_month && profile?.sessions_per_month
    ? Math.round(profile.budget_per_month / profile.sessions_per_month)
    : 0

  // 🔥 Toggle mode
  const toggleMode = () => setIsOnline(prev => !prev)

  // 🔥 Cek kelengkapan data menggunakan fungsi isProfileComplete
  const profileComplete = isProfileComplete(profile)

  return (
    <div className="space-y-6 relative">
      {/* 🔥 NOTIFIKASI POP-UP */}
      {showNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 text-white px-6 py-3 rounded-lg shadow-lg text-center transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-top-5">
          <p className="text-sm font-medium">{notificationMessage}</p>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard Siswa</h1>
        <p className="text-muted-foreground text-sm">
          Selamat datang, <span className="font-medium text-foreground">{profile?.name || 'Siswa'}</span>! Kelola pembelajaran Anda di sini.
        </p>
      </div>

      {/* 🔥 Notifikasi onboarding – HANYA muncul jika data TIDAK lengkap */}
      {!profileComplete && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-amber-700 dark:text-amber-300">⚡ Lengkapi profil onboarding Anda untuk mulai mencari tutor terbaik!</span>
            <Link href="/dashboard/student/onboarding">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                Lengkapi Sekarang <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {tutorOffers.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-blue-700 dark:text-blue-300">🎉 Ada <strong>{tutorOffers.length}</strong> tutor yang menawarkan diri untuk mengajar Anda!</span>
            <Link href="/dashboard/student/tutor-offers">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Lihat Penawaran <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pengajar Aktif</p>
              <p className="text-2xl font-bold">{activeMatches.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Menunggu</p>
              <p className="text-2xl font-bold">{pendingMatches.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sesi Selesai</p>
              <p className="text-2xl font-bold">{completedMatches.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mata Pelajaran</p>
              <p className="text-2xl font-bold">{profile?.subjects?.length ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Namecard + Aksi Cepat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kartu Pelajar */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow h-full relative overflow-hidden">
          <CardHeader className="pb-1 pt-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-primary" />
              Kartu Pelajar
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${!isOnline ? 'text-muted-foreground' : 'text-primary'}`}>
                Online
              </span>
              <button
                onClick={toggleMode}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isOnline ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={isOnline}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    isOnline ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className={`text-xs font-medium ${isOnline ? 'text-muted-foreground' : 'text-primary'}`}>
                Offline
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-5 pt-2">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-md cursor-pointer relative group"
                onClick={() => setIsAvatarModalOpen(true)}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  profile?.name?.[0]?.toUpperCase() || '?'
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">
                  {profile?.name || 'Nama belum diisi'}
                </h3>
              </div>
            </div>

            <div className="border-t border-border/50 my-3" />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1">
              <span className="flex items-center text-sm text-muted-foreground">
                <DollarSign className="w-4 h-4 mr-1 text-green-500" />
                {costPerSession > 0 ? `Rp ${costPerSession.toLocaleString('id-ID')}/jam` : 'Belum diatur'}
              </span>
            </div>

            <div className="flex items-center text-sm text-muted-foreground mb-2">
              <School className="w-4 h-4 mr-1 text-green-400 flex-shrink-0" />
              <span>{profile?.grade_level || 'Kelas belum ditentukan'}</span>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <BookMarked className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" />
                <span>
                  {profile?.subjects?.length > 0 ? (
                    profile.subjects.join(', ')
                  ) : (
                    <span className="text-muted-foreground">Belum ada mata pelajaran</span>
                  )}
                </span>
              </p>

              {/* ✅ Ubah label dan gunakan address */}
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                <span>{profile?.address || 'Alamat rumah belum diisi'}</span>
              </p>

              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 text-orange-400 flex-shrink-0" />
                <span>{profile?.preferred_schedule || 'Jadwal belum ditentukan'}</span>
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2">
              <span className="text-xs text-muted-foreground bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full">
                Namecard untuk ditampilkan ke tutor
              </span>
              <Link href="/dashboard/student/onboarding">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Edit className="w-3 h-3 mr-1" /> Edit Profil
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Aksi Cepat */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/student/tutor-offers" className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-300" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Penawaran Tutor</p>
                <p className="text-xs text-muted-foreground">
                  {tutorOffers.length > 0 ? `${tutorOffers.length} tutor menawarkan diri` : 'Lihat tutor yang tertarik mengajar Anda'}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link href="/dashboard/student/find-tutors" className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Search className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Cari Pengajar</p>
                <p className="text-xs text-muted-foreground">Temukan pengajar sesuai kebutuhan</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link href="/dashboard/student/schedule" className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-300" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Jadwal Belajar</p>
                <p className="text-xs text-muted-foreground">Lihat jadwal sesi belajar Anda</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link href="/dashboard/student/analytics" className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-300" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Analitik & Nilai</p>
                <p className="text-xs text-muted-foreground">Beri penilaian kepada tutor Anda</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Matches */}
      {matches.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
            <Link href="/dashboard/student/matches">
              <Button variant="ghost" size="sm" className="text-xs text-primary">
                Lihat semua
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {matches.slice(0, 4).map(match => {
              const statusCfg = STATUS_LABEL[match.status] || { label: match.status, color: 'bg-slate-500/20 text-slate-300 border border-slate-500/30' }
              return (
                <div key={match.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{match.subject}</p>
                    <p className="text-xs text-muted-foreground">Pengajar: {match.tutors?.user_profiles?.name || '—'}</p>
                    {match.start_date && (
                      <p className="text-xs text-muted-foreground">
                        Mulai: {new Date(match.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-3 ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {matches.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Search className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-medium">Belum ada pengajar terdaftar</p>
              <p className="text-sm text-muted-foreground">Mulai cari pengajar atau tunggu penawaran dari tutor</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Link href="/dashboard/student/find-tutors">
                <Button className="bg-primary hover:bg-primary/90">
                  Cari Pengajar
                </Button>
              </Link>
              <Link href="/dashboard/student/tutor-offers">
                <Button variant="outline">Lihat Penawaran Tutor</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Avatar Upload */}
      <AvatarUploader
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onUploadComplete={handleAvatarUpload}
        userId={authUser?.id || ''}
        role="student"
      />
    </div>
  )
}