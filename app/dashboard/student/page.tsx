'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
import {
  Users, Clock, BookOpen, CheckCircle, Search,
  ArrowRight, Calendar, Star
} from 'lucide-react'
import Link from 'next/link'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Menunggu', color: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30' },
  matched:   { label: 'Dikonfirmasi', color: 'bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30' },
  active:    { label: 'Aktif', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30' },
  completed: { label: 'Selesai', color: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30' },
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState<any>({ name: 'Siswa', email: '' })
  const [matches, setMatches] = useState<any[]>([])
  const [tutorOffers, setTutorOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const isMounted = useRef(true)
  const fetchDone = useRef(false)
  const timeoutId = useRef<NodeJS.Timeout | null>(null)

  // Fetch profile data (can be called multiple times)
  const fetchProfileData = async () => {
    try {
      console.log('[Dashboard] 🔄 Fetching data...')
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('User tidak ditemukan')

      // Ambil user_profiles (maybeSingle)
      const { data: up, error: upError } = await supabase
        .from('user_profiles')
        .select('name, email')
        .eq('id', user.id)
        .maybeSingle()
      if (upError) throw upError

      const profileData = up || { name: user.user_metadata?.full_name || user.email, email: user.email }

      // Ambil students
      const { data: sd, error: sdError } = await supabase
        .from('students')
        .select('id, grade_level, subjects, status, budget_per_month, sessions_per_month, onboarding_complete')
        .eq('user_id', user.id)
        .maybeSingle()
      if (sdError) throw sdError

      if (!isMounted.current) return

      // Gabungkan profile dan student
      setProfile({ ...profileData, ...sd })

      if (sd?.id) {
        // Ambil matches
        const { data: md, error: mdError } = await supabase
          .from('matches')
          .select(`
            id, status, subject, start_date, lesson_frequency,
            tutors:tutor_id(hourly_rate, user_profiles:user_id(name))
          `)
          .eq('student_id', sd.id)
          .order('start_date', { ascending: false })
          .limit(5)
        if (mdError) throw mdError

        // Ambil tutor offers
        const { data: offers, error: offersError } = await supabase
          .from('matches')
          .select('id, status, subject, tutors:tutor_id(user_profiles:user_id(name))')
          .eq('student_id', sd.id)
          .eq('initiated_by', 'tutor')
          .eq('status', 'pending')
        if (offersError) throw offersError

        if (isMounted.current) {
          setMatches(md || [])
          setTutorOffers(offers || [])
        }
      }

      // Jika data berhasil, hapus error dan loading
      if (isMounted.current) {
        setError(null)
        setLoading(false)
      }
      console.log('[Dashboard] ✅ Data siap')

    } catch (err: any) {
      console.error('[Dashboard] ❌ Fetch error:', err)
      if (isMounted.current) {
        setError(err.message || 'Gagal memuat data, tapi dashboard tetap tampil.')
        // Jangan set loading false di sini, nanti timeout yang akan mengatur
      }
    } finally {
      // Jika fetch selesai sebelum timeout, kita tetap set loading false
      if (isMounted.current && timeoutId.current) {
        clearTimeout(timeoutId.current)
        // Hanya set loading false jika belum false
        setLoading(prev => {
          if (prev) {
            console.log('[Dashboard] 🏁 Fetch selesai, loading=false')
          }
          return false
        })
      }
    }
  }

  useEffect(() => {
    if (fetchDone.current) return
    fetchDone.current = true
    isMounted.current = true

    // ⏱️ PASTIKAN LOADING BERHENTI MAKSIMAL 3 DETIK
    timeoutId.current = setTimeout(() => {
      if (isMounted.current && loading) {
        console.warn('[Dashboard] ⏱️ Timeout 3 detik, force loading=false')
        setLoading(false)
        setError('Waktu pengambilan data habis, tampilkan data kosong.')
      }
    }, 3000)

    fetchProfileData()

    return () => {
      isMounted.current = false
      if (timeoutId.current) clearTimeout(timeoutId.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Create stable callback for profile saved event
  const handleProfileSavedStable = useCallback(() => {
    console.log('[Dashboard] ✅ Profile saved, refreshing onboarding status...')
    fetchProfileData()
  }, [])

  // Memoisasi komponen turunan agar stabil
  const browseTab = useMemo(() => <StudentBrowseTutors />, [])
  const matchesTab = useMemo(() => <StudentMyMatches />, [])
  const profileTab = useMemo(() => <StudentProfile onProfileSaved={handleProfileSavedStable} />, [handleProfileSavedStable])

  // --- RENDER ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner className="h-10 w-10 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat dashboard...</p>
        <p className="text-xs text-muted-foreground/50 mt-1">Jika lama, halaman akan tetap tampil</p>
      </div>
    )
  }

  // Hitung statistik
  const activeMatches = matches.filter(m => ['matched', 'active'].includes(m.status))
  const pendingMatches = matches.filter(m => m.status === 'pending')
  const completedMatches = matches.filter(m => m.status === 'completed')
  const onboardingComplete = profile?.onboarding_complete

  return (
    <div>
      {/* Tampilkan error kecil jika ada, tapi tidak mengganggu UI */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard Siswa</h1>
          <p className="text-muted-foreground text-sm">
            Selamat datang, <span className="font-medium text-foreground">{profile?.name || 'Siswa'}</span>! Kelola pembelajaran Anda di sini.
          </p>
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
              <span>🎉 Ada <strong>{tutorOffers.length}</strong> tutor yang menawarkan diri untuk mengajar Anda!</span>
              <Link href="/dashboard/student/tutor-offers">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Lihat Penawaran <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

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
          {/* Stats */}
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

          {/* Info & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informasi Akun</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
                    {profile?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold">{profile?.name}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  </div>
                </div>
                {profile?.grade_level && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tingkat Kelas</span>
                    <span className="font-medium">{profile.grade_level}</span>
                  </div>
                )}
                {profile?.budget_per_month && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Budget/Bulan</span>
                    <span className="font-medium">Rp {Number(profile.budget_per_month).toLocaleString('id-ID')}</span>
                  </div>
                )}
                {profile?.sessions_per_month && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pertemuan/Bulan</span>
                    <span className="font-medium">{profile.sessions_per_month}× sesi</span>
                  </div>
                )}
                {profile?.status && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      profile.status === 'active' ? 'bg-green-500/15 text-green-700 dark:text-green-300' : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
                    }`}>
                      {profile.status === 'active' ? 'Aktif' : profile.status}
                    </span>
                  </div>
                )}
                {profile?.subjects?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Mata Pelajaran:</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.subjects.slice(0, 5).map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                      {profile.subjects.length > 5 && (
                        <Badge variant="outline" className="text-xs">+{profile.subjects.length - 5}</Badge>
                      )}
                    </div>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setActiveTab('profile')}>
                  Edit Profil
                </Button>
              </CardContent>
            </Card>

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

          {/* Recent Matches */}
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