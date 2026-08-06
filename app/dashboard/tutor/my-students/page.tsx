'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, MessageCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function MyStudentsPage() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalStudents, setTotalStudents] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [matches, setMatches] = useState<any[]>([])

  const isMounted = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = async () => {
    if (!user) return
    try {
      setLoading(true)
      setError(null)

      // 1. Ambil ID tutor dari profil
      const tutorRes = await fetch(`/api/tutors/profile?user_id=${user.id}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      })
      if (!tutorRes.ok) throw new Error('Gagal mengambil profil tutor')
      const tutorData = await tutorRes.json()
      const tutorId = tutorData.tutor?.id
      if (!tutorId) throw new Error('Tidak ditemukan ID tutor')

      // 2. Ambil semua match untuk tutor ini via API (butuh token)
      // Ambil token dari session
      const { createClient } = await import('@/lib/auth')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      const matchRes = await fetch('/api/matches', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Authorization: `Bearer ${token}`,
        },
      })
      if (!matchRes.ok) throw new Error('Gagal mengambil data matches')
      const allMatches = await matchRes.json()

      // 3. Filter
      const pending = allMatches.filter(
        (m: any) => m.status === 'pending' && m.initiated_by === 'tutor'
      )
      const active = allMatches.filter(
        (m: any) => ['matched', 'active'].includes(m.status)
      )

      if (isMounted.current) {
        setMatches(allMatches)
        setTotalStudents(active.length)
        setPendingCount(pending.length)
        setError(null)
      }
    } catch (err: any) {
      if (isMounted.current) setError(err.message || 'Gagal memuat data')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    fetchData()

    return () => {
      isMounted.current = false
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [user?.id, authLoading])

  const handleRefresh = () => {
    if (!isMounted.current) return
    fetchData()
  }

  // Render konten tab "Permintaan Masuk"
  const renderPending = () => {
    const pendingMatches = matches.filter(
      (m) => m.status === 'pending' && m.initiated_by === 'tutor'
    )
    if (pendingMatches.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada permintaan dari siswa.
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {pendingMatches.map((match) => {
          const student = match.students
          const profile = student?.users_profile || {}
          return (
            <Card key={match.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
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

                <div className="space-y-1.5 text-sm">
                  <div>
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
    )
  }

  // Render konten tab "Pencocokan Aktif"
  const renderActive = () => {
    const activeMatches = matches.filter((m) =>
      ['matched', 'active', 'completed'].includes(m.status)
    )
    if (activeMatches.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada pencocokan yang dikonfirmasi.
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {activeMatches.map((match) => {
          const student = match.students
          const profile = student?.users_profile || {}
          const statusMap: Record<string, { label: string; color: string }> = {
            matched: { label: 'Dikonfirmasi', color: 'bg-green-500/20 text-green-700 border-green-500/30' },
            active: { label: 'Aktif', color: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
            completed: { label: 'Selesai', color: 'bg-slate-500/20 text-slate-700 border-slate-500/30' },
          }
          const status = statusMap[match.status] || { label: match.status, color: 'bg-gray-200' }

          return (
            <Card key={match.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
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
                  <Badge className={`${status.color} text-xs`}>{status.label}</Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div>
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

                {match.status === 'matched' && profile?.phone && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                    <p className="text-xs font-medium text-green-700">
                      ✓ Pencocokan dikonfirmasi! Hubungi siswa.
                    </p>
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
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="ml-3">Memuat...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertDescription>❌ {error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Siswa Saya</h1>
          <p className="text-muted-foreground">Kelola siswa aktif dan permintaan baru.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Siswa Aktif</p>
              <p className="text-2xl font-bold">{totalStudents}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Permintaan Baru</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
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

        <TabsContent value="requests">{renderPending()}</TabsContent>
        <TabsContent value="active">{renderActive()}</TabsContent>
      </Tabs>
    </div>
  )
}