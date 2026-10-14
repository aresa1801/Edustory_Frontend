'use client'

import { useState, useEffect } from 'react'
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
import { PageHeader, StatCard, SectionCard, EmptyState, TonePill } from '@/components/dashboard/ui'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Menunggu', color: 'bg-warning/10 text-warning border border-warning/20' },
  matched:   { label: 'Dikonfirmasi', color: 'bg-success/10 text-success border border-success/20' },
  active:    { label: 'Aktif', color: 'bg-primary/10 text-primary border border-primary/20' },
  completed: { label: 'Selesai', color: 'bg-muted text-muted-foreground border border-border' },
  cancelled: { label: 'Dibatalkan', color: 'bg-destructive/10 text-destructive border border-destructive/20' },
}

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
    profile.address !== ''
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
    address: '',
    avatar_url: null,
    onboarding_complete: false,
    status: 'active',
    is_online: true,
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

  // 🔥 Fungsi update status online/offline ke database
  const updateOnlineStatus = async (newStatus: boolean) => {
    if (!authUser) return
    try {
      const res = await fetch('/api/students/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: authUser.id, is_online: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal update status')
      }
      // Update state lokal setelah berhasil
      setIsOnline(newStatus)
      // Update juga di profile untuk konsistensi
      setProfile((prev: any) => ({ ...prev, is_online: newStatus }))
    } catch (err) {
      console.error('[DASHBOARD] Gagal update status:', err)
      alert('Gagal mengubah status. Silakan coba lagi.')
      // Rollback toggle jika gagal
      setIsOnline(!newStatus)
    }
  }

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
            address: studentData.address || studentData.school_address || '',
            avatar_url: studentData.avatar_url || null,
            onboarding_complete: studentData.onboarding_complete || false,
            status: studentData.status || 'active',
            is_online: studentData.is_online ?? true,
          })
          setIsOnline(studentData.is_online ?? true)
        } else {
          setProfile({
            id: null,
            name: authUser.user_metadata?.full_name || authUser.email || 'Siswa',
            grade_level: '',
            subjects: [],
            preferred_schedule: '',
            budget_per_month: 0,
            sessions_per_month: 0,
            address: '',
            avatar_url: null,
            onboarding_complete: false,
            status: 'active',
            is_online: true,
          })
          setIsOnline(true)
        }

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

  // 🔥 Efek untuk menampilkan notifikasi saat mode berubah (hanya dari toggle, bukan dari load)
  useEffect(() => {
    // Kita hanya tampilkan notifikasi jika state berubah (bukan inisialisasi)
    // Gunakan ref untuk skip pertama kali atau cukup tampilkan selalu
    const message = isOnline ? 'Mode Pembelajaran Online' : 'Mode Pembelajaran Offline'
    setNotificationMessage(message)
    setShowNotification(true)
    const timer = setTimeout(() => {
      setShowNotification(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [isOnline])

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
      <div className="surface mx-auto max-w-md">
        <EmptyState
          title="Silakan login untuk mengakses dashboard."
          action={
            <Link href="/auth/login">
              <Button>Login</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const activeMatches = matches.filter(m => ['matched', 'active'].includes(m.status))
  const pendingMatches = matches.filter(m => m.status === 'pending')
  const completedMatches = matches.filter(m => m.status === 'completed')

  const costPerSession = profile?.budget_per_month && profile?.sessions_per_month
    ? Math.round(profile.budget_per_month / profile.sessions_per_month)
    : 0

  // 🔥 Toggle mode dengan update database
  const toggleMode = () => {
    const newStatus = !isOnline
    // Optimistic update
    setIsOnline(newStatus)
    // Kirim ke server
    updateOnlineStatus(newStatus)
  }

  const profileComplete = isProfileComplete(profile)

  return (
    <div className="relative space-y-6 animate-fade-in">
      {showNotification && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full border border-border/70 bg-card/95 px-6 py-3 text-center text-foreground shadow-lifted backdrop-blur transition-all duration-300 ease-in-out">
          <p className="text-sm font-medium">{notificationMessage}</p>
        </div>
      )}

      <PageHeader
        eyebrow="Portal Siswa"
        title="Dashboard Siswa"
        description={
          <>
            Selamat datang, <span className="font-medium text-foreground">{profile?.name || 'Siswa'}</span>! Kelola pembelajaran Anda di sini.
          </>
        }
      />

      {!profileComplete && (
        <div className="surface-gradient flex flex-wrap items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2 text-warning">
            <span>⚡ Lengkapi profil onboarding Anda untuk mulai mencari tutor terbaik!</span>
          </div>
          <Link href="/dashboard/student/onboarding">
            <Button size="sm" className="bg-warning text-white hover:bg-warning/90">
              Lengkapi Sekarang <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {tutorOffers.length > 0 && (
        <div className="surface-gradient flex flex-wrap items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2 text-primary">
            <span>🎉 Ada <strong>{tutorOffers.length}</strong> tutor yang menawarkan diri untuk mengajar Anda!</span>
          </div>
          <Link href="/dashboard/student/tutor-offers">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Lihat Penawaran <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pengajar Aktif" value={activeMatches.length} icon={Users} tone="primary" />
        <StatCard label="Menunggu" value={pendingMatches.length} icon={Clock} tone="accent" />
        <StatCard label="Sesi Selesai" value={completedMatches.length} icon={CheckCircle} tone="secondary" />
        <StatCard label="Mata Pelajaran" value={profile?.subjects?.length ?? 0} icon={BookOpen} tone="muted" />
      </div>

      {/* Namecard + Aksi Cepat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kartu Pelajar */}
        <div className="surface-gradient hover-card relative h-full overflow-hidden">
          <div className="flex flex-row items-center justify-between p-5 pb-1">
            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <UserCircle className="h-5 w-5 text-primary" />
              Kartu Pelajar
            </h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${!isOnline ? 'text-muted-foreground' : 'text-primary'}`}>
                Online
              </span>
              <button
                onClick={toggleMode}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isOnline ? 'bg-primary' : 'bg-muted-foreground/30'
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
          </div>

          <div className="p-5 pt-2">
            <div className="flex items-center gap-4">
              <div
                className="group relative flex h-16 w-16 flex-shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-white shadow-soft"
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
                <DollarSign className="w-4 h-4 mr-1 text-success" />
                {costPerSession > 0 ? `Rp ${costPerSession.toLocaleString('id-ID')}/jam` : 'Belum diatur'}
              </span>
            </div>

            <div className="flex items-center text-sm text-muted-foreground mb-2">
              <School className="w-4 h-4 mr-1 text-success flex-shrink-0" />
              <span>{profile?.grade_level || 'Kelas belum ditentukan'}</span>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <BookMarked className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>
                  {profile?.subjects?.length > 0 ? (
                    profile.subjects.join(', ')
                  ) : (
                    <span className="text-muted-foreground">Belum ada mata pelajaran</span>
                  )}
                </span>
              </p>

              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>{profile?.address || 'Alamat rumah belum diisi'}</span>
              </p>

              <p className="text-sm text-muted-foreground flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
                <span>{profile?.preferred_schedule || 'Jadwal belum ditentukan'}</span>
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2">
              <TonePill tone="primary">
                Namecard untuk ditampilkan ke tutor
              </TonePill>
              <Link href="/dashboard/student/onboarding">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <Edit className="mr-1 h-3 w-3" /> Edit Profil
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Aksi Cepat */}
        <SectionCard title="Aksi Cepat" bodyClassName="space-y-2">
            <Link href="/dashboard/student/tutor-offers" className="card-hover flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-inset ring-accent/20">
                <Star className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Penawaran Tutor</p>
                <p className="text-xs text-muted-foreground">
                  {tutorOffers.length > 0 ? `${tutorOffers.length} tutor menawarkan diri` : 'Lihat tutor yang tertarik mengajar Anda'}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link href="/dashboard/student/find-tutors" className="card-hover flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15">
                <Search className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Cari Pengajar</p>
                <p className="text-xs text-muted-foreground">Temukan pengajar sesuai kebutuhan</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link href="/dashboard/student/schedule" className="card-hover flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Jadwal Belajar</p>
                <p className="text-xs text-muted-foreground">Lihat jadwal sesi belajar Anda</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link href="/dashboard/student/analytics" className="card-hover flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-success/10 ring-1 ring-inset ring-success/15">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Analitik & Nilai</p>
                <p className="text-xs text-muted-foreground">Beri penilaian kepada tutor Anda</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
        </SectionCard>
      </div>

      {matches.length > 0 && (
        <SectionCard
          title="Aktivitas Terbaru"
          bodyClassName="space-y-2"
          actions={
            <Link href="/dashboard/student/matches">
              <Button variant="ghost" size="sm" className="text-xs text-primary">
                Lihat semua
              </Button>
            </Link>
          }
        >
          {matches.slice(0, 4).map(match => {
            const statusCfg = STATUS_LABEL[match.status] || { label: match.status, color: 'bg-muted text-muted-foreground border border-border' }
            return (
              <div key={match.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-3 transition-colors hover:bg-muted/30">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{match.subject}</p>
                  <p className="text-xs text-muted-foreground">Pengajar: {match.tutors?.user_profiles?.name || '—'}</p>
                  {match.start_date && (
                    <p className="text-xs text-muted-foreground">
                      Mulai: {new Date(match.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <span className={`ml-3 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                  {statusCfg.label}
                </span>
              </div>
            )
          })}
        </SectionCard>
      )}

      {matches.length === 0 && (
        <div className="surface">
          <EmptyState
            icon={Search}
            title="Belum ada pengajar terdaftar"
            description="Mulai cari pengajar atau tunggu penawaran dari tutor"
            action={
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
            }
          />
        </div>
      )}

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