'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, MessageCircle, RefreshCw } from 'lucide-react'

// ====================================================================
// KOMPONEN PERMINTAAN MASUK (TUTOR MELIHAT SISWA YANG DITAWARI)
// ====================================================================
function TutorMatchRequests({ refreshTrigger }: { refreshTrigger: number }) {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchMatches = async () => {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          if (isMounted) setError('Sesi tidak ditemukan.')
          return
        }

        // Ambil data tutor yang login
        const { data: tutorData, error: tutorError } = await supabase
          .from('tutors')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        if (tutorError || !tutorData) {
          if (isMounted) setError('Data tutor tidak ditemukan.')
          return
        }

        // Ambil match dengan status pending dan initiated_by = 'tutor'
        const { data, error } = await supabase
          .from('matches')
          .select(`
            id,
            subject,
            lesson_frequency,
            start_date,
            status,
            initiated_by,
            students:student_id (
              id,
              grade_level,
              avatar_url,
              users_profile:user_id (
                full_name,
                phone
              )
            )
          `)
          .eq('tutor_id', tutorData.id)
          .eq('status', 'pending')
          .eq('initiated_by', 'tutor')

        if (error) throw error

        if (isMounted) setMatches(data || [])
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Gagal memuat permintaan')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchMatches()

    return () => { isMounted = false }
  }, [refreshTrigger])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8" />
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

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>Belum ada permintaan dari siswa.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Alert className="bg-blue-50 border-blue-200 flex-1 mr-4">
          <AlertDescription className="text-blue-800">
            Anda memiliki {matches.length} permintaan baru.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Refresh akan dipicu oleh perubahan refreshTrigger dari parent
            // Tapi kita tetap bisa panggil langsung jika ingin
            // Tidak perlu, karena parent akan trigger ulang
          }}
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {matches.map((match) => {
          const student = match.students
          const profile = student?.users_profile || {}
          return (
            <Card key={match.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                {/* Header: Avatar + Nama + Badge Pending */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {student?.avatar_url ? (
                      <img
                        src={student.avatar_url}
                        alt={profile.full_name || 'Siswa'}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      profile.full_name?.charAt(0)?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{profile.full_name || 'Siswa'}</h3>
                    {student?.grade_level && (
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                        {student.grade_level}
                      </Badge>
                    )}
                  </div>
                  <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-xs">
                    Pending
                  </Badge>
                </div>

                {/* Detail: Mapel, Frekuensi, Tanggal Mulai */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-start">
                    <span className="text-muted-foreground">
                      <span className="font-medium">Mapel:</span> {match.subject}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Frekuensi</p>
                      <p className="font-medium">{match.lesson_frequency || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mulai</p>
                      <p className="font-medium">
                        {match.start_date
                          ? new Date(match.start_date).toLocaleDateString('id-ID')
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tombol Pending (disabled) sebagai pengganti aksi */}
                <div className="mt-4">
                  <Button size="sm" variant="outline" className="w-full" disabled>
                    Menunggu Konfirmasi Siswa
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ====================================================================
// KOMPONEN PENCOCOKAN AKTIF (SUDAH MATCHED/ACTIVE/COMPLETED)
// ====================================================================
function TutorMyMatches({ refreshTrigger }: { refreshTrigger: number }) {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: 'Menunggu', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    matched: { label: 'Dikonfirmasi', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
    active: { label: 'Aktif', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    completed: { label: 'Selesai', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
    cancelled: { label: 'Dibatalkan', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  }

  useEffect(() => {
    let isMounted = true

    const fetchMatches = async () => {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          if (isMounted) setError('Sesi tidak ditemukan.')
          return
        }

        const { data: tutorData, error: tutorError } = await supabase
          .from('tutors')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        if (tutorError || !tutorData) {
          if (isMounted) setError('Data tutor tidak ditemukan.')
          return
        }

        const { data, error } = await supabase
          .from('matches')
          .select(`
            id,
            subject,
            lesson_frequency,
            start_date,
            status,
            initiated_by,
            students:student_id (
              id,
              grade_level,
              avatar_url,
              users_profile:user_id (
                full_name,
                phone
              )
            )
          `)
          .eq('tutor_id', tutorData.id)
          .in('status', ['matched', 'active', 'completed'])

        if (error) throw error

        if (isMounted) setMatches(data || [])
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Gagal memuat pencocokan')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchMatches()

    return () => { isMounted = false }
  }, [refreshTrigger])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8" />
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

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>Belum ada pencocokan yang dikonfirmasi.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Refresh akan dipicu oleh refreshTrigger dari parent
          }}
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {matches.map((match) => {
          const student = match.students
          const profile = student?.users_profile || {}
          const cfg = STATUS_CONFIG[match.status] || STATUS_CONFIG.pending

          return (
            <Card key={match.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {student?.avatar_url ? (
                        <img
                          src={student.avatar_url}
                          alt={profile.full_name || 'Siswa'}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        profile.full_name?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{profile.full_name || 'Siswa'}</h3>
                      {student?.grade_level && (
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                          {student.grade_level}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={`${cfg.color} text-xs`}>{cfg.label}</Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-start">
                    <span className="text-muted-foreground">
                      <span className="font-medium">Mapel:</span> {match.subject}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Frekuensi</p>
                      <p className="font-medium">{match.lesson_frequency || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mulai</p>
                      <p className="font-medium">
                        {match.start_date
                          ? new Date(match.start_date).toLocaleDateString('id-ID')
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {match.status === 'matched' && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                    <p className="text-xs font-medium text-green-700">✓ Pencocokan dikonfirmasi! Hubungi siswa.</p>
                    {profile?.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 border-green-300 text-green-700 hover:bg-green-100 text-xs h-8"
                        onClick={() =>
                          window.open(
                            `https://wa.me/${profile.phone.replace(/\D/g, '')}`,
                            '_blank'
                          )
                        }
                      >
                        💬 WhatsApp
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ====================================================================
// PAGE UTAMA
// ====================================================================
export default function MyStudentsPage() {
  const [loading, setLoading] = useState(true)
  const [totalStudents, setTotalStudents] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let isMounted = true

    const fetchStats = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: tutorData } = await supabase
          .from('tutors')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (tutorData?.id) {
          const { data: matchData } = await supabase
            .from('matches')
            .select('status, initiated_by')
            .eq('tutor_id', tutorData.id)

          if (matchData && isMounted) {
            setTotalStudents(
              matchData.filter(m => ['matched', 'active'].includes(m.status)).length
            )
            setPendingCount(
              matchData.filter(
                m => m.status === 'pending' && m.initiated_by === 'tutor'
              ).length
            )
          }
        }
      } catch (err) {
        console.error('Error fetching stats:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchStats()

    return () => { isMounted = false }
  }, [refreshKey])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Siswa Saya</h1>
          <p className="text-muted-foreground">Kelola siswa aktif dan permintaan baru.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh Semua
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Siswa Aktif</p>
              <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Permintaan Baru</p>
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="requests">
            Permintaan Masuk
            {pendingCount > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">Pencocokan Aktif</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <TutorMatchRequests refreshTrigger={refreshKey} />
        </TabsContent>

        <TabsContent value="active">
          <TutorMyMatches refreshTrigger={refreshKey} />
        </TabsContent>
      </Tabs>
    </div>
  )
}