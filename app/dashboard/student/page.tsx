'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import StudentBrowseTutors from '@/components/dashboard/student/browse-tutors'
import StudentMyMatches from '@/components/dashboard/student/my-matches'
import StudentProfile from '@/components/dashboard/student/student-profile'
import { createClient } from '@/lib/auth'
import Link from 'next/link'
import {
  Users, Clock, BookOpen, CheckCircle, Search,
  ArrowRight, Calendar, Star, Mail, Edit,
  UserCircle, School, BookMarked, MapPin, DollarSign
} from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Menunggu', color: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30' },
  matched:   { label: 'Dikonfirmasi', color: 'bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30' },
  active:    { label: 'Aktif', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30' },
  completed: { label: 'Selesai', color: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30' },
}

export default function StudentDashboard() {
  // State namecard – terpisah
  const [studentName, setStudentName] = useState<string>('Siswa')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [gradeLevel, setGradeLevel] = useState<string>('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [preferredSchedule, setPreferredSchedule] = useState<string>('')
  const [schoolAddress, setSchoolAddress] = useState<string>('')
  const [budgetPerMonth, setBudgetPerMonth] = useState<number>(0)
  const [sessionsPerMonth, setSessionsPerMonth] = useState<number>(0)
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false)
  const [userEmail, setUserEmail] = useState<string>('')

  const [matches, setMatches] = useState<any[]>([])
  const [tutorOffers, setTutorOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const isMounted = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    isMounted.current = true
    timeoutRef.current = setTimeout(() => {
      if (isMounted.current && loading) {
        console.warn('[Dashboard] ⏱️ Timeout fallback')
        setLoading(false)
        setError('Waktu pengambilan data habis, tampilkan data kosong.')
      }
    }, 5000)

    const fetchData = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.user) throw new Error('User tidak ditemukan')
          await processUser(session.user)
        } else {
          await processUser(user)
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Gagal memuat data')
          setLoading(false)
        }
      }
    }

    const processUser = async (user: any) => {
      try {
        setUserEmail(user.email || '')
        const res = await fetch(`/api/students/onboarding?user_id=${user.id}`)
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Gagal mengambil data siswa')
        }
        const { student } = await res.json()
        console.log('[Dashboard] studentData:', student)

        if (!isMounted.current) return

        if (student) {
          setStudentName(student.name || 'Siswa')
          setAvatarUrl(student.avatar_url || null)
          setGradeLevel(student.grade_level || '')
          setSubjects(student.subjects || [])
          setPreferredSchedule(student.preferred_schedule || '')
          setSchoolAddress(student.school_address || student.address || '')
          setBudgetPerMonth(student.budget_per_month || 0)
          setSessionsPerMonth(student.sessions_per_month || 0)
          setOnboardingComplete(student.onboarding_complete || false)

          // Ambil matches & offers (try-catch terpisah)
          try {
            const supabase = createClient()
            if (student.id) {
              const { data: md } = await supabase
                .from('matches')
                .select(`
                  id, status, subject, start_date, lesson_frequency,
                  tutors:tutor_id(hourly_rate, user_profiles:user_id(name))
                `)
                .eq('student_id', student.id)
                .order('start_date', { ascending: false })
                .limit(5)
              const { data: offers } = await supabase
                .from('matches')
                .select('id, status, subject, tutors:tutor_id(user_profiles:user_id(name))')
                .eq('student_id', student.id)
                .eq('initiated_by', 'tutor')
                .eq('status', 'pending')
              if (isMounted.current) {
                setMatches(md || [])
                setTutorOffers(offers || [])
              }
            }
          } catch (matchErr) {
            console.warn('[Dashboard] Matches fetch error:', matchErr)
          }
        } else {
          setStudentName(user.user_metadata?.full_name || 'Siswa')
          setOnboardingComplete(false)
        }

        if (isMounted.current) {
          setError(null)
          setLoading(false)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Gagal memuat data student')
          setLoading(false)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
        }
      }
    }

    fetchData()

    return () => {
      isMounted.current = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const costPerSession = budgetPerMonth && sessionsPerMonth
    ? Math.round(budgetPerMonth / sessionsPerMonth)
    : 0
  const learningMode = 'Online'

  const renderNameCard = () => {
    const initial = studentName.charAt(0).toUpperCase()

    return (
      <Card className="border shadow-sm hover:shadow-md transition-shadow h-full relative overflow-hidden">
        <CardHeader className="pb-1 pt-4">
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-primary" />
            Kartu Pelajar
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt={studentName} className="w-full h-full object-cover rounded-full" />
              ) : (
                initial
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">{studentName}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{userEmail || 'Email tidak tersedia'}</span>
              </p>
            </div>
          </div>
          <div className="border-t border-border/50 my-3" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1">
            <span className="flex items-center text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4 mr-1 text-green-500" />
              {costPerSession > 0 ? `Rp ${costPerSession.toLocaleString('id-ID')}/sesi` : 'Belum diatur'}
            </span>
            <span className="flex items-center text-sm text-muted-foreground">
              <span className={`inline-block w-2 h-2 rounded-full mr-1 ${learningMode === 'Online' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
              {learningMode}
            </span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <School className="w-4 h-4 mr-1 text-green-400 flex-shrink-0" />
            <span>{gradeLevel || 'Kelas belum ditentukan'}</span>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <BookMarked className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" />
              <span>
                {subjects.length > 0 ? subjects.join(', ') : 'Belum ada mata pelajaran'}
              </span>
            </p>
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
              <span>{schoolAddress || 'Alamat belum diisi'}</span>
            </p>
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 text-orange-400 flex-shrink-0" />
              <span>{preferredSchedule || 'Jadwal belum ditentukan'}</span>
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
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => window.location.reload()}>Refresh Halaman</Button>
        <div className="mt-4">
          <Link href="/dashboard/student/onboarding"><Button>Lengkapi Profil Sekarang</Button></Link>
        </div>
      </div>
    )
  }

  const activeMatches = matches.filter(m => ['matched', 'active'].includes(m.status))
  const pendingMatches = matches.filter(m => m.status === 'pending')
  const completedMatches = matches.filter(m => m.status === 'completed')

  const browseTab = useMemo(() => <StudentBrowseTutors />, [])
  const matchesTab = useMemo(() => <StudentMyMatches />, [])
  const profileTab = useMemo(() => <StudentProfile />, [])

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="p-3 bg-muted/30 border border-border rounded-md text-xs font-mono overflow-auto max-h-32">
        <p className="font-bold text-foreground">📊 DEBUG</p>
        <p>Student Name: <span className="text-green-400">{studentName}</span></p>
        <p>Grade: <span className="text-blue-400">{gradeLevel || '(kosong)'}</span></p>
        <p>Subjects: <span className="text-purple-400">{subjects.length > 0 ? subjects.join(', ') : '(kosong)'}</span></p>
        <p>Onboarding Complete: <span className={onboardingComplete ? 'text-green-400' : 'text-red-400'}>
          {onboardingComplete ? '✅' : '❌'}
        </span></p>
      </div>

      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard Siswa</h1>
        <p className="text-muted-foreground">Selamat datang, {studentName}!</p>
      </div>

      {!onboardingComplete && (
        <Alert className="mb-6 bg-amber-500/10 border-amber-500/30">
          <AlertDescription className="text-amber-700 dark:text-amber-300 flex items-center justify-between flex-wrap gap-2">
            <span>⚡ Lengkapi profil onboarding Anda untuk mulai mencari tutor terbaik!</span>
            <Link href="/dashboard/student/onboarding">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                Lengkapi Sekarang <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {tutorOffers.length > 0 && (
        <Alert className="mb-6 bg-blue-500/10 border-blue-500/30">
          <AlertDescription className="text-blue-700 dark:text-blue-300 flex items-center justify-between flex-wrap gap-2">
            <span>🎉 Ada <strong>{tutorOffers.length}</strong> tutor yang menawarkan diri!</span>
            <Link href="/dashboard/student/tutor-offers">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Lihat Penawaran <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="browse">Cari Pengajar</TabsTrigger>
          <TabsTrigger value="matches">
            Pengajar Saya
            {activeMatches.length > 0 && (
              <span className="ml-1 bg-primary text-white text-xs rounded-full px-1.5 py-0.5">{activeMatches.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="profile">Profil Saya</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pengajar Aktif</p>
                  <p className="text-2xl font-bold text-foreground">{activeMatches.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Menunggu</p>
                  <p className="text-2xl font-bold text-foreground">{pendingMatches.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sesi Selesai</p>
                  <p className="text-2xl font-bold text-foreground">{completedMatches.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mata Pelajaran</p>
                  <p className="text-2xl font-bold text-foreground">{subjects.length}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderNameCard()}
            <Card>
              <CardHeader><CardTitle className="text-base">Aksi Cepat</CardTitle></CardHeader>
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
                <button onClick={() => setActiveTab('browse')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Search className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Cari Pengajar</p>
                    <p className="text-xs text-muted-foreground">Temukan pengajar sesuai kebutuhan</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
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

          {matches.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('matches')} className="text-xs text-primary">
                  Lihat semua
                </Button>
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
                  <Button onClick={() => setActiveTab('browse')} className="bg-primary hover:bg-primary/90">
                    Cari Pengajar
                  </Button>
                  <Link href="/dashboard/student/tutor-offers">
                    <Button variant="outline">Lihat Penawaran Tutor</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="browse">{browseTab}</TabsContent>
        <TabsContent value="matches">{matchesTab}</TabsContent>
        <TabsContent value="profile">{profileTab}</TabsContent>
      </Tabs>
    </div>
  )
}