'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, MessageCircle, Check, X } from 'lucide-react'

// ====================================================================
// KOMPONEN MATCH REQUESTS (langsung di dalam file)
// ====================================================================
function TutorMatchRequests() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)

  const fetchedRef = useRef(false)
  const isMounted = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchMatches = async () => {
    if (!isMounted.current) return
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        if (isMounted.current) setError('Sesi tidak ditemukan.')
        return
      }

      abortControllerRef.current = new AbortController()
      const response = await fetch('/api/matches', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        signal: abortControllerRef.current.signal,
      })
      if (!response.ok) throw new Error('Gagal memuat permintaan')
      const data = await response.json()
      const pending = data.filter((m: any) => m.status === 'pending')
      if (isMounted.current) {
        setMatches(pending)
        setError(null)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      if (isMounted.current) setError(err.message || 'Gagal memuat')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetchMatches()
    return () => {
      isMounted.current = false
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  const handleConfirm = async (matchId: string, action: 'confirm' | 'reject') => {
    setConfirmingId(matchId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sesi tidak ditemukan')

      const res = await fetch(`/api/matches/${matchId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error(`Gagal ${action === 'confirm' ? 'menerima' : 'menolak'}`)

      setShowConfirmDialog(false)
      setSelectedMatch(null)
      // Refresh data
      await fetchMatches()
      alert(action === 'confirm' ? '✅ Pencocokan diterima!' : '✅ Permintaan ditolak.')
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setConfirmingId(null)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
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
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800">
          Anda memiliki {matches.length} permintaan baru.
        </AlertDescription>
      </Alert>

      {matches.map((match) => {
        const student = match.students
        return (
          <Card key={match.id} className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{student?.users_profile?.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Mapel: <span className="font-medium">{match.subject}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tingkat: {student?.grade_level}
                  </p>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                  ⏳ Menunggu
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Frekuensi</p><p className="font-medium">{match.lesson_frequency}</p></div>
                <div><p className="text-xs text-muted-foreground">Mulai</p><p className="font-medium">{new Date(match.start_date).toLocaleDateString('id-ID')}</p></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={confirmingId === match.id}
                  onClick={() => { setSelectedMatch(match); setShowConfirmDialog(true) }}
                >
                  Tolak
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={confirmingId === match.id}
                  onClick={() => handleConfirm(match.id, 'confirm')}
                >
                  {confirmingId === match.id ? <Spinner className="h-4 w-4" /> : '✓ Terima'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Dialog tolak */}
      {showConfirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold">Tolak Permintaan</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Yakin ingin menolak {selectedMatch?.students?.users_profile?.full_name}?
            </p>
            <div className="flex gap-3 mt-4 justify-end">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Batal</Button>
              <Button variant="destructive" onClick={() => handleConfirm(selectedMatch?.id, 'reject')}>
                {confirmingId === selectedMatch?.id ? <Spinner className="h-4 w-4" /> : 'Ya, Tolak'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ====================================================================
// KOMPONEN MY MATCHES (langsung di dalam file)
// ====================================================================
function TutorMyMatches() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchedRef = useRef(false)
  const isMounted = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: 'Menunggu', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    matched: { label: '✓ Dikonfirmasi', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
    active: { label: 'Aktif', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    completed: { label: 'Selesai', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
    cancelled: { label: 'Dibatalkan', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  }

  const fetchMatches = async () => {
    if (!isMounted.current) return
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        if (isMounted.current) setError('Sesi tidak ditemukan.')
        return
      }

      abortControllerRef.current = new AbortController()
      const response = await fetch('/api/matches', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        signal: abortControllerRef.current.signal,
      })
      if (!response.ok) throw new Error('Gagal memuat pencocokan')
      const data = await response.json()
      const confirmed = data.filter((m: any) => ['matched', 'active', 'completed'].includes(m.status))
      if (isMounted.current) {
        setMatches(confirmed)
        setError(null)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      if (isMounted.current) setError(err.message || 'Gagal memuat')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetchMatches()
    return () => {
      isMounted.current = false
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
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
      {matches.map((match) => {
        const student = match.students
        const cfg = STATUS_CONFIG[match.status] || STATUS_CONFIG.pending
        return (
          <Card key={match.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{student?.users_profile?.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Mapel: {match.subject}</p>
                  <p className="text-sm text-muted-foreground">Tingkat: {student?.grade_level}</p>
                </div>
                <Badge className={cfg.color}>{cfg.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Frekuensi</p><p className="font-medium">{match.lesson_frequency}</p></div>
                <div><p className="text-xs text-muted-foreground">Mulai</p><p className="font-medium">{new Date(match.start_date).toLocaleDateString('id-ID')}</p></div>
              </div>
              {match.status === 'matched' && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm font-medium text-green-300">✓ Pencocokan dikonfirmasi! Hubungi siswa.</p>
                  {student?.users_profile?.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 border-green-300 text-green-300 hover:bg-green-100"
                      onClick={() => window.open(`https://wa.me/${student.users_profile.phone.replace(/\D/g, '')}`, '_blank')}
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
  )
}

// ====================================================================
// PAGE UTAMA
// ====================================================================
export default function MyStudentsPage() {
  const [loading, setLoading] = useState(true)
  const [totalStudents, setTotalStudents] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const fetchedRef = useRef(false)
  const isMounted = useRef(true)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const fetchStats = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !isMounted.current) return

        const { data: tutorData } = await supabase
          .from('tutors')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (tutorData?.id && isMounted.current) {
          const { data: matchData } = await supabase
            .from('matches')
            .select('id, status')
            .eq('tutor_id', tutorData.id)

          if (matchData && isMounted.current) {
            setTotalStudents(matchData.filter(m => ['matched', 'active'].includes(m.status)).length)
            setPendingCount(matchData.filter(m => m.status === 'pending').length)
          }
        }
      } catch (err) {
        console.error('Error fetching stats:', err)
      } finally {
        if (isMounted.current) setLoading(false)
      }
    }

    fetchStats()
    return () => { isMounted.current = false }
  }, [])

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Siswa Saya</h1>
        <p className="text-muted-foreground">Kelola siswa aktif dan permintaan baru.</p>
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
          <TutorMatchRequests />
        </TabsContent>

        <TabsContent value="active">
          <TutorMyMatches />
        </TabsContent>
      </Tabs>
    </div>
  )
}