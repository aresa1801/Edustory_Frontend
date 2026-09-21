'use client'

import { AlertTriangle, XCircle } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  User,
  Circle,
  Users,
  RefreshCw,
  CheckCircle,
  RotateCw,
  School,
  UsersRound,
  Target,
  GraduationCap,
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
interface StudentProfile {
  id: string
  name: string
  avatar: string | null
  grade: string
  address: string
  matchedSubjects: string[]
  gender: string
  phone: string
  bio: string
  schoolName: string
  schoolType: string
  schoolCity: string
  parentName: string
  parentRelation: string
  parentPhone: string
  parentEmail: string
  isOnline: boolean
}

interface ScheduleItem {
  id: string
  matchId: string
  status: 'active' | 'completed' | 'cancelled'
  schedulesSummaryFix: any
  schedulesCustom: any
  acceptedAt: string
  contractEndDate: string
  extensionRequest?: any | null
  extensionNotification?: any | null
  student: StudentProfile
}

// ========== HELPER ==========
const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  completed: 'bg-slate-500/20 text-slate-700 border-slate-500/30',
  cancelled: 'bg-red-500/20 text-red-700 border-red-500/30',
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

function renderScheduleSummary(summary: any) {
  if (!summary) return <span className="text-sm text-muted-foreground italic">-</span>
  if (typeof summary === 'string') {
    return <span className="text-sm text-muted-foreground">{summary}</span>
  }
  if (Array.isArray(summary)) {
    if (summary.length === 0) {
      return <span className="text-sm text-muted-foreground italic">-</span>
    }
    return (
      <div className="space-y-1">
        {summary.map((item, idx) => (
          <div key={idx} className="text-sm text-muted-foreground">
            <span className="font-medium">{item.subject}:</span> {item.day}, {item.time} (
            {item.count} sesi)
          </div>
        ))}
      </div>
    )
  }
  return <span className="text-sm text-muted-foreground">{JSON.stringify(summary)}</span>
}

