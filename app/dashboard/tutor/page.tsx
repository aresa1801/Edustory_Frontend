'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/auth'
import Link from 'next/link'
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

export default function TutorDashboard() {
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
  const [tutorName, setTutorName] = useState<string>('Pengajar')
  const [loading, setLoading] = useState(true)
  const [verifiedLevels, setVerifiedLevels] = useState<string[]>([])
  const [targetLevel, setTargetLevel] = useState<string | null>(null)
  const [allSubjects, setAllSubjects] = useState<string[]>([])
  const [hourlyRate, setHourlyRate] = useState<number | null>(null)
  const [qualifications, setQualifications] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const supabase = createClient()
        if (!supabase || typeof supabase.from !== 'function') {
          throw new Error('Supabase client tidak valid')
        }

        const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
          return Promise.race([
            promise,
            new Promise<T>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), ms)
            ),
          ])
        }

        const authResult = await withTimeout(supabase.auth.getUser(), 5000)
        const { data: authData, error: authError } = authResult
        if (authError || !authData?.user) {
          setLoading(false)
          return
        }
        const user = authData.user

        const [profileResult, tutorResult] = await Promise.all([
          withTimeout(
            Promise.resolve(
              supabase
                .from('user_profiles')
                .select('name')
                .eq('id', user.id)
                .maybeSingle()
            ),
            5000
          ),
          withTimeout(
            Promise.resolve(
              supabase
                .from('tutors')
                .select(
                  'id, specializations, experience_years, hourly_rate, qualifications, rating, total_reviews, verified_grade_levels, target_grade_level, specializations_sd, specializations_smp, specializations_sma'
                )
                .eq('user_id', user.id)
                .maybeSingle()
            ),
            5000
          ),
        ])

        if (!isMounted) return

        if (profileResult.data?.name) {
          setTutorName(profileResult.data.name)
        }

        const tutorData = tutorResult.data
        if (!tutorData) {
          setLoading(false)
          return
        }

        setVerifiedLevels(tutorData.verified_grade_levels || [])
        setTargetLevel(tutorData.target_grade_level || null)
        setHourlyRate(tutorData.hourly_rate || null)
        setQualifications(tutorData.qualifications || null)

        // Gabungkan semua spesialisasi dari SD, SMP, SMA dengan tipe eksplisit
        const subjectsSet = new Set<string>()
        if (tutorData.specializations_sd) {
          tutorData.specializations_sd.forEach((s: string) => subjectsSet.add(s))
        }
        if (tutorData.specializations_smp) {
          tutorData.specializations_smp.forEach((s: string) => subjectsSet.add(s))
        }
        if (tutorData.specializations_sma) {
          tutorData.specializations_sma.forEach((s: string) => subjectsSet.add(s))
        }
        if (tutorData.specializations) {
          tutorData.specializations.forEach((s: string) => subjectsSet.add(s))
        }
        setAllSubjects(Array.from(subjectsSet))

        const profileComplete = !!(
          tutorData.experience_years &&
          tutorData.hourly_rate &&
          tutorData.qualifications
        )
        const teachingInterestSet = !!(
          tutorData.specializations?.length > 0 ||
          tutorData.verified_grade_levels?.length > 0 ||
          subjectsSet.size > 0
        )

        let curationDone = 0
        let curationScore = 0
        let activeStudents = 0
        let pendingRequests = 0
        let completedSessions = 0

        try {
          const [progressRes, matchResult] = await Promise.all([
            withTimeout(fetch('/api/assessments/progress'), 5000),
            withTimeout(
              Promise.resolve(
                supabase
                  .from('matches')
                  .select('id, status')
                  .eq('tutor_id', tutorData.id)
              ),
              5000
            ),
          ])

          if (progressRes.ok) {
            const progressData = await progressRes.json()
            const completedSteps: string[] = progressData.progress?.completed_steps || []
            curationDone = completedSteps.length

            const weights: Record<string, number> = {
              psychology: 20,
              academic: 30,
              microteaching: 25,
              handwriting: 15,
              interview: 10,
            }
            const keys = ['psychology', 'academic', 'microteaching', 'handwriting', 'interview']
            let total = 0
            let totalWeight = 0
            keys.forEach((key: string) => {
              const score = progressData[key]?.score ?? progressData[key]?.overall_score
              if (score !== undefined) {
                total += (score * weights[key]) / 100
                totalWeight += weights[key]
              }
            })
            if (totalWeight > 0) curationScore = Math.round(total)
          }

          if (!matchResult.error && matchResult.data) {
            const matches = matchResult.data
            const activeStatuses = ['accepted', 'active', 'matched']
            activeStudents = matches.filter((m: { status: string }) => activeStatuses.includes(m.status)).length
            pendingRequests = matches.filter((m: { status: string }) => m.status === 'pending').length
            completedSessions = matches.filter((m: { status: string }) => m.status === 'completed').length
          }
        } catch (err) {
          console.warn('Gagal mengambil data sekunder:', err)
        }

        if (!isMounted) return

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
      } catch (error) {
        console.error('Gagal memuat data:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  // Helper untuk format mata pelajaran
  const formatSubjects = (subjects: string[]) => {
    if (subjects.length === 0) return 'Belum ada mata pelajaran'
    if (subjects.length <= 3) return subjects.join(', ')
    return subjects.slice(0, 3).join(', ') + ` +${subjects.length - 3} lagi`
  }

  // Bagian Namecard
  const renderNameCard = () => {
    const initial = tutorName.charAt(0).toUpperCase()
    const rate = hourlyRate ? `Rp ${hourlyRate.toLocaleString('id-ID')}/jam` : 'Belum diatur'
    const qual = qualifications || 'Belum diisi'

    return (
      <Card className="border shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 shadow-md">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground truncate">{tutorName}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="flex items-center text-sm text-muted-foreground">
                  <DollarSign className="w-4 h-4 mr-1 text-green-500" />
                  {rate}
                </span>
                <span className="flex items-center text-sm text-muted-foreground">
                  <Star className="w-4 h-4 mr-1 text-yellow-500" />
                  {stats.rating > 0 ? `${stats.rating.toFixed(1)} (${stats.totalReviews} ulasan)` : 'Belum ada rating'}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-muted-foreground flex items-start gap-1">
                  <Award className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                  <span className="break-words">{qual}</span>
                </p>
                <p className="text-sm text-muted-foreground flex items-start gap-1">
                  <School className="w-4 h-4 mt-0.5 text-green-400 flex-shrink-0" />
                  <span>
                    {verifiedLevels.length > 0
                      ? `Mengajar: ${verifiedLevels.sort().join(', ')}`
                      : targetLevel
                      ? `Target: ${targetLevel} (belum diverifikasi)`
                      : 'Kelas belum ditentukan'}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground flex items-start gap-1">
                  <BookMarked className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" />
                  <span>{formatSubjects(allSubjects)}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground border-t border-border/50 pt-2">
            <span className="bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full">Namecard untuk ditampilkan ke siswa</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Bagian Progress Kurasi
  const renderCurationProgress = () => {
    const percent = Math.round((stats.curationDone / stats.curationTotal) * 100)
    const isComplete = stats.curationComplete
    return (
      <Card className="border shadow-sm h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Progress Kurasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tahapan selesai</span>
            <span className="font-medium">{stats.curationDone} dari {stats.curationTotal}</span>
          </div>
          <Progress value={percent} className="h-2" />
          <p className="text-sm text-muted-foreground">{percent}% selesai</p>
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
        </CardContent>
      </Card>
    )
  }

  // Roadmap steps
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

      {/* Stat Cards (4) */}
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

      {/* Progress Kurasi + Namecard (2 kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderCurationProgress()}
        {renderNameCard()}
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
    </div>
  )
}