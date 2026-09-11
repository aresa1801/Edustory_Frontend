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
  Phone,
  Mail,
  Circle,
  Users,
  RefreshCw,
  BookOpen,
  CheckCircle,
  RotateCw,
  Star,
  Award,
  Briefcase,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

// ========== TIPE DATA ==========
interface TutorSchedule {
  id: string
  matchId: string
  status: 'active' | 'completed' | 'cancelled'
  schedulesSummaryFix: any
  schedulesCustom: any
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
    hourlyRate: number
    rating: number
    totalReviews: number
    verifiedGradeLevels: string[]
    avatar: string | null
    isOnline: boolean
  }
}

// ========== HELPER ==========
const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

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

function getTotalSessions(summary: any): number {
  if (!Array.isArray(summary)) return 0
  return summary.reduce((sum: number, item: any) => sum + (item.count || 0), 0)
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
      return list.filter((s) => s.student?.isOnline === false)
    return list
  }

  const filteredActive = filterByMode(activeSchedules)
  const filteredCompleted = filterByMode(completedSchedules)

  const totalOnline = schedules.filter(
    (s) => s.student?.isOnline === true
  ).length
  const totalOffline = schedules.filter(
    (s) => !s.student?.isOnline
  ).length

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

  const handleViewProfile = (schedule: TutorSchedule) => {
    setSelectedSchedule(schedule)
    setShowProfileDialog(true)
  }

  const handleRequestExtension = (schedule: TutorSchedule) => {
    alert(
      `✅ Permintaan perpanjangan untuk ${schedule.tutor.fullName} telah dikirim! Silakan tunggu konfirmasi dari tutor.`
    )
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
                              {schedule.student?.matchedSubjects?.join(', ') ||
                                '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Circle
                              className={`h-2 w-2 fill-current ${
                                schedule.student?.isOnline ? 'text-green-500' : 'text-gray-400'
                              }`}
                            />
                            <span className="text-muted-foreground">
                              {schedule.student?.isOnline ? 'Online' : 'Offline'}
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
                              {schedule.student?.matchedSubjects?.join(', ') ||
                                '-'}
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
                        <Button
                          variant="default"
                          size="sm"
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleRequestExtension(schedule)}
                        >
                          <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                          Ajukan Perpanjangan
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

      {/* ===== DIALOG PROFIL TUTOR ===== */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Profil Tutor</DialogTitle>
            <DialogDescription>
              Informasi lengkap tutor yang telah dikonfirmasi.
            </DialogDescription>
          </DialogHeader>

          {selectedSchedule?.tutor && (
            <div className="space-y-4 py-2">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 overflow-hidden">
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
                  <h3 className="text-lg font-semibold">
                    {selectedSchedule.tutor.fullName}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Circle
                      className={`h-2.5 w-2.5 fill-current ${
                        selectedSchedule.student?.isOnline ? 'text-green-500' : 'text-gray-400'
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedSchedule.student?.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* INFORMASI PRIBADI */}
              <Card className="border shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <User className="w-4 h-4 text-blue-500" />
                    <h4 className="font-semibold text-sm">
                      Informasi Pribadi
                    </h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Nama Lengkap
                      </p>
                      <p className="font-medium">
                        {selectedSchedule.tutor.fullName || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium break-all">
                        {selectedSchedule.tutor.email || '-'}
                      </p>
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
                      <p className="text-xs text-muted-foreground">
                        Bio Singkat
                      </p>
                      <p className="font-medium italic">
                        {selectedSchedule.tutor.bio || '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* INFORMASI PROFESIONAL */}
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
                        Pengalaman Mengajar (Tahun)
                      </p>
                      <p className="font-medium">
                        {selectedSchedule.tutor.experienceYears || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Tarif Per Jam (Rp)
                      </p>
                      <p className="font-medium">
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
                        {Array.isArray(
                          selectedSchedule.tutor.verifiedGradeLevels
                        ) &&
                        selectedSchedule.tutor.verifiedGradeLevels.length > 0
                          ? selectedSchedule.tutor.verifiedGradeLevels.join(
                              ', '
                            )
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Rating & Ulasan
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">
                          {selectedSchedule.tutor.rating || 0}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          ({selectedSchedule.tutor.totalReviews || 0} ulasan)
                        </span>
                      </div>
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
    </div>
  )
}