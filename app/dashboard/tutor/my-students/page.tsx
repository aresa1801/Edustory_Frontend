'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  MapPin,
  BookMarked,
  Clock,
  Users,
  MessageCircle,
  RefreshCw,
  CalendarDays,
} from 'lucide-react'

export default function MyStudentsPage() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalStudents, setTotalStudents] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    console.log('🚀 MyStudents: useEffect dijalankan')
    let isMounted = true

    const fetchData = async () => {
      try {
        console.log('📡 MyStudents: fetchData mulai')
        
        // 1. Buat supabase client
        const supabase = createClient()
        console.log('✅ Supabase client dibuat')

        // 2. Ambil session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error('❌ Session error:', sessionError)
          throw new Error('Gagal mendapatkan session: ' + sessionError.message)
        }
        if (!session) {
          console.error('❌ Session kosong')
          throw new Error('Tidak ada session, silakan login ulang')
        }
        console.log('✅ Session berhasil:', session.user.email)

        // 3. Ambil tutor ID
        const { data: tutorData, error: tutorError } = await supabase
          .from('tutors')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        if (tutorError) {
          console.error('❌ Tutor error:', tutorError)
          throw new Error('Gagal mengambil data tutor: ' + tutorError.message)
        }
        if (!tutorData) {
          console.error('❌ Tutor tidak ditemukan')
          throw new Error('Tutor tidak ditemukan untuk user ini')
        }
        console.log('✅ Tutor ID:', tutorData.id)

        // 4. Ambil matches dengan join ke students dan users_profile
        const { data: matchesData, error: matchesError } = await supabase
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
              subjects,
              budget_per_month,
              sessions_per_month,
              preferred_schedule,
              address,
              avatar_url,
              users_profile:user_id (
                full_name,
                phone
              )
            )
          `)
          .eq('tutor_id', tutorData.id)

        if (matchesError) {
          console.error('❌ Matches error:', matchesError)
          throw new Error('Gagal mengambil data matches: ' + matchesError.message)
        }

        console.log(`✅ Matches diterima: ${matchesData?.length || 0} data`)

        if (isMounted) {
          setMatches(matchesData || [])
          const pending = (matchesData || []).filter(
            (m: any) => m.status === 'pending' && m.initiated_by === 'tutor'
          )
          const active = (matchesData || []).filter(
            (m: any) => ['matched', 'active'].includes(m.status)
          )
          setPendingCount(pending.length)
          setTotalStudents(active.length)
          setError(null)
        }
      } catch (err: any) {
        console.error('💥 MyStudents error catch:', err)
        if (isMounted) {
          setError(err.message || 'Terjadi kesalahan yang tidak diketahui')
        }
      } finally {
        if (isMounted) {
          console.log('🏁 MyStudents: setLoading(false) dipanggil')
          setLoading(false)
        }
      }
    }

    fetchData()

    // Safety timeout: jika loading masih true setelah 5 detik, paksa false
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⚠️ Force setLoading(false) setelah 5 detik timeout')
        setLoading(false)
        setError('Waktu muat habis, silakan refresh halaman')
      }
    }, 5000)

    return () => {
      console.log('🧹 MyStudents: cleanup')
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  const handleRefresh = () => {
    window.location.reload()
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID')
  }

  const getStudentRate = (student: any) => {
    if (student?.budget_per_month && student?.sessions_per_month && student.sessions_per_month > 0) {
      return Math.round(student.budget_per_month / student.sessions_per_month)
    }
    return 0
  }

  // SEPARATE COMPONENT FOR CARD RENDERING TO AVOID ISSUES
  const renderPendingCards = () => {
    const pendingMatches = matches.filter(
      (m: any) => m.status === 'pending' && m.initiated_by === 'tutor'
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
        {pendingMatches.map((match: any) => {
          const student = match.students
          const profile = student?.users_profile || {}
          const fullName = profile.full_name || 'Siswa'
          const grade = student?.grade_level || ''
          const subjects = student?.subjects || []
          const rate = getStudentRate(student)
          const address = student?.address || ''
          const schedule = student?.preferred_schedule || ''
          const frequency = match.lesson_frequency || 'Flexible'
          const startDate = match.start_date

          return (
            <Card key={match.id} className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {student?.avatar_url ? (
                      <img src={student.avatar_url} alt={fullName} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{fullName}</h3>
                    {grade && (
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                        {grade}
                      </Badge>
                    )}
                  </div>
                  <Badge className="ml-auto bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-xs">
                    Pending
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1.5 text-green-500" />
                    <span className="text-muted-foreground">
                      {rate > 0 ? `Rp ${rate.toLocaleString('id-ID')}/jam` : 'Belum diatur'}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <BookMarked className="w-4 h-4 mr-1.5 mt-0.5 text-purple-400 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {subjects.length > 0 ? subjects.join(', ') : 'Belum ada mapel'}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span className="text-muted-foreground">{address || 'Alamat belum diisi'}</span>
                  </div>
                  <div className="flex items-start">
                    <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400 flex-shrink-0" />
                    <span className="text-muted-foreground">{schedule || 'Jadwal belum ditentukan'}</span>
                  </div>
                  <div className="flex items-start">
                    <CalendarDays className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      <span className="font-medium">Jumlah pertemuan:</span> {frequency}
                    </span>
                  </div>
                  {startDate && (
                    <div className="flex items-start">
                      <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Mulai:</span> {formatDate(startDate)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <Button size="sm" variant="outline" className="w-full" disabled>
                    Menunggu konfirmasi siswa
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  const renderActiveCards = () => {
    const activeMatches = matches.filter(
      (m: any) => ['matched', 'active', 'completed'].includes(m.status)
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
    const statusMap: Record<string, { label: string; color: string }> = {
      matched: { label: 'Dikonfirmasi', color: 'bg-green-500/20 text-green-700 border-green-500/30' },
      active: { label: 'Aktif', color: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
      completed: { label: 'Selesai', color: 'bg-slate-500/20 text-slate-700 border-slate-500/30' },
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {activeMatches.map((match: any) => {
          const student = match.students
          const profile = student?.users_profile || {}
          const fullName = profile.full_name || 'Siswa'
          const grade = student?.grade_level || ''
          const subjects = student?.subjects || []
          const rate = getStudentRate(student)
          const address = student?.address || ''
          const schedule = student?.preferred_schedule || ''
          const frequency = match.lesson_frequency || 'Flexible'
          const startDate = match.start_date
          const status = match.status
          const phone = profile.phone || ''
          const statusConfig = statusMap[status] || { label: status, color: 'bg-gray-200' }

          return (
            <Card key={match.id} className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {student?.avatar_url ? (
                        <img src={student.avatar_url} alt={fullName} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{fullName}</h3>
                      {grade && (
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                          {grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={`${statusConfig.color} text-xs`}>{statusConfig.label}</Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1.5 text-green-500" />
                    <span className="text-muted-foreground">
                      {rate > 0 ? `Rp ${rate.toLocaleString('id-ID')}/jam` : 'Belum diatur'}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <BookMarked className="w-4 h-4 mr-1.5 mt-0.5 text-purple-400 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {subjects.length > 0 ? subjects.join(', ') : 'Belum ada mapel'}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span className="text-muted-foreground">{address || 'Alamat belum diisi'}</span>
                  </div>
                  <div className="flex items-start">
                    <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400 flex-shrink-0" />
                    <span className="text-muted-foreground">{schedule || 'Jadwal belum ditentukan'}</span>
                  </div>
                  <div className="flex items-start">
                    <CalendarDays className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      <span className="font-medium">Jumlah pertemuan:</span> {frequency}
                    </span>
                  </div>
                  {startDate && (
                    <div className="flex items-start">
                      <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Mulai:</span> {formatDate(startDate)}
                      </span>
                    </div>
                  )}
                </div>

                {status === 'matched' && phone && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                    <p className="text-xs font-medium text-green-700">
                      ✓ Pencocokan dikonfirmasi! Hubungi siswa.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 border-green-300 text-green-700 hover:bg-green-100 text-xs h-8"
                      onClick={() =>
                        window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank')
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

  // RENDER UTAMA
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="ml-3">Memuat...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>❌ {error}</AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} className="mt-4">Refresh Halaman</Button>
      </div>
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
          Refresh Data
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

        <TabsContent value="requests">{renderPendingCards()}</TabsContent>
        <TabsContent value="active">{renderActiveCards()}</TabsContent>
      </Tabs>
    </div>
  )
}