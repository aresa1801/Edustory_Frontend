'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Camera } from 'lucide-react'
import { AvatarUploader } from '@/components/AvatarUploader'
import {
  UserCircle,
  BookOpen,
  ClipboardList,
  Handshake,
  Calendar,
  BarChart3,
  CheckCircle2,
  Lock,
  ArrowRight,
  Users,
  Star,
  AlertTriangle,
  FileText,
  GraduationCap,
  Award,
  DollarSign,
  School,
  BookMarked,
  Clock,
} from 'lucide-react'

interface RoadmapStep {
  id: string
  step: number
  title: string
  description: string
  icon: React.ElementType
  href: string
  status: 'completed' | 'active' | 'locked'
  detail?: string
}

interface DashboardStats {
  profileComplete: boolean
  teachingInterestSet: boolean
  curationDone: number
  curationScore: number
  curationTotal: number
  curationComplete: boolean
  curationPassed: boolean
  activeStudents: number
  pendingRequests: number
  completedSessions: number
  rating: number
  totalReviews: number
}

const GRADE_LEVEL_ORDER = [
  'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
  'SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9',
  'SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12',
]

const getLevelColor = (level: string): string => {
  if (level.startsWith('SD')) return 'text-green-400'
  if (level.startsWith('SMP')) return 'text-orange-400'
  if (level.startsWith('SMA')) return 'text-red-400'
  return 'text-muted-foreground'
}

// Helper untuk tooltip kelas
const getLevelTooltip = (level: string): string => {
  if (level.startsWith('SD')) return 'Kelas SD'
  if (level.startsWith('SMP')) return 'Kelas SMP'
  if (level.startsWith('SMA')) return 'Kelas SMA'
  return ''
}

// Helper untuk tooltip mata pelajaran berdasarkan jenjang
const getSubjectTooltip = (subject: string, subjects: { sd: string[], smp: string[], sma: string[] }): string => {
  if (subjects.sd.includes(subject)) return 'Mata pelajaran SD'
  if (subjects.smp.includes(subject)) return 'Mata pelajaran SMP'
  if (subjects.sma.includes(subject)) return 'Mata pelajaran SMA'
  return ''
}

