'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import StudentBrowseTutors from '@/components/dashboard/student/browse-tutors'
import StudentMyMatches from '@/components/dashboard/student/my-matches'
import StudentProfile from '@/components/dashboard/student/student-profile'
import { createClient } from '@/lib/auth'
import { Users, Clock, BookOpen, CheckCircle, Search, BookMarked, BarChart3, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700' },
  matched:   { label: 'Dikonfirmasi', color: 'bg-green-100 text-green-700' },
  active:    { label: 'Aktif', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Selesai', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [{ data: up }, { data: sd }] = await Promise.all([
          supabase.from('user_profiles').select('name, email').eq('id', user.id).single(),
          supabase.from('students').select('id, grade_level, subjects, status').eq('user_id', user.id).single(),
        ])

        setProfile({ ...up, ...sd })

        if (sd?.id) {
          const { data: md } = await supabase
            .from('matches')
            .select(`
              id, status, subject, start_date, lesson_frequency,
              tutors:tutor_id(
                hourly_rate,
                user_profiles:user_id(name)
              )
            `)
            .eq('student_id', sd.id)
            .order('start_date', { ascending: false })
            .limit(5)

          setMatches(md || [])
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const activeMatches = matches.filter(m => ['matched', 'active'].includes(m.status))
  const pendingMatches = matches.filter(m => m.status === 'pending')
  const completedMatches = matches.filter(m => m.status === 'completed')

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard Siswa</h1>
          <p className="text-muted-foreground text-sm">
            Selamat datang, <span className="font-medium text-foreground">{profile?.name || 'Siswa'}</span>! Kelola pembelajaran Anda di sini.
          </p>
        </div>

        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="browse">Cari Pengajar</TabsTrigger>
          <TabsTrigger value="matches">Pengajar Saya</TabsTrigger>
          <TabsTrigger value="profile">Profil Saya</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pengajar Aktif</p>
                  <p className="text-2xl font-bold">{activeMatches.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Menunggu Konfirmasi</p>
                  <p className="text-2xl font-bold">{pendingMatches.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sesi Selesai</p>
                  <p className="text-2xl font-bold">{completedMatches.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mata Pelajaran</p>
                  <p className="text-2xl font-bold">{profile?.subjects?.length ?? 0}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Student Info & Quick Actions */}
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

                {profile?.status && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      profile.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
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

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setActiveTab('profile')}
                >
                  Edit Profil
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aksi Cepat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  onClick={() => setActiveTab('browse')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Search className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Cari Pengajar</p>
                    <p className="text-xs text-muted-foreground">Temukan pengajar sesuai kebutuhan</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>

                <button
                  onClick={() => setActiveTab('matches')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <BookMarked className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Pengajar Saya</p>
                    <p className="text-xs text-muted-foreground">Lihat status pendaftaran belajar</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>

                <Link
                  href="/dashboard/student/progress"
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Progres Belajar</p>
                    <p className="text-xs text-muted-foreground">Pantau perkembangan Anda</p>
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
                  const statusCfg = STATUS_LABEL[match.status] || { label: match.status, color: 'bg-gray-100 text-gray-700' }
                  return (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{match.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          Pengajar: {match.tutors?.user_profiles?.name || '—'}
                        </p>
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
                  <p className="text-sm text-muted-foreground">Mulai cari pengajar yang sesuai kebutuhan Anda</p>
                </div>
                <Button onClick={() => setActiveTab('browse')} className="bg-primary hover:bg-primary/90">
                  Cari Pengajar Sekarang
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="browse" className="space-y-4">
          <StudentBrowseTutors />
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          <StudentMyMatches />
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <StudentProfile />
        </TabsContent>
      </Tabs>
    </div>
  )
}
