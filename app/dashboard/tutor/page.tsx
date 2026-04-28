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
  Inbox,
  GraduationCap,
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

// Grade level hierarchy from lowest to highest
const GRADE_LEVEL_ORDER = [
  'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
  'SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9',
  'SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12',
]

const ACTIVE_MATCH_STATUSES = ['accepted', 'active', 'matched'] as const

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('id', user.id)
          .single()

        if (profileData?.name) setTutorName(profileData.name)

        const { data: tutorData } = await supabase
          .from('tutors')
          .select(`
            id,
            specializations,
            experience_years,
            hourly_rate,
            qualifications,
            rating,
            total_reviews,
            verified_grade_levels,
            target_grade_level
          `)
          .eq('user_id', user.id)
          .single()

        if (!tutorData) return

        setVerifiedLevels(tutorData.verified_grade_levels || [])
        setTargetLevel(tutorData.target_grade_level || null)

        const profileComplete = !!(
          tutorData.experience_years &&
          tutorData.hourly_rate &&
          tutorData.qualifications
        )
        const teachingInterestSet = !!(
          tutorData.specializations?.length > 0 ||
          tutorData.verified_grade_levels?.length > 0
        )

        // Fetch curation progress
        let curationDone = 0
        let curationScore = 0
        try {
          const progressRes = await fetch('/api/assessments/progress')
          if (progressRes.ok) {
            const progressData = await progressRes.json()
            const completedSteps: string[] = progressData.progress?.completed_steps || []
            curationDone = completedSteps.length

            // Calculate weighted score
            const weights: Record<string, number> = {
              psychology: 20,
              academic: 30,
              microteaching: 25,
              handwriting: 15,
              interview: 10,
            }
            const assessmentKeys = ['psychology', 'academic', 'microteaching', 'handwriting', 'interview']
            let total = 0
            let totalWeight = 0
            assessmentKeys.forEach(key => {
              const score =
                progressData[key]?.score ??
                progressData[key]?.overall_score
              if (score !== undefined) {
                total += (score * weights[key]) / 100
                totalWeight += weights[key]
              }
            })
            if (totalWeight > 0) curationScore = Math.round(total)
          }
        } catch {}

        const curationComplete = curationDone >= 5
        const curationPassed = curationComplete && curationScore > 80

        // Fetch matches
        const { data: matchData } = await supabase
          .from('matches')
          .select('id, status')
          .eq('tutor_id', tutorData.id)

        setStats({
          profileComplete,
          teachingInterestSet,
          curationDone,
          curationScore,
          curationTotal: 5,
          curationComplete,
          curationPassed,
          activeStudents: (matchData || []).filter(m => (ACTIVE_MATCH_STATUSES as readonly string[]).includes(m.status)).length,
          pendingRequests: (matchData || []).filter(m => m.status === 'pending').length,
          completedSessions: (matchData || []).filter(m => m.status === 'completed').length,
          rating: tutorData.rating || 0,
          totalReviews: tutorData.total_reviews || 0,
        })
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!stats.curationComplete) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Dashboard Pengajar
          </h1>
          <p className="text-muted-foreground">
            Selamat datang, {tutorName}! Kelola permintaan siswa dan pencocokan pembelajaran Anda.
          </p>
        </div>

        {!stats.curationComplete && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-800">
              ⚠️ Harap selesaikan semua tahapan kurasi agar bisa menerima permintaan dari siswa.{' '}
              <Link href="/curation/progress" className="font-medium underline">
                Lihat status kurasi →
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Siswa Aktif</p>
                <p className="text-2xl font-bold text-foreground">{stats.activeStudents}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Permintaan Masuk</p>
                <p className="text-2xl font-bold text-foreground">{stats.pendingRequests}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sesi Selesai</p>
                <p className="text-2xl font-bold text-foreground">{stats.completedSessions}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status Kurasi</p>
                <p className="text-2xl font-bold text-foreground">{stats.curationDone}/{stats.curationTotal}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Curation Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Progress Kurasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tahapan selesai</span>
                  <span className="font-medium">{stats.curationDone} dari {stats.curationTotal}</span>
                </div>
                <Progress value={Math.round((stats.curationDone / stats.curationTotal) * 100)} className="h-2" />
                <p className="text-sm text-muted-foreground">{Math.round((stats.curationDone / stats.curationTotal) * 100)}% selesai</p>
                {stats.curationComplete ? (
                  <Badge className="bg-green-500 hover:bg-green-600">✓ Kurasi Selesai</Badge>
                ) : (
                  <Link href="/curation/progress">
                    <Button size="sm" variant="outline" className="mt-2">
                      Lanjutkan Kurasi <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grade Level Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Kelas yang Diverifikasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {verifiedLevels.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Anda terverifikasi mengajar kelas-kelas berikut:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {GRADE_LEVEL_ORDER.filter(lvl => verifiedLevels.includes(lvl)).map(lvl => (
                      <Badge key={lvl} className="bg-green-100 text-green-700 border-green-300">
                        ✓ {lvl}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Selesaikan semua 5 tahap kurasi untuk mendapatkan verifikasi mengajar.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Kelas yang Anda targetkan:{' '}
                    <span className="font-semibold text-foreground">
                      {targetLevel ?? '(pilih pada tes kemampuan akademik)'}
                    </span>
                  </p>
                  <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                    💡 Setelah terverifikasi untuk kelas tertentu, Anda otomatis bisa mengajar
                    semua kelas di bawahnya.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ====== CURATION COMPLETE: SHOW ROADMAP ======
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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Selamat datang, {tutorName}! 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Ikuti roadmap berikut untuk mulai mengajar di EduStory.
        </p>
      </div>

      {/* Overall Progress */}
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
          {nextStep && !stats.curationComplete && (
            <p className="text-blue-100 text-sm mt-3">
              Langkah selanjutnya: <span className="font-semibold text-white">{nextStep.title}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {stats.curationPassed && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Siswa Aktif', value: stats.activeStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Permintaan Baru', value: stats.pendingRequests, icon: Handshake, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Sesi Selesai', value: stats.completedSessions, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Rating', value: stats.rating > 0 ? `★ ${stats.rating.toFixed(1)}` : '—', icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-xl font-bold text-slate-900">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Roadmap Steps */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Roadmap Pengajar</h2>
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
                        : 'bg-white border-slate-200 text-slate-300'
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
                        isCompleted ? 'bg-green-300' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>

                <Card
                  className={`flex-1 mb-3 border shadow-sm transition-all ${
                    isCompleted
                      ? 'border-green-200 bg-green-50/50'
                      : isActive
                      ? 'border-blue-200 bg-blue-50/30 hover:border-blue-300 hover:shadow-md'
                      : 'border-slate-200 bg-white opacity-60'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isCompleted ? 'bg-green-100' : isActive ? 'bg-blue-100' : 'bg-slate-100'
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-slate-400'
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className={`font-semibold text-sm ${
                                isLocked ? 'text-slate-400' : 'text-slate-800'
                              }`}
                            >
                              {step.title}
                            </h3>
                            {isCompleted && (
                              <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                                ✓ Selesai
                              </Badge>
                            )}
                            {isLocked && (
                              <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200">
                                Terkunci
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                          {step.detail && (
                            <p
                              className={`text-xs mt-1.5 font-medium ${
                                isCompleted
                                  ? 'text-green-600'
                                  : isActive
                                  ? 'text-blue-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {step.detail}
                            </p>
                          )}
                          {step.id === 'curation' && !stats.curationPassed && stats.curationComplete && (
                            <div className="flex items-center gap-1 mt-2 text-amber-600">
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
                                ? 'border-green-200 text-green-700 hover:bg-green-50'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
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
    </div>
  )
}