// ========== KOMPONEN UTAMA ==========
export default function TutorSchedulePage() {
  const router = useRouter()
  const { user: authUser, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [mode, setMode] = useState<'online' | 'offline' | 'all'>('all')
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null)
  const [showProfileDialog, setShowProfileDialog] = useState(false)

    // ===== EXTENSION STATE =====
  const [extActionSchedule, setExtActionSchedule] = useState<ScheduleItem | null>(null)
  const [processingExt, setProcessingExt] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const handleExtAction = async (action: 'approve' | 'reject') => {
    if (!extActionSchedule || !authUser || processingExt) return
    setProcessingExt(true)
    try {
      const res = await fetch(
        `/api/match-schedules/${extActionSchedule.matchId}/extend`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, role: 'tutor', user_id: authUser.id }),
        }
      )
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal')

      alert(
        action === 'approve'
          ? '✅ Perpanjangan disetujui! Kontrak kembali aktif.'
          : '❌ Perpanjangan ditolak.'
      )
      setExtActionSchedule(null)
      await fetchData()
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setProcessingExt(false)
    }
  }

  // ========== FETCH DATA ==========
  const fetchData = async () => {
    if (!authUser) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/match-schedules?user_id=${authUser.id}&role=tutor`,
        {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        }
      )
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Gagal mengambil data jadwal')
      }
      const data: ScheduleItem[] = await res.json()
      setSchedules(data)
    } catch (err: any) {
      console.error('[TutorSchedule] Fetch error:', err)
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!authUser) {
      setLoading(false)
      return
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, authLoading])

  const handleRefresh = () => fetchData()

  // ========== FILTER ==========
  const activeSchedules = schedules.filter(
    (s) => s.status === 'active' && !isExpiredContract(s.contractEndDate)
  )
  const completedSchedules = schedules.filter(
    (s) => s.status === 'completed' || isExpiredContract(s.contractEndDate)
  )

  function isExpiredContract(endDate: string) {
    if (!endDate) return false
    return new Date(endDate).getTime() < Date.now()
  }

  const filterByMode = (list: ScheduleItem[]) => {
    if (mode === 'online') return list.filter((s) => s.student.isOnline === true)
    if (mode === 'offline') return list.filter((s) => s.student.isOnline === false)
    return list
  }

  const filteredActive = filterByMode(activeSchedules)
  const filteredCompleted = filterByMode(completedSchedules)

  const totalOnline = schedules.filter((s) => s.student.isOnline).length
  const totalOffline = schedules.filter((s) => !s.student.isOnline).length

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

  const handleViewSchedule = (schedule: ScheduleItem) => {
    router.push(`/dashboard/tutor/schedule/${schedule.matchId}`)
  }

  const handleViewProfile = (schedule: ScheduleItem) => {
    setSelectedSchedule(schedule)
    setSelectedStudent(schedule.student)
    setShowProfileDialog(true)
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
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500 font-medium">❌ {error}</p>
            <Button variant="outline" onClick={handleRefresh} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ========== RENDER ==========
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jadwal Mengajar</h1>
          <p className="text-muted-foreground">
            Kelola jadwal mengajar dengan siswa yang sudah dikonfirmasi.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Filter:</span>
            <button
              onClick={toggleMode}
              className="px-3 py-1.5 text-xs font-medium rounded-md border bg-background hover:bg-muted transition-colors"
            >
              {getModeLabel()}
            </button>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Siswa</p>
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
                ? 'Belum ada siswa aktif.'
                : `Tidak ada siswa aktif dengan status ${getModeLabel().toLowerCase()}.`}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredActive.map((schedule) => {
              const daysLeft = getDaysLeft(schedule.contractEndDate)
              const student = schedule.student

              return (
                <Card
                  key={schedule.id}
                  className="border shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                            {student.avatar ? (
                              <img
                                src={student.avatar}
                                alt={student.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              student.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{student.name}</h3>
                            <span className="text-xs text-muted-foreground">
                              {student.grade} | {student.matchedSubjects.join(', ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Circle
                              className={`h-2 w-2 fill-current ${
                                student.isOnline ? 'text-green-500' : 'text-gray-400'
                              }`}
                            />
                            <span className="text-muted-foreground">
                              {student.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            <span className="font-medium">Kontrak berakhir:</span>{' '}
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
                          Profil Siswa
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
              const student = schedule.student
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
                            {student.avatar ? (
                              <img
                                src={student.avatar}
                                alt={student.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              student.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{student.name}</h3>
                            <span className="text-xs text-muted-foreground">
                              {student.grade} | {student.matchedSubjects.join(', ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Circle
                              className={`h-2 w-2 fill-current ${
                                student.isOnline ? 'text-green-500' : 'text-gray-400'
                              }`}
                            />
                            <span className="text-muted-foreground">
                              {student.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            <span className="font-medium">Berakhir pada:</span>{' '}
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
                          Profil Siswa
                        </Button>
                                                {schedule.extensionRequest?.status === 'pending' ? (
                          <div className="flex flex-col gap-2 items-end">
                            <div className="text-xs text-amber-400 font-mono font-bold">
                              {(() => {
                                const diff =
                                  new Date(schedule.extensionRequest.deadline).getTime() -
                                  Date.now()
                                if (diff <= 0) return 'Waktu habis'
                                const d = Math.floor(diff / 86400000)
                                const h = Math.floor((diff % 86400000) / 3600000)
                                const m = Math.floor((diff % 3600000) / 60000)
                                if (d > 0) return `Sisa ${d}h ${h}j`
                                return `Sisa ${h}j ${m}m`
                              })()}
                            </div>
                            <Button
                              variant="default"
                              size="sm"
                              className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={() => setExtActionSchedule(schedule)}
                            >
                              <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                              Konfirmasi Perpanjangan
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            disabled
                          >
                            <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                            Menunggu Perpanjangan
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

      {/* ========== DIALOG PROFIL SISWA ========== */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Profil Siswa</DialogTitle>
            <DialogDescription>
              Informasi lengkap siswa yang telah dikonfirmasi.
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && selectedSchedule && (
            <div className="space-y-6 py-2">
              {/* HEADER PROFIL */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 overflow-hidden">
                  {selectedStudent.avatar ? (
                    <img
                      src={selectedStudent.avatar}
                      alt={selectedStudent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    selectedStudent.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedStudent.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {selectedStudent.grade}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs">
                      <Circle
                        className={`h-2.5 w-2.5 fill-current ${
                          selectedStudent.isOnline ? 'text-green-500' : 'text-gray-400'
                        }`}
                      />
                      <span className="text-muted-foreground">
                        {selectedStudent.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GRID 3 KOLOM */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* KOLOM 1: DATA SISWA */}
                <Card className="border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <User className="w-4 h-4 text-blue-500" />
                      <h4 className="font-semibold text-sm">Data Siswa</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Nama Lengkap</p>
                        <p className="font-medium">{selectedStudent.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Jenis Kelamin</p>
                        <p className="font-medium">{selectedStudent.gender || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">No. HP / WhatsApp</p>
                        <p className="font-medium">{selectedStudent.phone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Alamat Rumah</p>
                        <p className="font-medium">{selectedStudent.address || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tentang Saya</p>
                        <p className="font-medium italic">{selectedStudent.bio || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KOLOM 2: DATA SEKOLAH */}
                <Card className="border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <School className="w-4 h-4 text-purple-500" />
                      <h4 className="font-semibold text-sm">Data Sekolah</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Nama Sekolah</p>
                        <p className="font-medium">{selectedStudent.schoolName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Jenjang Sekolah</p>
                        <p className="font-medium">{selectedStudent.schoolType || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Kota Sekolah</p>
                        <p className="font-medium">{selectedStudent.schoolCity || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Kelas</p>
                        <p className="font-medium">{selectedStudent.grade || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Mata Pelajaran</p>
                        <p className="font-medium">
                          {selectedStudent.matchedSubjects.join(', ') || '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KOLOM 3: DATA ORANG TUA */}
                <Card className="border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <UsersRound className="w-4 h-4 text-green-500" />
                      <h4 className="font-semibold text-sm">Data Orang Tua / Wali</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Nama Orang Tua / Wali</p>
                        <p className="font-medium">{selectedStudent.parentName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hubungan</p>
                        <p className="font-medium">{selectedStudent.parentRelation || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">No. HP Orang Tua</p>
                        <p className="font-medium">{selectedStudent.parentPhone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email Orang Tua</p>
                        <p className="font-medium break-all">
                          {selectedStudent.parentEmail || '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* TUJUAN BELAJAR (placeholder sementara) */}
              <Card className="border shadow-sm bg-blue-50/50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-sm">Tujuan Belajar</h4>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    -
                  </p>
                </CardContent>
              </Card>

              {/* JADWAL: TERKINI & KUSTOM */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <h4 className="font-semibold text-sm">Jadwal Terkini</h4>
                    </div>
                    <div className="pt-1">
                      {renderScheduleSummary(selectedSchedule.schedulesSummaryFix)}
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
                      {selectedSchedule.schedulesCustom ? (
                        renderScheduleSummary(selectedSchedule.schedulesCustom)
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Belum ada jadwal kustom.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* KONTRAK */}
              <Card className="border shadow-sm bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 pb-2 border-b mb-3">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    <h4 className="font-semibold text-sm">Informasi Kontrak</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Mulai Kontrak</p>
                      <p className="font-medium">{formatDate(selectedSchedule.acceptedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Berakhir Kontrak</p>
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
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

            {/* ===== DIALOG: EXTENSION ACTION (tutor) ===== */}
      <Dialog open={!!extActionSchedule} onOpenChange={(o) => { if (!o) setExtActionSchedule(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Konfirmasi Perpanjangan Kontrak
            </DialogTitle>
            <DialogDescription>
              Siswa mengajukan perpanjangan. Periksa detail, lalu tentukan setuju atau tolak.
            </DialogDescription>
          </DialogHeader>

          {extActionSchedule?.extensionRequest && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Durasi</p>
                  <p className="font-semibold">{extActionSchedule.extensionRequest.duration_days} hari</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sesi/bulan</p>
                  <p className="font-semibold">{extActionSchedule.extensionRequest.new_sessions_per_month}×</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Budget/bulan</p>
                  <p className="font-semibold">
                    Rp {Number(extActionSchedule.extensionRequest.new_budget_per_month || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">
                  Jadwal yang Diajukan ({extActionSchedule.extensionRequest.proposed_slots?.length || 0} sesi)
                </p>
                <div className="max-h-60 overflow-y-auto border rounded-md">
                  <ul className="divide-y">
                    {(extActionSchedule.extensionRequest.proposed_slots || [])
                      .slice()
                      .sort((a: any, b: any) => a.date.localeCompare(b.date))
                      .map((slot: any, idx: number) => (
                        <li key={idx} className="p-2 text-xs flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] shrink-0">{slot.subject}</Badge>
                          <span className="text-muted-foreground">
                            {new Date(`${slot.date}T00:00:00Z`).toLocaleDateString('id-ID', {
                              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                            })}, {slot.timeSlot}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs text-muted-foreground">
                  Kalau disetujui: kontrak diperpanjang <strong>75 hari</strong>, semua sesi lama diganti dengan jadwal baru, dan status kontrak kembali <strong>aktif</strong>.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1 gap-1.5"
              onClick={() => handleExtAction('reject')}
              disabled={processingExt}
            >
              {processingExt ? <Spinner className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              Tolak
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
              onClick={() => handleExtAction('approve')}
              disabled={processingExt}
            >
              {processingExt ? <Spinner className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Setujui Perpanjangan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}