export default function TutorDashboard() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State untuk namecard
  const [tutorName, setTutorName] = useState<string>('Pengajar')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [verifiedLevels, setVerifiedLevels] = useState<string[]>([])
  const [targetLevel, setTargetLevel] = useState<string | null>(null)
  const [allSubjects, setAllSubjects] = useState<{ sd: string[], smp: string[], sma: string[] }>({
    sd: [],
    smp: [],
    sma: [],
  })
  const [hourlyRate, setHourlyRate] = useState<number | null>(null)
  const [qualifications, setQualifications] = useState<string | null>(null)
  const [experienceYears, setExperienceYears] = useState<number | null>(null)
  const [showCurationInfo, setShowCurationInfo] = useState(false)

  // State untuk avatar upload
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)

  // State untuk stats (profil, kurasi, dll)
  const [stats, setStats] = useState<DashboardStats>({
    profileComplete: false,
    teachingInterestSet: false,
    curationDone: 0,
    curationScore: 0,
    curationTotal: 5,
    curationComplete: false,
    curationPassed: false,
    activeStudents: 0,
    pendingRequests: 0,
    completedSessions: 0,
    rating: 0,
    totalReviews: 0,
  })

  // Ref untuk menghindari fetch ganda
  const isMounted = useRef(true)
  const fetchDone = useRef(false)

  // Fungsi fetch data (mirip dengan profile page)
  const fetchDashboardData = async (userId: string) => {
    if (fetchDone.current) return
    fetchDone.current = true

    try {
      console.log('[Dashboard] Fetching data for user:', userId)

      // Ambil data tutor via API route
      const params = new URLSearchParams({ user_id: userId })
      const response = await fetch(`/api/tutors/profile?${params.toString()}`)
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Gagal mengambil data tutor')
      }

      const { tutor: tutorData, email } = await response.json()
      console.log('[Dashboard] tutorData:', tutorData)

      if (!tutorData) {
        setError('Data tutor tidak ditemukan. Silakan lengkapi profil Anda.')
        setLoading(false)
        return
      }

      // --- Set state untuk namecard ---
      setTutorName(tutorData.full_name || 'Pengajar')
      setAvatarUrl(tutorData.avatar_url || null)
      setVerifiedLevels(tutorData.verified_grade_levels || [])
      setTargetLevel(tutorData.target_grade_level || null)
      setHourlyRate(tutorData.hourly_rate ?? null)
      setQualifications(tutorData.qualifications || null)
      setExperienceYears(tutorData.experience_years ?? null)
      setAllSubjects({
        sd: tutorData.specializations_sd || [],
        smp: tutorData.specializations_smp || [],
        sma: tutorData.specializations_sma || [],
      })

      // --- Hitung profileComplete & teachingInterestSet ---
      const profileComplete = !!(
        tutorData.experience_years &&
        tutorData.hourly_rate &&
        tutorData.qualifications
      )
      const teachingInterestSet = !!(
        (tutorData.verified_grade_levels?.length > 0) ||
        (tutorData.specializations_sd?.length > 0) ||
        (tutorData.specializations_smp?.length > 0) ||
        (tutorData.specializations_sma?.length > 0)
      )

      // --- Ambil data sekunder (kurasi & matches) via API jika perlu, atau langsung pakai nilai default ---
      let curationDone = 0
      let curationScore = 0
      let activeStudents = 0
      let pendingRequests = 0
      let completedSessions = 0

      // --- Set stats ---
      const curationComplete = curationDone >= 5
      const curationPassed = curationComplete && curationScore > 80

      setStats({
        profileComplete,
        teachingInterestSet,
        curationDone,
        curationScore,
        curationTotal: 5,
        curationComplete,
        curationPassed,
        activeStudents,
        pendingRequests,
        completedSessions,
        rating: tutorData.rating || 0,
        totalReviews: tutorData.total_reviews || 0,
      })

      setError(null)
    } catch (err) {
      console.error('[Dashboard] Error:', err)
      setError(err instanceof Error ? err.message : 'Gagal memuat data dashboard')
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    isMounted.current = true
    fetchDone.current = false

    if (authLoading) return

    if (!authUser) {
      setError('User tidak ditemukan. Silakan login ulang.')
      setLoading(false)
      return
    }

    fetchDashboardData(authUser.id)

    return () => {
      isMounted.current = false
    }
  }, [authLoading, authUser])

  // Fungsi helper untuk format
  const formatCurrency = (value: number | null) => {
    if (value === null) return 'Belum diatur'
    return `Rp ${value.toLocaleString('id-ID')}/jam`
  }

  const formatExperience = (years: number | null) => {
    if (years === null || years === 0) return 'Belum ada pengalaman'
    if (years === 1) return '1 tahun'
    return `${years} tahun`
  }

  // Render mata pelajaran dengan urutan hardcode: SD → SMP → SMA dan tooltip
  const renderSubjects = (subjects: { sd: string[], smp: string[], sma: string[] }) => {
    const sd = subjects.sd.slice().sort()
    const smp = subjects.smp.slice().sort()
    const sma = subjects.sma.slice().sort()
    const all = [...sd, ...smp, ...sma]
    if (all.length === 0) return <span className="text-muted-foreground">Belum ada mata pelajaran</span>

    return all.map((subject, idx) => {
      let color = 'text-muted-foreground'
      if (subjects.sd.includes(subject)) color = 'text-green-400'
      else if (subjects.smp.includes(subject)) color = 'text-orange-400'
      else if (subjects.sma.includes(subject)) color = 'text-red-400'

      const tooltip = getSubjectTooltip(subject, subjects)

      return (
        <span
          key={idx}
          className={`${color} text-sm`}
          title={tooltip}
        >
          {subject}
          {idx < all.length - 1 && <span className="text-muted-foreground">, </span>}
        </span>
      )
    })
  }

  // Render Namecard
  const renderNameCard = () => {
    const initial = tutorName.charAt(0).toUpperCase()
    const isCurationComplete = stats.curationComplete

    // Urutkan verifiedLevels berdasarkan GRADE_LEVEL_ORDER (SD→SMP→SMA)
    const sortedLevels = verifiedLevels.slice().sort((a, b) => {
      const idxA = GRADE_LEVEL_ORDER.indexOf(a)
      const idxB = GRADE_LEVEL_ORDER.indexOf(b)
      return idxA - idxB
    })

    return (
      <Card className="border shadow-sm hover:shadow-md transition-shadow h-full relative">
        {/* Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <Badge 
            className={`${isCurationComplete ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white text-xs px-2 py-0.5`}
          >
            {isCurationComplete ? 'Sudah Kurasi' : 'Belum Kurasi'}
          </Badge>
          <button
            onClick={() => setShowCurationInfo(!showCurationInfo)}
            className="w-5 h-5 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-xs font-bold">i</span>
          </button>
          {showCurationInfo && (
            <div className="absolute top-8 right-0 w-64 bg-popover border rounded-lg shadow-lg p-3 z-10 text-sm">
              <p className="text-foreground">
                {isCurationComplete 
                  ? 'Anda telah kurasi untuk mendapatkan kepercayaan lebih baik dari student.' 
                  : 'Anda belum kurasi, silakan melakukan kurasi terlebih dahulu untuk diverifikasi dan memberikan kepercayaan pada students!'}
              </p>
              {!isCurationComplete && (
                <Link href="/curation/progress" className="mt-2 inline-block w-full">
                  <Button size="sm" className="w-full">Kurasi</Button>
                </Link>
              )}
            </div>
          )}
        </div>

        <CardContent className="p-5">
          {/* Foto + Nama dengan klik untuk upload */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-md cursor-pointer relative group"
              onClick={() => setIsAvatarModalOpen(true)}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={tutorName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                initial
              )}
              {/* Overlay kamera saat hover */}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">{tutorName}</h3>
            </div>
          </div>

          <div className="border-t border-border/50 my-3" />

          {/* Tarif & Rating */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1">
            <span className="flex items-center text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4 mr-1 text-green-500" />
              {formatCurrency(hourlyRate)}
            </span>
            <span className="flex items-center text-sm text-muted-foreground">
              <Star className="w-4 h-4 mr-1 text-yellow-500" />
              {stats.rating > 0 ? `${stats.rating.toFixed(1)} (${stats.totalReviews} ulasan)` : 'Belum ada rating'}
            </span>
          </div>

          {/* Pengalaman */}
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <Clock className="w-4 h-4 mr-1 text-blue-400" />
            {formatExperience(experienceYears)}
          </div>

          {/* Kualifikasi & Kelas & Mata Pelajaran */}
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <Award className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
              <span className="break-words">{qualifications || 'Belum diisi'}</span>
            </p>

            {/* Kelas dengan urutan hardcode dan tooltip */}
            <p className="text-sm flex items-start gap-2">
              <School className="w-4 h-4 mt-0.5 text-green-400 flex-shrink-0" />
              <span>
                {sortedLevels.length > 0 ? (
                  sortedLevels.map((lvl, idx) => {
                    const tooltip = getLevelTooltip(lvl)
                    return (
                      <span key={idx} className={getLevelColor(lvl)} title={tooltip}>
                        {lvl}
                        {idx < sortedLevels.length - 1 && <span className="text-muted-foreground">, </span>}
                      </span>
                    )
                  })
                ) : targetLevel ? (
                  <span className="text-muted-foreground">Target: <span className="text-foreground">{targetLevel}</span> (belum diverifikasi)</span>
                ) : (
                  <span className="text-muted-foreground">Kelas belum ditentukan</span>
                )}
              </span>
            </p>

            {/* Mata pelajaran dengan urutan hardcode SD→SMP→SMA dan tooltip */}
            <p className="text-sm flex items-start gap-2">
              <BookMarked className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" />
              <span>
                {renderSubjects(allSubjects)}
              </span>
            </p>
          </div>

          {/* Tombol Edit */}
          <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2">
            <span className="text-xs text-muted-foreground bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full">
              Namecard untuk ditampilkan ke siswa
            </span>
            <div className="flex gap-2">
              <Link href="/dashboard/tutor/profile">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Edit Profil
                </Button>
              </Link>
              <Link href="/dashboard/tutor/teaching-interest">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Edit Minat Mengajar
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render Progress Kurasi (sama seperti sebelumnya, tambahkan tooltip di badge)
  const renderCurationProgress = () => {
    const percent = Math.round((stats.curationDone / stats.curationTotal) * 100)
    const isComplete = stats.curationComplete

    const sortedLevels = verifiedLevels.slice().sort((a, b) => {
      const idxA = GRADE_LEVEL_ORDER.indexOf(a)
      const idxB = GRADE_LEVEL_ORDER.indexOf(b)
      return idxA - idxB
    })

    return (
      <Card className="border shadow-sm h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Progress Kurasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tahapan selesai</span>
              <span className="font-medium">{stats.curationDone} dari {stats.curationTotal}</span>
            </div>
            <Progress value={percent} className="h-2" />
            <p className="text-sm text-muted-foreground">{percent}% selesai</p>
          </div>

          {isComplete ? (
            <Badge className="bg-green-500 hover:bg-green-600">✓ Kurasi Selesai</Badge>
          ) : (
            <Link href="/curation/progress">
              <Button size="sm" variant="outline" className="mt-1">
                Lanjutkan Kurasi <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          )}

          {stats.curationComplete && stats.curationScore > 0 && (
            <p className="text-sm font-medium text-blue-400">
              Skor: {stats.curationScore}/100 {stats.curationPassed ? '✅ Lulus' : '❌ Tidak Lulus (min. 80)'}
            </p>
          )}

          <div className="border-t border-border/50 pt-3 mt-2">
            {sortedLevels.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Anda terverifikasi mengajar kelas-kelas berikut:
                </p>
                <div className="flex flex-wrap gap-2">
                  {sortedLevels.map(lvl => {
                    const tooltip = getLevelTooltip(lvl)
                    return (
                      <Badge
                        key={lvl}
                        className={`${getLevelColor(lvl)} bg-opacity-20 border`}
                        title={tooltip}
                      >
                        ✓ {lvl}
                      </Badge>
                    )
                  })}
                </div>
                <p className="text-xs text-blue-300 bg-blue-500/10 p-2 rounded border border-blue-500/30">
                  💡 Setelah terverifikasi untuk kelas tertentu, Anda otomatis bisa mengajar
                  semua kelas di bawahnya.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Selesaikan semua 5 tahap kurasi untuk mendapatkan verifikasi mengajar.
                </p>
                <p className="text-xs text-muted-foreground">
                  Kelas yang Anda targetkan:{' '}
                  <span className="font-semibold text-foreground">
                    {targetLevel ?? '(pilih pada tes kemampuan akademik)'}
                  </span>
                </p>
                <p className="text-xs text-blue-300 bg-blue-500/10 p-2 rounded border border-blue-500/30">
                  💡 Setelah terverifikasi untuk kelas tertentu, Anda otomatis bisa mengajar
                  semua kelas di bawahnya.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Roadmap steps (sama seperti sebelumnya)
  const getRoadmapSteps = (): RoadmapStep[] => {
    const s1Active = true
    const s2Active = stats.profileComplete
    const s3Active = stats.profileComplete && stats.teachingInterestSet
    const s4Active = stats.curationPassed
    const s5Active = stats.activeStudents > 0
    const s6Active = true

    return [
      {
        id: 'profile',
        step: 1,
        title: 'Lengkapi Profil',
        description: 'Isi data diri, kualifikasi, pengalaman, dan tarif mengajar',
        icon: UserCircle,
        href: '/dashboard/tutor/profile',
        status: stats.profileComplete ? 'completed' : 'active',
        detail: stats.profileComplete ? 'Profil sudah lengkap' : 'Belum diisi',
      },
      {
        id: 'teaching-interest',
        step: 2,
        title: 'Minat Mengajar',
        description: 'Pilih kelas dan mata pelajaran yang ingin Anda ajarkan',
        icon: BookOpen,
        href: '/dashboard/tutor/teaching-interest',
        status: stats.teachingInterestSet ? 'completed' : s2Active ? 'active' : 'locked',
        detail: stats.teachingInterestSet ? 'Sudah diisi' : 'Belum diisi',
      },
      {
        id: 'curation',
        step: 3,
        title: 'Proses Kurasi',
        description: '5 tahapan verifikasi: Psikologi, Akademik, Micro Teaching, Tulisan Tangan & Interview',
        icon: ClipboardList,
        href: '/curation/progress',
        status: stats.curationComplete ? 'completed' : s3Active ? 'active' : 'locked',
        detail: stats.curationComplete
          ? `Skor: ${stats.curationScore}/100 — ${stats.curationPassed ? '✓ Lulus' : '✗ Tidak Lulus (min. 80)'}`
          : `${stats.curationDone}/5 tahap selesai`,
      },
      {
        id: 'student-offers',
        step: 4,
        title: 'Penawaran Siswa',
        description: 'Lihat & apply ke siswa yang mencari tutor sesuai bidang Anda',
        icon: Handshake,
        href: '/dashboard/tutor/student-offers',
        status: s4Active ? 'active' : 'locked',
        detail: stats.curationPassed
          ? `${stats.pendingRequests} permintaan menunggu`
          : 'Diperlukan skor kurasi > 80',
      },
      {
        id: 'schedule',
        step: 5,
        title: 'Jadwal Mengajar',
        description: 'Kelola jadwal sesi mengajar dengan siswa Anda',
        icon: Calendar,
        href: '/dashboard/tutor/schedule',
        status: s5Active ? 'active' : 'locked',
        detail: `${stats.activeStudents} siswa aktif`,
      },
      {
        id: 'analytics',
        step: 6,
        title: 'Analitik Performa',
        description: 'Pantau skor kepuasan siswa dan statistik mengajar Anda',
        icon: BarChart3,
        href: '/dashboard/tutor/analytics',
        status: s6Active ? 'active' : 'locked',
        detail: stats.rating > 0 ? `Rating: ★ ${stats.rating.toFixed(1)} (${stats.totalReviews} ulasan)` : 'Belum ada rating',
      },
    ]
  }

  const steps = getRoadmapSteps()
  const completedCount = steps.filter(s => s.status === 'completed').length
  const overallProgress = Math.round((completedCount / steps.length) * 100)

  const findNextActiveStep = () => {
    return steps.find(s => {
      if (s.status !== 'active') return false
      const prerequisites = steps.slice(0, s.step - 1)
      return !prerequisites.every(p => p.status === 'completed')
    }) ?? steps.find(s => s.status === 'active')
  }
  const nextStep = findNextActiveStep()

  // Render jika loading
  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat dashboard...</p>
      </div>
    )
  }

  // Render jika error
  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Refresh Halaman
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard Pengajar</h1>
        <p className="text-muted-foreground">
          Selamat datang, {tutorName}! Kelola permintaan siswa dan pencocokan pembelajaran Anda.
        </p>
      </div>

      {/* Alert jika kurasi belum complete */}
      {!stats.curationComplete && (
        <Alert className="mb-6 bg-amber-500/10 border-amber-500/30">
          <AlertDescription className="text-amber-300">
            ⚠️ Harap selesaikan semua tahapan kurasi agar bisa menerima permintaan dari siswa.{' '}
            <Link href="/curation/progress" className="font-medium underline">
              Lihat status kurasi →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Siswa Aktif</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeStudents}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Permintaan Masuk</p>
              <p className="text-2xl font-bold text-foreground">{stats.pendingRequests}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-300" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sesi Selesai</p>
              <p className="text-2xl font-bold text-foreground">{stats.completedSessions}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status Kurasi</p>
              <p className="text-2xl font-bold text-foreground">{stats.curationDone}/{stats.curationTotal}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Namecard + Progress Kurasi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderNameCard()}
        {renderCurationProgress()}
      </div>

      {/* Roadmap - hanya jika kurasi complete */}
      {stats.curationComplete && (
        <>
          <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Progress Keseluruhan</p>
                  <p className="text-4xl font-bold mt-1">{overallProgress}%</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-100 text-sm">Tahap Selesai</p>
                  <p className="text-4xl font-bold mt-1">{completedCount}/{steps.length}</p>
                </div>
              </div>
              <div className="w-full h-2 bg-blue-500/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              {nextStep && (
                <p className="text-blue-100 text-sm mt-3">
                  Langkah selanjutnya: <span className="font-semibold text-white">{nextStep.title}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {stats.curationPassed && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Siswa Aktif', value: stats.activeStudents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/20' },
                { label: 'Permintaan Baru', value: stats.pendingRequests, icon: Handshake, color: 'text-amber-400', bg: 'bg-amber-500/20' },
                { label: 'Sesi Selesai', value: stats.completedSessions, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20' },
                { label: 'Rating', value: stats.rating > 0 ? `★ ${stats.rating.toFixed(1)}` : '—', icon: Star, color: 'text-purple-400', bg: 'bg-purple-500/20' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <Card key={label} className="border-0 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-xl font-bold text-foreground">{value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Roadmap Steps */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Roadmap Pengajar</h2>
            <div className="space-y-3">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isCompleted = step.status === 'completed'
                const isLocked = step.status === 'locked'
                const isActive = step.status === 'active'

                return (
                  <div key={step.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                          isCompleted
                            ? 'bg-green-500 border-green-500 text-white'
                            : isActive
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-card border-border/50 text-muted-foreground'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : isLocked ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <span className="text-sm font-bold">{step.step}</span>
                        )}
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 mt-1 min-h-[24px] ${
                            isCompleted ? 'bg-green-500/50' : 'bg-border'
                          }`}
                        />
                      )}
                    </div>

                    <Card
                      className={`flex-1 mb-3 border shadow-sm transition-all ${
                        isCompleted
                          ? 'border-green-500/30 bg-green-500/10'
                          : isActive
                          ? 'border-blue-500/30 bg-blue-500/10 hover:border-blue-500/50 hover:shadow-md'
                          : 'border-border/30 bg-card/50 opacity-60'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isCompleted ? 'bg-green-500/20' : isActive ? 'bg-blue-500/20' : 'bg-muted/30'
                              }`}
                            >
                              <Icon
                                className={`w-5 h-5 ${
                                  isCompleted ? 'text-green-400' : isActive ? 'text-blue-400' : 'text-muted-foreground'
                                }`}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3
                                  className={`font-semibold text-sm ${
                                    isLocked ? 'text-muted-foreground' : 'text-foreground'
                                  }`}
                                >
                                  {step.title}
                                </h3>
                                {isCompleted && (
                                  <Badge className="text-[10px] bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/20">
                                    ✓ Selesai
                                  </Badge>
                                )}
                                {isLocked && (
                                  <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                                    Terkunci
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                              {step.detail && (
                                <p
                                  className={`text-xs mt-1.5 font-medium ${
                                    isCompleted
                                      ? 'text-green-400'
                                      : isActive
                                      ? 'text-blue-400'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  {step.detail}
                                </p>
                              )}
                              {step.id === 'curation' && !stats.curationPassed && stats.curationComplete && (
                                <div className="flex items-center gap-1 mt-2 text-amber-400">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span className="text-xs font-medium">Skor belum mencapai 80. Hubungi admin untuk info lebih lanjut.</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {!isLocked && (
                            <Link href={step.href} className="flex-shrink-0">
                              <Button
                                size="sm"
                                variant={isCompleted ? 'outline' : 'default'}
                                className={`text-xs gap-1.5 ${
                                  isCompleted
                                    ? 'border-green-500/30 text-green-300 hover:bg-green-500/10'
                                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                                }`}
                              >
                                {isCompleted ? 'Lihat' : 'Mulai'}
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Modal Avatar Upload */}
      <AvatarUploader
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onUploadComplete={(url) => {
          setAvatarUrl(url)
          setIsAvatarModalOpen(false)
        }}
        userId={authUser?.id || ''}
      />
    </div>
  )
}