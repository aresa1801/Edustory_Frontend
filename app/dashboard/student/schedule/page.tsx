'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Clock,
  User,
  Circle,
  Users,
  RefreshCw,
  CheckCircle,
  RotateCw,
  Star,
  Briefcase,
  Lock,
  GraduationCap,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

// ========== TIPE DATA ==========
interface TutorSchedule {
  id: string
  matchId: string
  status: 'active' | 'completed' | 'cancelled'
  completionType?: 'natural' | 'unilateral' | 'mutual'
  hasReviewed?: boolean
  extensionRequest?: any | null
  extensionNotification?: any | null
  schedulesSummaryFix: any
  schedulesCustom: any
  ulasan: any[]
  acceptedAt: string
  contractEndDate: string
  student: any
  tutor: {
    id: string
    fullName: string
    phone: string
    email: string
    bio: string
    experienceYears: number
    qualifications: string
    hourlyRate: number
    rating: number
    totalReviews: number
    verifiedGradeLevels: string[]
    matchedSubjects: string[]
    avatar: string | null
    isOnline: boolean
  }
}

// ========== HELPER ==========
function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getDaysLeft(endDateStr: string): number {
  if (!endDateStr) return 0
  const end = new Date(endDateStr).getTime()
  const now = Date.now()
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24))
}

