'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
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
  Map,
  CheckCircle,
  XCircle,
  Trash2,
  Calendar,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ============================================================
// KOMPONEN KARTU PERMINTAAN STUDENT (dengan countdown)
// ============================================================
interface StudentPendingCardProps {
  match: any
  onAccept: (matchId: string) => void
  onReject: (matchId: string) => void
  processing: boolean
  formatDate: (dateStr: string) => string
  renderScheduleSummary: (summary: any) => React.ReactNode
  getStudentRate: (match: any) => number
}

function StudentPendingCard({
  match,
  onAccept,
  onReject,
  processing,
  formatDate,
  renderScheduleSummary,
  getStudentRate,
}: StudentPendingCardProps) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!match.schedule_submitted_at) return
    const deadline = new Date(match.schedule_submitted_at)
    deadline.setDate(deadline.getDate() + 2)

    const updateTimer = () => {
      const now = new Date()
      const diff = deadline.getTime() - now.getTime()
      if (diff <= 0) {
        setTimeLeft('⏳ Waktu habis')
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft(
        `${days} hari ${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [match.schedule_submitted_at])

  const fullName = match.student_full_name || 'Siswa'
  const grade = match.student_grade || ''
  const rate = getStudentRate(match)
  const address = match.student_address || ''
  const sessionsPerMonth = match.student_sessions_per_month || 0
  const sessionDisplay =
    sessionsPerMonth > 0 ? `${sessionsPerMonth} sesi/bulan` : 'Tidak ditentukan'
  const startDate = match.start_date
  const avatar = match.student_avatar

  const scheduleDisplay = match.schedules_summary
    ? renderScheduleSummary(match.schedules_summary)
    : match.student_schedule || 'Belum ditentukan'

  const matchedSubjects = match.matched_subjects || []
  const subjectDisplay =
    matchedSubjects.length > 0
      ? matchedSubjects.join(', ')
      : 'Tidak ada mata pelajaran yang cocok'
  const isNoMatch = matchedSubjects.length === 0

  const lat = match.student_latitude
  const lng = match.student_longitude
  const hasCoords = lat != null && lng != null && address

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt={fullName}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="font-semibold">{fullName}</h3>
            {grade && (
              <Badge
                variant="secondary"
                className="text-xs bg-gray-100 text-gray-700 border-gray-200"
              >
                {grade}
              </Badge>
            )}
          </div>
          <Badge className="ml-auto bg-indigo-500/20 text-indigo-700 border-indigo-500/30 text-xs">
            Menunggu
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
            <span
              className={`${isNoMatch ? 'text-red-500 italic' : 'text-muted-foreground'}`}
            >
              {subjectDisplay}
            </span>
          </div>

          <div className="flex items-start">
            <MapPin className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
            <span className="text-muted-foreground">
              {address || 'Alamat belum diisi'}
            </span>
            {hasCoords && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-1 text-blue-500 hover:text-blue-700 p-0"
                onClick={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
                  window.open(url, '_blank')
                }}
                title="Buka Google Maps & lihat rute"
              >
                <Map className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="flex items-start">
            <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400 flex-shrink-0" />
            <div className="text-muted-foreground">
              <span className="font-medium">Jadwal:</span> {scheduleDisplay}
            </div>
          </div>

          <div className="flex items-start">
            <CalendarDays className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
            <span className="text-muted-foreground">
              <span className="font-medium">Jumlah pertemuan:</span> {sessionDisplay}
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

        {match.schedule_submitted_at && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-orange-400" />
            <span className="text-muted-foreground">
              <span className="font-medium">Sisa waktu merespon:</span>{' '}
              <span className="font-mono text-orange-600">{timeLeft}</span>
            </span>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
            onClick={() => onAccept(match.id)}
            disabled={processing}
          >
            <CheckCircle className="w-4 h-4" />
            Terima
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1 gap-1.5"
            onClick={() => onReject(match.id)}
            disabled={processing}
          >
            <XCircle className="w-4 h-4" />
            Tolak
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function MyStudentsPage() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [totalStudents, setTotalStudents] = useState(0)
  const [tutorPendingCount, setTutorPendingCount] = useState(0)
  const [studentPendingCount, setStudentPendingCount] = useState(0)
  const [rejectedCount, setRejectedCount] = useState(0)

  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [processingAction, setProcessingAction] = useState(false)

  const [showMessageDialog, setShowMessageDialog] = useState(false)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [messageText, setMessageText] = useState('')

  const isMounted = useRef(true)

  const fetchData = async () => {
    if (!authUser) {
      if (isMounted.current) {
        setLoading(false)
        setError('User tidak ditemukan')
      }
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/tutors/my-matches?user_id=${authUser.id}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Gagal mengambil data matches')
      }

      const allMatches = await res.json()

      if (isMounted.current) {
        setMatches(allMatches)

        const tutorPending = allMatches.filter(
          (m: any) => m.status === 'pending' && m.initiated_by === 'tutor'
        )
        const studentPending = allMatches.filter(
          (m: any) => m.status === 'pending' && m.initiated_by === 'student'
        )
        const active = allMatches.filter(
          (m: any) => m.status === 'matched' || m.status === 'active'
        )
        const rejected = allMatches.filter(
          (m: any) => m.status === 'declined' || m.status === 'cancelled'
        )

        setTutorPendingCount(tutorPending.length)
        setStudentPendingCount(studentPending.length)
        setTotalStudents(active.length)
        setRejectedCount(rejected.length)
        setError(null)
      }
    } catch (err: any) {
      console.error('[MyStudents] Fetch error:', err)
      if (isMounted.current) {
        setError(err.message || 'Terjadi kesalahan')
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    isMounted.current = true
    if (authLoading) return
    if (!authUser) {
      setLoading(false)
      return
    }
    fetchData()

    return () => {
      isMounted.current = false
    }
  }, [authUser?.id, authLoading])

  const handleRefresh = () => {
    fetchData()
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID')
  }

  const getStudentRate = (match: any) => {
    if (
      match?.student_budget_per_month &&
      match?.student_sessions_per_month &&
      match.student_sessions_per_month > 0
    ) {
      return Math.round(match.student_budget_per_month / match.student_sessions_per_month)
    }
    return 0
  }

  const renderScheduleSummary = (summary: any) => {
    if (!summary) return null
    if (typeof summary === 'string') {
      return <span className="text-muted-foreground">{summary}</span>
    }
    if (Array.isArray(summary)) {
      return (
        <div className="text-muted-foreground">
          {summary.map((item, idx) => (
            <div key={idx} className="flex items-start gap-1">
              <span className="font-medium">{item.subject}:</span>
              <span>
                {item.day}, {item.time} ({item.count} sesi)
              </span>
            </div>
          ))}
        </div>
      )
    }
    return <span className="text-muted-foreground">{JSON.stringify(summary)}</span>
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessageType(type)
    setMessageText(text)
    setShowMessageDialog(true)
  }

  const handleAccept = async (matchId: string) => {
    console.log('🚀 handleAccept called for matchId:', matchId)
    setProcessingAction(true)

    try {
      const res = await fetch(`/api/matches/${matchId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal menerima permintaan')
      await fetchData()
      showMessage('success', '✅ Permintaan berhasil diterima!')
    } catch (err: any) {
      showMessage('error', '❌ ' + err.message)
    } finally {
      setProcessingAction(false)
    }
  }

  const openRejectDialog = (matchId: string) => {
    console.log('📌 openRejectDialog called with matchId:', matchId)
    setSelectedMatchId(matchId)
    setShowRejectDialog(true)
  }

  const handleReject = async () => {
    console.log('🚨 handleReject called, selectedMatchId:', selectedMatchId)
    if (!selectedMatchId) return

    setProcessingAction(true)

    try {
      const res = await fetch(`/api/matches/${selectedMatchId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal menolak permintaan')
      await fetchData()
      showMessage('success', '✅ Permintaan berhasil ditolak.')
    } catch (err: any) {
      showMessage('error', '❌ ' + err.message)
    } finally {
      setProcessingAction(false)
      setShowRejectDialog(false)
      setSelectedMatchId(null)
    }
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
      <div className="max-w-6xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>❌ {error}</AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} className="mt-4">
          Refresh Halaman
        </Button>
      </div>
    )
  }

  // ===== FILTER =====
  const tutorPendingMatches = matches.filter(
    (m: any) => m.status === 'pending' && m.initiated_by === 'tutor'
  )
  const studentPendingMatches = matches.filter(
    (m: any) => m.status === 'pending' && m.initiated_by === 'student'
  )
  const activeMatches = matches.filter(
    (m: any) => m.status === 'matched' || m.status === 'active'
  )
  const rejectedMatches = matches.filter(
    (m: any) => m.status === 'declined' || m.status === 'cancelled'
  )

  // ===== RENDER: Permintaan Diajukan (dari tutor) =====
  const renderTutorPendingCards = () => {
    if (tutorPendingMatches.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada permintaan diajukan.
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {tutorPendingMatches.map((match: any) => {
          const fullName = match.student_full_name || 'Siswa'
          const grade = match.student_grade || ''
          const rate = getStudentRate(match)
          const address = match.student_address || ''
          const schedule = match.student_schedule || ''
          const sessionsPerMonth = match.student_sessions_per_month || 0
          const sessionDisplay =
            sessionsPerMonth > 0 ? `${sessionsPerMonth} sesi/bulan` : 'Tidak ditentukan'
          const startDate = match.start_date
          const avatar = match.student_avatar

          const matchedSubjects = match.matched_subjects || []
          const subjectDisplay =
            matchedSubjects.length > 0
              ? matchedSubjects.join(', ')
              : 'Tidak ada mata pelajaran yang cocok'
          const isNoMatch = matchedSubjects.length === 0

          const lat = match.student_latitude
          const lng = match.student_longitude
          const hasCoords = lat != null && lng != null && address

          return (
            <Card
              key={match.id}
              className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={fullName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{fullName}</h3>
                    {grade && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-gray-100 text-gray-700 border-gray-200"
                      >
                        {grade}
                      </Badge>
                    )}
                  </div>
                  <Badge className="ml-auto bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-xs">
                    Menunggu
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
                    <span
                      className={`${isNoMatch ? 'text-red-500 italic' : 'text-muted-foreground'}`}
                    >
                      {subjectDisplay}
                    </span>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {address || 'Alamat belum diisi'}
                    </span>
                    {hasCoords && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-1 text-blue-500 hover:text-blue-700 p-0"
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
                          window.open(url, '_blank')
                        }}
                        title="Buka Google Maps & lihat rute"
                      >
                        <Map className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-start">
                    <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {schedule || 'Jadwal belum ditentukan'}
                    </span>
                  </div>

                  <div className="flex items-start">
                    <CalendarDays className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      <span className="font-medium">Jumlah pertemuan:</span> {sessionDisplay}
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

                  {match.accepted_at && (
                    <div className="flex items-start">
                      <Calendar className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Kontrak mulai:</span>{' '}
                        {formatDate(match.accepted_at)}
                      </span>
                    </div>
                  )}
                  {match.contract_end_date && (
                    <div className="flex items-start">
                      <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Berakhir:</span>{' '}
                        {formatDate(match.contract_end_date)}
                        {(() => {
                          const daysLeft = Math.ceil(
                            (new Date(match.contract_end_date).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24)
                          )
                          return daysLeft >= 0 ? (
                            <span className="text-xs text-gray-400 ml-2">
                              (sisa {daysLeft} hari)
                            </span>
                          ) : (
                            <span className="text-xs text-red-500 ml-2">
                              (lewat {Math.abs(daysLeft)} hari)
                            </span>
                          )
                        })()}
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

  // ===== RENDER: Permintaan Student (dengan tombol Terima/Tolak & timer) =====
  const renderStudentPendingCards = () => {
    if (studentPendingMatches.length === 0) {
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
        {studentPendingMatches.map((match: any) => (
          <StudentPendingCard
            key={match.id}
            match={match}
            onAccept={handleAccept}
            onReject={openRejectDialog}
            processing={processingAction}
            formatDate={formatDate}
            renderScheduleSummary={renderScheduleSummary}
            getStudentRate={getStudentRate}
          />
        ))}
      </div>
    )
  }

  // ===== RENDER: Pencocokan Aktif =====
  const renderActiveCards = () => {
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
      matched: {
        label: 'Dikonfirmasi',
        color: 'bg-green-500/20 text-green-700 border-green-500/30',
      },
      active: {
        label: 'Aktif',
        color: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
      },
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {activeMatches.map((match: any) => {
          const fullName = match.student_full_name || 'Siswa'
          const grade = match.student_grade || ''
          const rate = getStudentRate(match)
          const address = match.student_address || ''
          const sessionsPerMonth = match.student_sessions_per_month || 0
          const sessionDisplay =
            sessionsPerMonth > 0 ? `${sessionsPerMonth} sesi/bulan` : 'Tidak ditentukan'
          const status = match.status
          const avatar = match.student_avatar

          const scheduleDisplay = match.schedules_summary
            ? renderScheduleSummary(match.schedules_summary)
            : match.student_schedule || 'Belum ditentukan'

          const matchedSubjects = match.matched_subjects || []
          const subjectDisplay =
            matchedSubjects.length > 0
              ? matchedSubjects.join(', ')
              : 'Tidak ada mata pelajaran yang cocok'
          const isNoMatch = matchedSubjects.length === 0

          const statusConfig = statusMap[status] || { label: status, color: 'bg-gray-200' }

          const lat = match.student_latitude
          const lng = match.student_longitude
          const hasCoords = lat != null && lng != null && address

          return (
            <Card
              key={match.id}
              className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={fullName}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{fullName}</h3>
                      {grade && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-gray-100 text-gray-700 border-gray-200"
                        >
                          {grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={`${statusConfig.color} text-xs`}>
                    {statusConfig.label}
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
                    <span
                      className={`${isNoMatch ? 'text-red-500 italic' : 'text-muted-foreground'}`}
                    >
                      {subjectDisplay}
                    </span>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {address || 'Alamat belum diisi'}
                    </span>
                    {hasCoords && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-1 text-blue-500 hover:text-blue-700 p-0"
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
                          window.open(url, '_blank')
                        }}
                        title="Buka Google Maps & lihat rute"
                      >
                        <Map className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-start">
                    <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400 flex-shrink-0" />
                    <div className="text-muted-foreground">
                      <span className="font-medium">Jadwal:</span> {scheduleDisplay}
                    </div>
                  </div>

                  <div className="flex items-start">
                    <CalendarDays className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      <span className="font-medium">Jumlah pertemuan:</span> {sessionDisplay}
                    </span>
                  </div>

                  {match.accepted_at && (
                    <div className="flex items-start">
                      <Calendar className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Kontrak mulai:</span>{' '}
                        {formatDate(match.accepted_at)}
                      </span>
                    </div>
                  )}
                  {match.contract_end_date && (
                    <div className="flex items-start">
                      <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Berakhir:</span>{' '}
                        {formatDate(match.contract_end_date)}
                        {(() => {
                          const daysLeft = Math.ceil(
                            (new Date(match.contract_end_date).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24)
                          )
                          return daysLeft >= 0 ? (
                            <span className="text-xs text-gray-400 ml-2">
                              (sisa {daysLeft} hari)
                            </span>
                          ) : (
                            <span className="text-xs text-red-500 ml-2">
                              (lewat {Math.abs(daysLeft)} hari)
                            </span>
                          )
                        })()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" disabled>
                    <Calendar className="w-4 h-4 mr-1.5" />
                    Lihat Jadwal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                    disabled
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Hentikan Kontrak
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // ===== RENDER: Penolakan =====
  const renderRejectedCards = () => {
    if (rejectedMatches.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada penolakan.
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rejectedMatches.map((match: any) => {
          const fullName = match.student_full_name || 'Siswa'
          const grade = match.student_grade || ''
          const rate = getStudentRate(match)
          const address = match.student_address || ''
          const sessionsPerMonth = match.student_sessions_per_month || 0
          const sessionDisplay =
            sessionsPerMonth > 0 ? `${sessionsPerMonth} sesi/bulan` : 'Tidak ditentukan'
          const startDate = match.start_date
          const status = match.status
          const avatar = match.student_avatar
          const initiatedBy = match.initiated_by

          const scheduleDisplay = match.schedules_summary
            ? renderScheduleSummary(match.schedules_summary)
            : match.student_schedule || 'Belum ditentukan'

          const matchedSubjects = match.matched_subjects || []
          const subjectDisplay =
            matchedSubjects.length > 0
              ? matchedSubjects.join(', ')
              : 'Tidak ada mata pelajaran yang cocok'
          const isNoMatch = matchedSubjects.length === 0

          const lat = match.student_latitude
          const lng = match.student_longitude
          const hasCoords = lat != null && lng != null && address

          return (
            <Card
              key={match.id}
              className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={fullName}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{fullName}</h3>
                      {grade && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-gray-100 text-gray-700 border-gray-200"
                        >
                          {grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500/20 text-red-700 border-red-500/30 text-xs">
                      Ditolak
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-red-500"
                      onClick={() => {
                        if (confirm('Hapus data ini dari tampilan?')) {
                          handleRefresh()
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
                    <span
                      className={`${isNoMatch ? 'text-red-500 italic' : 'text-muted-foreground'}`}
                    >
                      {subjectDisplay}
                    </span>
                  </div>

                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {address || 'Alamat belum diisi'}
                    </span>
                    {hasCoords && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-1 text-blue-500 hover:text-blue-700 p-0"
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
                          window.open(url, '_blank')
                        }}
                        title="Buka Google Maps & lihat rute"
                      >
                        <Map className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-start">
                    <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400 flex-shrink-0" />
                    <div className="text-muted-foreground">
                      <span className="font-medium">Jadwal:</span> {scheduleDisplay}
                    </div>
                  </div>

                  <div className="flex items-start">
                    <CalendarDays className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      <span className="font-medium">Jumlah pertemuan:</span> {sessionDisplay}
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

                {status === 'declined' && initiatedBy === 'tutor' && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-xs font-medium text-red-700">
                      ✗ Penawaran anda ditolak oleh student
                    </p>
                  </div>
                )}

                {status === 'declined' && initiatedBy === 'student' && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-xs font-medium text-red-700">
                      ✗ Permintaan jadwal siswa ditolak
                    </p>
                  </div>
                )}

                {status === 'cancelled' && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-xs font-medium text-red-700">
                      ✗ Penawaran dibatalkan
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // ===== RENDER UTAMA =====
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Siswa Saya</h1>
          <p className="text-muted-foreground">
            Kelola siswa aktif dan permintaan baru.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Permintaan Student</p>
              <p className="text-2xl font-bold">{studentPendingCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Permintaan Diajukan</p>
              <p className="text-2xl font-bold">{tutorPendingCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Penolakan</p>
              <p className="text-2xl font-bold">{rejectedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="active">
            Pencocokan Aktif
            {totalStudents > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {totalStudents}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="student-pending">
            Permintaan Student
            {studentPendingCount > 0 && (
              <span className="ml-2 bg-indigo-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {studentPendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tutor-pending">
            Permintaan Diajukan
            {tutorPendingCount > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {tutorPendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Penolakan
            {rejectedCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {rejectedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">{renderActiveCards()}</TabsContent>
        <TabsContent value="student-pending">
          {renderStudentPendingCards()}
        </TabsContent>
        <TabsContent value="tutor-pending">
          {renderTutorPendingCards()}
        </TabsContent>
        <TabsContent value="rejected">{renderRejectedCards()}</TabsContent>
      </Tabs>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Permintaan</DialogTitle>
            <DialogDescription>
              Anda akan menolak permintaan jadwal dari siswa ini.
              <br /><br />
              Apakah Anda yakin?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                console.log('🔄 Tombol Ya, Tolak diklik')
                handleReject()
              }}
              disabled={processingAction}
            >
              {processingAction ? <Spinner className="h-4 w-4" /> : 'Ya, Tolak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {messageType === 'success' ? '✅ Sukses' : '❌ Error'}
            </DialogTitle>
            <DialogDescription>{messageText}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowMessageDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}