// ========== KOMPONEN UTAMA ==========
export default function StudentSchedulePage() {
  const router = useRouter()
  const { user: authUser, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schedules, setSchedules] = useState<TutorSchedule[]>([])
  const [mode, setMode] = useState<'online' | 'offline' | 'all'>('all')
  const [selectedSchedule, setSelectedSchedule] = useState<TutorSchedule | null>(null)
  const [showProfileDialog, setShowProfileDialog] = useState(false)

  // ========== STATE REVIEWS ==========
  const [tutorReviews, setTutorReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [myRating, setMyRating] = useState(0)
  const [myComment, setMyComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [checkingReview, setCheckingReview] = useState(false)

  // ========== STATE EXTENSION ==========
  const [extCancelSchedule, setExtCancelSchedule] = useState<TutorSchedule | null>(null)
  const [extProcessing, setExtProcessing] = useState(false)
  const [, setTick] = useState(0)

  // Timer 1 detik untuk countdown
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // ========== FETCH DATA ==========
  const fetchData = async (isRefresh = false) => {
    if (!authUser) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/match-schedules?user_id=${authUser.id}&role=student`,
        {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        }
      )
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Gagal mengambil data jadwal')
      }
      const data = await res.json()
      setSchedules(data)
    } catch (err: any) {
      console.error('[StudentSchedule] Fetch error:', err)
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // ========== FETCH TUTOR REVIEWS ==========
  const fetchTutorReviews = async (tutorId: string) => {
    setReviewsLoading(true)
    try {
      const res = await fetch(`/api/tutors/${tutorId}/reviews`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Gagal memuat ulasan')
      const data = await res.json()
      setTutorReviews(data.reviews || [])
    } catch (err) {
      console.error(err)
      setTutorReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!authUser) {
      setLoading(false)
      return
    }
    fetchData(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, authLoading])

  const handleRefresh = () => fetchData(true)

  // ========== FILTER & STATISTIK ==========
  const isExpired = (endDate: string) =>
    endDate ? new Date(endDate).getTime() < Date.now() : false

  const activeSchedules = schedules.filter(
    (s) => s.status === 'active' && !isExpired(s.contractEndDate)
  )
  const completedSchedules = schedules.filter(
    (s) => s.status === 'completed' || isExpired(s.contractEndDate)
  )

  const filterByMode = (list: TutorSchedule[]) => {
    if (mode === 'online')
      return list.filter((s) => s.student?.isOnline === true)
    if (mode === 'offline')
      return list.filter((s) => !s.student?.isOnline)
    return list
  }

  const filteredActive = filterByMode(activeSchedules)
  const filteredCompleted = filterByMode(completedSchedules)

  const totalOnline = schedules.filter(
    (s) => s.student?.isOnline === true
  ).length
  const totalOffline = schedules.filter((s) => !s.student?.isOnline).length

  const toggleMode = () => {
    if (mode === 'all') setMode('online')
    else if (mode === 'online') setMode('offline')
    else setMode('all')
  }

  const getModeLabel = () => {
    if (mode === 'all') return 'Semua'
    if (mode === 'online') return 'Online'
    return 'Offline'
  }

  // ========== HANDLERS ==========
  const handleViewSchedule = (schedule: TutorSchedule) => {
    router.push(`/dashboard/student/schedule/${schedule.matchId}`)
  }

  const handleViewProfile = async (schedule: TutorSchedule) => {
    const freshSchedule = schedules.find((s) => s.matchId === schedule.matchId) || schedule
    setSelectedSchedule(freshSchedule)
    setShowProfileDialog(true)
    setMyRating(0)
    setMyComment('')
    setShowReviewForm(false)
    setCheckingReview(true)   // ← tambah ini

    if (freshSchedule.tutor?.id) {
      fetchTutorReviews(freshSchedule.tutor.id)
    }

    try {
      const res = await fetch(`/api/match-schedules/${schedule.matchId}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const detail = await res.json()
        if (detail.hasReviewed) {
          setSelectedSchedule((prev) =>
            prev ? ({ ...prev, hasReviewed: true } as any) : prev
          )
          setSchedules((prev) =>
            prev.map((s) =>
              s.matchId === schedule.matchId
                ? ({ ...s, hasReviewed: true } as any)
                : s
            )
          )
        }
      }
    } catch (err) {
      console.error('[handleViewProfile] cek hasReviewed gagal:', err)
    } finally {
      setCheckingReview(false)   // ← tambah ini
    }
  }

  const handleRequestExtension = (schedule: TutorSchedule) => {
    router.push(`/dashboard/student/schedule/${schedule.matchId}/extend`)
  }

  const handleSubmitReview = async () => {
  if (!selectedSchedule || myRating === 0 || !authUser) return
  setSubmittingReview(true)
  try {
    const res = await fetch(
      `/api/match-schedules/${selectedSchedule.matchId}/review`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: authUser.id,
          rating: myRating,
          comment: myComment,
        }),
      }
    )
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Gagal mengirim ulasan')

    alert('✅ Ulasan berhasil dikirim!')

    // ✅ 1. Tandai di selectedSchedule (form langsung hilang)
    setSelectedSchedule((prev) =>
      prev ? ({ ...prev, hasReviewed: true } as any) : prev
    )

    // ✅ 2. Tandai di array schedules (biar handleViewProfile ambil data yg benar)
    setSchedules((prev) =>
      prev.map((s) =>
        s.matchId === selectedSchedule.matchId
          ? ({ ...s, hasReviewed: true } as any)
          : s
      )
    )

    setShowReviewForm(false)
    setMyRating(0)
    setMyComment('')

    if (selectedSchedule.tutor?.id) {
      await fetchTutorReviews(selectedSchedule.tutor.id)
    }
    await fetchData(true)
  } catch (err: any) {
    alert('❌ ' + err.message)
  } finally {
    setSubmittingReview(false)
  }
}

  const handleCancelExtension = async () => {
    if (!extCancelSchedule || !authUser || extProcessing) return
    setExtProcessing(true)
    try {
      const res = await fetch(
        `/api/match-schedules/${extCancelSchedule.matchId}/extend`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cancel',
            role: 'student',
            user_id: authUser.id,
          }),
        }
      )
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal')

      alert('✅ Pengajuan perpanjangan dibatalkan.')
      setExtCancelSchedule(null)
      await fetchData(true)
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setExtProcessing(false)
    }
  }

  // ========== LOADING / ERROR ==========
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="ml-3 text-muted-foreground">Memuat jadwal...</p>
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
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>
    )
  }

  // ========== RENDER ==========
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jadwal Belajar</h1>
          <p className="text-muted-foreground">
            Kelola jadwal belajar dengan tutor yang sudah dikonfirmasi.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Filter:
            </span>
            <button
              onClick={toggleMode}
              className="px-3 py-1.5 text-xs font-medium rounded-md border bg-background hover:bg-muted transition-colors"
            >
              {getModeLabel()}
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Tutor</p>
              <p className="text-xl font-bold">{schedules.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Circle className="w-4 h-4 text-green-500 fill-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Online</p>
              <p className="text-xl font-bold">{totalOnline}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-400/20 flex items-center justify-center">
              <Circle className="w-4 h-4 text-gray-400 fill-gray-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Offline</p>
              <p className="text-xl font-bold">{totalOffline}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-500/20 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kontrak Selesai</p>
              <p className="text-xl font-bold">{completedSchedules.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ===== BAGIAN 1: AKTIF ===== */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Circle className="w-4 h-4 text-green-500 fill-green-500" />
          Aktif ({filteredActive.length})
        </h2>
        {filteredActive.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {mode === 'all'
                ? 'Belum ada tutor aktif.'
                : `Tidak ada tutor aktif dengan status ${getModeLabel().toLowerCase()}.`}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredActive.map((schedule) => {
              const tutor = schedule.tutor
              if (!tutor) return null
              const daysLeft = getDaysLeft(schedule.contractEndDate)

              return (
                <Card
                  key={schedule.id}
                  className="border shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                            {tutor.avatar ? (
                              <img
                                src={tutor.avatar}
                                alt={tutor.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              tutor.fullName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">
                              {tutor.fullName}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {tutor.matchedSubjects?.join(', ') || '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Circle
                              className={`h-2 w-2 fill-current ${
                                schedule.student?.isOnline
                                  ? 'text-green-500'
                                  : 'text-gray-400'
                              }`}
                            />
                            <span className="text-muted-foreground">
                              {schedule.student?.isOnline
                                ? 'Online'
                                : 'Offline'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            <span className="font-medium">
                              Kontrak berakhir:
                            </span>{' '}
                            {formatDate(schedule.contractEndDate)}
                            {daysLeft >= 0 ? (
                              <span className="text-gray-400 ml-1">
                                (sisa {daysLeft} hari)
                              </span>
                            ) : (
                              <span className="text-red-500 ml-1">
                                (lewat {Math.abs(daysLeft)} hari)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleViewSchedule(schedule)}
                        >
                          <Calendar className="w-3.5 h-3.5 mr-1.5" />
                          Lihat Jadwal
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleViewProfile(schedule)}
                        >
                          <User className="w-3.5 h-3.5 mr-1.5" />
                          Profil
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== BAGIAN 2: KONTRAK SELESAI ===== */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-slate-500" />
          Kontrak Selesai ({filteredCompleted.length})
        </h2>
        {filteredCompleted.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {mode === 'all'
                ? 'Belum ada kontrak yang selesai.'
                : `Tidak ada kontrak selesai dengan status ${getModeLabel().toLowerCase()}.`}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCompleted.map((schedule) => {
              const tutor = schedule.tutor
              if (!tutor) return null
              return (
                <Card
                  key={schedule.id}
                  className="border shadow-sm hover:shadow-md transition-shadow border-slate-200 bg-slate-50/50"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                            {tutor.avatar ? (
                              <img
                                src={tutor.avatar}
                                alt={tutor.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              tutor.fullName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">
                              {tutor.fullName}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {tutor.matchedSubjects?.join(', ') || '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Circle
                              className={`h-2 w-2 fill-current ${
                                tutor.isOnline
                                  ? 'text-green-500'
                                  : 'text-gray-400'
                              }`}
                            />
                            <span className="text-muted-foreground">
                              {tutor.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            <span className="font-medium">
                              Berakhir pada:
                            </span>{' '}
                            {formatDate(schedule.contractEndDate)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleViewProfile(schedule)}
                        >
                          <User className="w-3.5 h-3.5 mr-1.5" />
                          Profil
                        </Button>
                                                {schedule.extensionRequest?.status === 'pending' ? (
                          <div className="flex flex-col gap-2 items-end">
                            <div className="text-xs text-amber-400 font-mono font-bold">
                              Sisa waktu:{' '}
                              {(() => {
                                const deadline = new Date(
                                  schedule.extensionRequest.deadline
                                ).getTime()
                                const diff = deadline - Date.now()
                                if (diff <= 0) return 'Waktu habis'
                                const d = Math.floor(diff / 86400000)
                                const h = Math.floor((diff % 86400000) / 3600000)
                                const m = Math.floor((diff % 3600000) / 60000)
                                const s = Math.floor((diff % 60000) / 1000)
                                if (d > 0) return `${d} hari ${h} jam ${m} menit`
                                return `${h} jam ${m} menit ${s} detik`
                              })()}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                              onClick={() => setExtCancelSchedule(schedule)}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              Batalkan Pengajuan
                            </Button>
                          </div>
                                                ) : schedule.completionType === 'natural' ? (
                          <Button
                            variant="default"
                            size="sm"
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleRequestExtension(schedule)}
                          >
                            <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                            Ajukan Perpanjangan
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            disabled
                            title="Kontrak dihentikan lebih awal, tidak bisa diperpanjang"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1.5" />
                            Tidak Bisa Diperpanjang
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== DIALOG PROFIL TUTOR ===== */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Profil Tutor</DialogTitle>
            <DialogDescription>
              Informasi lengkap tutor yang telah dikonfirmasi.
            </DialogDescription>
          </DialogHeader>

          {selectedSchedule?.tutor && (
            <div className="space-y-6 py-2">
              {/* ===== HEADER PROFIL ===== */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 overflow-hidden">
                  {selectedSchedule.tutor.avatar ? (
                    <img
                      src={selectedSchedule.tutor.avatar}
                      alt={selectedSchedule.tutor.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    selectedSchedule.tutor.fullName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {selectedSchedule.tutor.fullName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-500/20 text-green-200 border-green-500/30"
                    >
                      Tutor
                    </Badge>
                    <div className="flex items-center gap-1 text-xs">
                      <Circle
                        className={`h-2.5 w-2.5 fill-current ${
                          selectedSchedule.tutor.isOnline
                            ? 'text-green-500'
                            : 'text-gray-400'
                        }`}
                      />
                      <span className="text-muted-foreground">
                        {selectedSchedule.tutor.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== GRID 3 KOLOM ===== */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* KOLOM 1: INFORMASI PRIBADI */}
                <Card className="border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <User className="w-4 h-4 text-blue-500" />
                      <h4 className="font-semibold text-sm">Informasi Pribadi</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Nama Lengkap</p>
                        <p className="font-medium">
                          {selectedSchedule.tutor.fullName || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium break-all">-</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Nomor WhatsApp
                        </p>
                        <p className="font-medium">
                          {selectedSchedule.tutor.phone || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bio Singkat</p>
                        <p className="font-medium italic">
                          {selectedSchedule.tutor.bio || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Mata Pelajaran
                        </p>
                        <p className="font-medium">
                          {selectedSchedule.tutor.matchedSubjects?.join(', ') ||
                            selectedSchedule.student?.matchedSubjects?.join(
                              ', '
                            ) ||
                            '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KOLOM 2: INFORMASI PROFESIONAL */}
                <Card className="border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Briefcase className="w-4 h-4 text-purple-500" />
                      <h4 className="font-semibold text-sm">
                        Informasi Profesional
                      </h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Pengalaman Mengajar
                        </p>
                        <p className="font-medium">
                          {selectedSchedule.tutor.experienceYears || 0} tahun
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Tarif Per Jam
                        </p>
                        <p className="font-medium">
                          Rp{' '}
                          {Number(
                            selectedSchedule.tutor.hourlyRate || 0
                          ).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Kualifikasi & Sertifikasi
                        </p>
                        <p className="font-medium">
                          {selectedSchedule.tutor.qualifications || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Status Verifikasi
                        </p>
                        <Badge
                          variant="outline"
                          className="mt-1 text-xs bg-green-500/20 text-green-200 border-green-500/30"
                        >
                          ✓ Terverifikasi
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KOLOM 3: RATING & ULASAN (FIXED HEIGHT) */}
                <Card className="border shadow-sm flex flex-col h-[420px]">
                  <CardContent className="p-4 flex flex-col h-full min-h-0">
                    <div className="flex items-center gap-2 pb-2 border-b shrink-0">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <h4 className="font-semibold text-sm">Rating & Ulasan</h4>
                    </div>

                    {/* Skor Rating */}
                    <div className="flex items-center gap-2 shrink-0 pt-3">
                      <span className="text-3xl font-bold text-yellow-400">
                        {selectedSchedule.tutor.rating || 0}
                      </span>
                      <div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i <= Math.round(selectedSchedule.tutor.rating || 0)
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-500'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedSchedule.tutor.totalReviews || 0} ulasan
                        </p>
                      </div>
                    </div>

                    {/* Ulasan — scrollable */}
                    <div className="flex-1 min-h-0 flex flex-col pt-3 border-t mt-3">
                      <div className="flex items-center justify-between shrink-0 mb-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Ulasan Terbaru
                        </p>
                        {tutorReviews.length > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-muted/50 border-border"
                          >
                            {tutorReviews.length} ulasan
                          </Badge>
                        )}
                      </div>

                      {/* ✅ SCROLLABLE — max-h + overflow-y-auto */}
                      <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 space-y-2">
                        {reviewsLoading ? (
                          <p className="text-xs text-muted-foreground italic">Memuat ulasan...</p>
                        ) : tutorReviews.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Belum ada ulasan.</p>
                        ) : (
                          tutorReviews.map((review: any, idx: number) => (
                            <div
                              key={(review.id || review.match_schedule_id || 'r') + '-' + idx}
                              className="text-xs space-y-1.5 pb-3 mb-1 border-b last:border-0 last:pb-0"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-foreground truncate">
                                  {review.student_name || 'Anonim'}
                                </span>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <Star
                                      key={i}
                                      className={`w-2.5 h-2.5 ${
                                        i <= review.rating
                                          ? 'text-yellow-500 fill-yellow-500'
                                          : 'text-gray-500'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>

                              {review.comment ? (
                                <p className="text-muted-foreground italic leading-relaxed break-words">
                                  "{review.comment}"
                                </p>
                              ) : (
                                <p className="text-muted-foreground/60 italic text-[11px]">
                                  (tanpa komentar)
                                </p>
                              )}

                              {review.created_at && (
                                <p className="text-[10px] text-muted-foreground/60">
                                  {new Date(review.created_at).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ===== BERIKAN RATING ===== */}
              {(() => {
                if (checkingReview) {
                  return (
                    <Card className="border shadow-sm">
                      <CardContent className="p-4 flex items-center justify-center">
                        <Spinner className="w-4 h-4 mr-2" />
                        <span className="text-sm text-muted-foreground">Memeriksa status ulasan...</span>
                      </CardContent>
                    </Card>
                  )
                }
                const isCompleted =
                  selectedSchedule.status === 'completed' ||
                  isExpired(selectedSchedule.contractEndDate)

                // ✅ 3 SUMBER PENGECEKAN (OR — kalau salah satu true, form hide)
                const reviewedFromState = !!(selectedSchedule as any).hasReviewed
                const reviewedFromList = (tutorReviews || []).some(
                  (r: any) =>
                    r.match_schedule_id === selectedSchedule.matchId ||
                    r.match_id === selectedSchedule.matchId
                )

                const alreadyReviewed = reviewedFromState || reviewedFromList

                if (alreadyReviewed) return null

                if (!isCompleted) {
                  return (
                    <Card className="border shadow-sm bg-slate-500/5 border-slate-500/20">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-slate-500" />
                          <h4 className="font-semibold text-sm text-muted-foreground">
                            Berikan Rating
                          </h4>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-slate-500/20 text-slate-300 border-slate-500/30"
                          >
                            🔒 Terkunci
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground italic">
                          Rating akan terbuka setelah kontrak belajar selesai.
                        </p>
                      </CardContent>
                    </Card>
                  )
                }

                return (
                  <Card className="border shadow-sm bg-yellow-500/5 border-yellow-500/20">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <h4 className="font-semibold text-sm">Berikan Rating</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Bagaimana pengalaman belajarmu dengan tutor ini? Klik bintang untuk memberi nilai.
                      </p>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setMyRating(i)
                              setShowReviewForm(true)
                            }}
                            className="transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-8 h-8 ${
                                i <= myRating
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-500'
                              }`}
                            />
                          </button>
                        ))}
                        {myRating > 0 && (
                          <span className="ml-2 text-sm text-muted-foreground">{myRating} / 5</span>
                        )}
                      </div>

                      {showReviewForm && myRating > 0 && (
                        <div className="space-y-3 pt-2 border-t">
                          <textarea
                            placeholder="Tulis pengalamanmu belajar dengan tutor ini (opsional)..."
                            value={myComment}
                            onChange={(e) => setMyComment(e.target.value)}
                            rows={3}
                            className="w-full p-3 text-sm rounded-md bg-background border border-input resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowReviewForm(false)
                                setMyRating(0)
                                setMyComment('')
                              }}
                              disabled={submittingReview}
                            >
                              Batal
                            </Button>
                            <Button
                              size="sm"
                              className="bg-yellow-600 hover:bg-yellow-700 text-white"
                              onClick={handleSubmitReview}
                              disabled={submittingReview || myRating === 0}
                            >
                              {submittingReview ? <Spinner className="w-3.5 h-3.5" /> : 'Kirim Ulasan'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })()}

              {/* ===== JADWAL TERKINI & KUSTOM ===== */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <h4 className="font-semibold text-sm">Jadwal Terkini</h4>
                    </div>
                    <div className="pt-1 space-y-1">
                      {selectedSchedule.schedulesSummaryFix &&
                      Array.isArray(selectedSchedule.schedulesSummaryFix) &&
                      selectedSchedule.schedulesSummaryFix.length > 0 ? (
                        selectedSchedule.schedulesSummaryFix.map(
                          (item: any, idx: number) => (
                            <div
                              key={idx}
                              className="text-sm text-muted-foreground"
                            >
                              <span className="font-medium text-foreground">
                                {item.subject}:
                              </span>{' '}
                              {item.day}, {item.time} ({item.count} sesi)
                            </div>
                          )
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Belum ada jadwal terkini.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <RotateCw className="w-4 h-4 text-teal-500" />
                      <h4 className="font-semibold text-sm">Jadwal Kustom</h4>
                    </div>
                    <div className="pt-1">
                      {selectedSchedule.schedulesCustom &&
                      Array.isArray(selectedSchedule.schedulesCustom) &&
                      selectedSchedule.schedulesCustom.length > 0 ? (
                        <div className="space-y-1">
                          {selectedSchedule.schedulesCustom.map(
                            (item: any, idx: number) => (
                              <div
                                key={idx}
                                className="text-sm text-muted-foreground"
                              >
                                <span className="font-medium text-foreground">
                                  {item.subject}:
                                </span>{' '}
                                {item.day}, {item.time} ({item.count} sesi)
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Belum ada jadwal kustom.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ===== INFORMASI KONTRAK ===== */}
              <Card className="border shadow-sm bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 pb-2 border-b mb-3">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    <h4 className="font-semibold text-sm">Informasi Kontrak</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Mulai Kontrak
                      </p>
                      <p className="font-medium">
                        {formatDate(selectedSchedule.acceptedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Berakhir Kontrak
                      </p>
                      <p className="font-medium">
                        {formatDate(selectedSchedule.contractEndDate)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setShowProfileDialog(false)}
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
            {/* ===== DIALOG KONFIRMASI CANCEL EXTENSION ===== */}
      <Dialog
        open={!!extCancelSchedule}
        onOpenChange={(o) => {
          if (!o) setExtCancelSchedule(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Apakah ingin membatalkan perpanjangan yang sudah diatur?
            </DialogTitle>
            <DialogDescription>
              Pengajuan akan dihapus dan tidak bisa dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setExtCancelSchedule(null)}
              disabled={extProcessing}
            >
              Pikir Lagi
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelExtension}
              disabled={extProcessing}
              className="gap-1.5"
            >
              {extProcessing ? (
                <Spinner className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              Batalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}