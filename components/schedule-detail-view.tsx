'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Circle,
  RotateCw,
  Video,
  PlayCircle,
  RefreshCw,
  Clock,
  XCircle,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'

interface ScheduleDetailViewProps {
  matchId: string
  role: 'tutor' | 'student'
}

interface ScheduleData {
  id: string
  matchId: string
  status: string
  schedulesSummaryFix: any
  schedulesCustom: any
  acceptedAt: string
  contractEndDate: string
  student: any
  tutor: any
  sessions: any[]
}

const READY_WINDOW_MINUTES = 20

// ========== HELPER ==========
function parseTimeRange(timeStr: string): { start: number; end: number } {
  const match = timeStr.match(/(\d{1,2})\.(\d{2})\s*[-–]\s*(\d{1,2})\.(\d{2})/)
  if (!match) return { start: 12, end: 13 }
  return {
    start: parseInt(match[1]),
    end: parseInt(match[3]),
  }
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDatesBetween(start: string, end: string): Date[] {
  if (!start || !end) return []
  const dates: Date[] = []
  const startDate = new Date(start)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(end)
  endDate.setHours(0, 0, 0, 0)
  const current = new Date(startDate)
  while (current <= endDate && dates.length < 90) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatLongDate(d: Date) {
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getTotalSessions(summary: any): number {
  if (!Array.isArray(summary)) return 0
  return summary.reduce((sum: number, item: any) => sum + (item.count || 0), 0)
}

// ========== BUILD SESSION MAP ==========
function buildSessionMap(
  acceptedAt: string,
  summary: any[]
): Record<string, string> {
  const map: Record<string, string> = {}
  if (!acceptedAt || !Array.isArray(summary)) return map

  const startDate = new Date(acceptedAt)
  startDate.setHours(0, 0, 0, 0)

  const dayIndexMap: Record<string, number> = {
    Minggu: 0,
    Senin: 1,
    Selasa: 2,
    Rabu: 3,
    Kamis: 4,
    Jumat: 5,
    Sabtu: 6,
  }

  summary.forEach((item: any) => {
    const targetDay = dayIndexMap[item.day]
    if (targetDay === undefined) return

    const count = item.count || 0
    const time = item.time
    const subject = item.subject

    if (!time || !subject || count <= 0) return

    const current = new Date(startDate)
    const diff = (targetDay - current.getDay() + 7) % 7
    current.setDate(current.getDate() + diff)

    for (let i = 0; i < count; i++) {
      const key = `${formatDateKey(current)}|${time}`
      map[key] = subject
      current.setDate(current.getDate() + 7)
    }
  })

  return map
}

function getTimeSlots(summary: any): string[] {
  if (!Array.isArray(summary)) return []
  const set = new Set<string>()
  summary.forEach((item: any) => {
    if (item.time) set.add(item.time)
  })
  return Array.from(set).sort()
}

// ========== STATUS SLOT ==========
type SlotStatus = 'upcoming' | 'ongoing' | 'past' | 'cancelled'

const SLOT_STATUS_STYLE: Record<
  SlotStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  upcoming: {
    bg: 'bg-blue-500/30',
    text: 'text-blue-200',
    border: 'border-blue-500/50',
    label: 'Akan Datang',
  },
  ongoing: {
    bg: 'bg-green-500/40',
    text: 'text-green-100',
    border: 'border-green-500/60',
    label: 'Sedang Berlangsung',
  },
  past: {
    bg: 'bg-gray-600/30',
    text: 'text-gray-400',
    border: 'border-gray-600/50',
    label: 'Sudah Lewat',
  },
  cancelled: {
    bg: 'bg-red-500/30',
    text: 'text-red-200',
    border: 'border-red-500/50',
    label: 'Hangus',
  },
}

function getSlotStatus(
  date: Date,
  timeSlot: string,
  sessions: any[],
  now: Date
): SlotStatus {
  const { start, end } = parseTimeRange(timeSlot)
  const dateKey = formatDateKey(date)

  const startTime = new Date(date)
  startTime.setHours(start, 0, 0, 0)

  const endTime = new Date(date)
  endTime.setHours(end, 0, 0, 0)

  const matched = sessions.find((s) => {
    const sd = new Date(s.scheduled_at)
    return formatDateKey(sd) === dateKey && sd.getHours() === start
  })

  if (matched?.cancelled_at) return 'cancelled'

  if (matched?.started_at) {
    if (now >= startTime && now < endTime) return 'ongoing'
    return 'past'
  }

  const deadline = new Date(
    startTime.getTime() + READY_WINDOW_MINUTES * 60 * 1000
  )

  if (now < startTime) return 'upcoming'
  if (now >= startTime && now < deadline) return 'upcoming'
  return 'cancelled'
}

// ========== KOMPONEN ==========
export default function ScheduleDetailView({
  matchId,
  role,
}: ScheduleDetailViewProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ScheduleData | null>(null)
  const [now, setNow] = useState(new Date())
  const [readyLoading, setReadyLoading] = useState(false)

  const fetchData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)

        const res = await fetch(`/api/match-schedules/${matchId}`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Gagal memuat jadwal')
        }
        const result = await res.json()
        setData(result)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [matchId]
  )

  useEffect(() => {
    if (matchId) fetchData(false)
  }, [matchId, fetchData])

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const allDates = useMemo(() => {
    if (!data?.acceptedAt || !data?.contractEndDate) return []
    return getDatesBetween(data.acceptedAt, data.contractEndDate)
  }, [data?.acceptedAt, data?.contractEndDate])

  const monthGroups = useMemo(() => {
    const groups: Record<string, Date[]> = {}
    allDates.forEach((d) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!groups[key]) groups[key] = []
      groups[key].push(d)
    })
    return groups
  }, [allDates])

  const monthKeys = Object.keys(monthGroups)
  const [activeMonth, setActiveMonth] = useState<string>(monthKeys[0] || '')

  useEffect(() => {
    if (monthKeys.length > 0 && !activeMonth) {
      setActiveMonth(monthKeys[0])
    }
  }, [monthKeys, activeMonth])

  const visibleDates = monthGroups[activeMonth] || []

  const sessionMap = useMemo(() => {
    if (!data?.acceptedAt || !data?.schedulesSummaryFix) return {}
    return buildSessionMap(data.acceptedAt, data.schedulesSummaryFix)
  }, [data?.acceptedAt, data?.schedulesSummaryFix])

  const timeSlots = useMemo(() => {
    if (!data?.schedulesSummaryFix) return []
    return getTimeSlots(data.schedulesSummaryFix)
  }, [data?.schedulesSummaryFix])

  // ===== NEXT SESSION =====
  const nextSession = useMemo(() => {
    let next: {
      date: Date
      timeSlot: string
      subject: string
      sessionRow: any | null
    } | null = null

    for (const [key, subject] of Object.entries(sessionMap)) {
      const [dateStr, timeSlot] = key.split('|')
      const { start } = parseTimeRange(timeSlot)
      const date = new Date(dateStr)
      date.setHours(start, 0, 0, 0)

      const deadline = date.getTime() + READY_WINDOW_MINUTES * 60 * 1000

      if (deadline > now.getTime()) {
        if (!next || date < next.date) {
          const sessionRow = (data?.sessions || []).find((s: any) => {
            const sd = new Date(s.scheduled_at)
            return (
              formatDateKey(sd) === formatDateKey(date) &&
              sd.getHours() === start
            )
          })
          next = { date, timeSlot, subject, sessionRow: sessionRow || null }
        }
      }
    }
    return next
  }, [sessionMap, now, data?.sessions])

  // ===== TIMER STATE =====
  const timerState = useMemo(() => {
    if (!nextSession) return null

    const startMs = nextSession.date.getTime()
    const nowMs = now.getTime()
    const deadlineMs = startMs + READY_WINDOW_MINUTES * 60 * 1000

    const sessionRow = nextSession.sessionRow
    const isStarted = !!sessionRow?.started_at
    const isCancelled = !!sessionRow?.cancelled_at
    const tutorReady = !!sessionRow?.tutor_ready_at
    const studentReady = !!sessionRow?.student_ready_at

    // Siapa yang sudah ready
    const iAmReady = role === 'tutor' ? tutorReady : studentReady
    const otherReady = role === 'tutor' ? studentReady : tutorReady

    if (isCancelled) {
      return { state: 'cancelled' as const }
    }

    if (isStarted) {
      return { state: 'started' as const }
    }

    if (nowMs < startMs) {
      const diffMin = Math.ceil((startMs - nowMs) / 60000)
      return { state: 'before' as const, minutesUntil: diffMin }
    }

    if (nowMs >= deadlineMs) {
      return { state: 'expired' as const }
    }

    const remainingMs = deadlineMs - nowMs
    const min = Math.floor(remainingMs / 60000)
    const sec = Math.floor((remainingMs % 60000) / 1000)
    return {
      state: 'active' as const,
      label: `${min.toString().padStart(2, '0')}:${sec
        .toString()
        .padStart(2, '0')}`,
      remainingMs,
      iAmReady,
      otherReady,
    }
  }, [nextSession, now, role])

  // ===== JADWAL TERKINI (count disesuaikan) =====
  const adjustedScheduleSummary = useMemo(() => {
    if (!Array.isArray(data?.schedulesSummaryFix)) return []
    if (!data?.acceptedAt) return data?.schedulesSummaryFix || []

    const startDate = new Date(data.acceptedAt)
    startDate.setHours(0, 0, 0, 0)

    const dayIndexMap: Record<string, number> = {
      Minggu: 0,
      Senin: 1,
      Selasa: 2,
      Rabu: 3,
      Kamis: 4,
      Jumat: 5,
      Sabtu: 6,
    }

    return data.schedulesSummaryFix.map((item: any) => {
      const targetDay = dayIndexMap[item.day]
      if (targetDay === undefined) return item

      const count = item.count || 0
      const time = item.time

      if (!time || count <= 0) return item

      const current = new Date(startDate)
      const diff = (targetDay - current.getDay() + 7) % 7
      current.setDate(current.getDate() + diff)

      let passedCount = 0
      for (let i = 0; i < count; i++) {
        const { end } = parseTimeRange(time)
        const sessionEnd = new Date(current)
        sessionEnd.setHours(end, 0, 0, 0)

        if (sessionEnd <= now) {
          passedCount++
        }
        current.setDate(current.getDate() + 7)
      }

      return {
        ...item,
        count: Math.max(0, count - passedCount),
        originalCount: count,
        passedCount,
      }
    })
  }, [data?.schedulesSummaryFix, data?.acceptedAt, now])

  const handleBack = () => router.back()
  const handleRefresh = () => fetchData(true)

  const handleReady = async () => {
    if (!data) return
    const activeSession = data.sessions.find((s) => {
      if (s.started_at || s.cancelled_at) return false
      const sd = new Date(s.scheduled_at)
      const diff = (now.getTime() - sd.getTime()) / 1000 / 60
      return diff >= 0 && diff <= READY_WINDOW_MINUTES
    })

    if (!activeSession) {
      alert(
        'Tidak ada sesi aktif saat ini. Tombol hanya bisa dipakai saat jam belajar dimulai (dalam 20 menit pertama).'
      )
      return
    }

    setReadyLoading(true)

    const readyField = role === 'tutor' ? 'tutor_ready_at' : 'student_ready_at'
    const readyAt = new Date().toISOString()
    const prevSessions = data.sessions

    // 1. Optimistic update
    setData({
      ...data,
      sessions: data.sessions.map((s: any) =>
        s.id === activeSession.id ? { ...s, [readyField]: readyAt } : s
      ),
    })

    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/ready`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })

      let result: any
      try {
        result = await res.json()
      } catch {
        throw new Error(
          `Server error ${res.status}. Pastikan API /api/sessions/[sessionId]/ready ada.`
        )
      }

      if (!res.ok) throw new Error(result.error || `Server error ${res.status}`)

      // 2. Update state DARI RESPONS PATCH (bukan refetch)
      const bothReady = !!result.both_ready
      setData((prev) =>
        prev
          ? {
              ...prev,
              sessions: prev.sessions.map((s: any) =>
                s.id === activeSession.id
                  ? {
                      ...s,
                      [readyField]: readyAt,
                      ...(bothReady
                        ? { started_at: readyAt, status: 'ongoing' }
                        : {}),
                    }
                  : s
              ),
            }
          : prev
      )
    } catch (err: any) {
      // 3. Revert kalau gagal
      setData((prev) => (prev ? { ...prev, sessions: prevSessions } : prev))
      alert('❌ ' + err.message)
    } finally {
      setReadyLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="mt-3 text-muted-foreground">Memuat jadwal...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>
            ❌ {error || 'Data tidak ditemukan'}
          </AlertDescription>
        </Alert>
        <Button onClick={handleBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Kembali
        </Button>
      </div>
    )
  }

  // ===== COUNTERPART =====
  const counterpartLabel = role === 'tutor' ? 'Siswa' : 'Tutor'
  const counterpartName =
    role === 'tutor'
      ? data.student.name || 'Siswa'
      : data.tutor?.fullName || 'Tutor'
  const counterpartAvatar =
    role === 'tutor' ? data.student.avatar : data.tutor?.avatar
  const counterpartIsOnline =
    role === 'tutor'
      ? data.student.isOnline
      : data.tutor?.isOnline ?? true

  const isStudentOffline = data.student.isOnline === false
  const hasCoords =
    data.student.latitude != null && data.student.longitude != null
  const showCoordinates =
    role === 'tutor' && isStudentOffline && hasCoords

  const openMapsToStudent = () => {
    if (!hasCoords) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${data.student.latitude},${data.student.longitude}&travelmode=driving`
    window.open(url, '_blank')
  }

  // Kunci tombol kalau sudah klik
  const iAmAlreadyReady =
    timerState?.state === 'active' && !!timerState.iAmReady

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Detail Jadwal</h1>
            <p className="text-muted-foreground text-sm">
              {role === 'tutor'
                ? 'Jadwal mengajar yang sudah dikonfirmasi'
                : 'Jadwal belajar yang sudah dikonfirmasi'}
            </p>
          </div>
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

      {/* ===== INFO CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                {counterpartAvatar ? (
                  <img
                    src={counterpartAvatar}
                    alt={counterpartName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  counterpartName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  {counterpartLabel}
                </p>
                <p className="font-semibold truncate">{counterpartName}</p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">
                      {role === 'tutor'
                        ? data.student.sessionsPerMonth > 0
                          ? `Rp ${Math.round(
                              data.student.budgetPerMonth /
                                data.student.sessionsPerMonth
                            ).toLocaleString('id-ID')}`
                          : '-'
                        : data.tutor?.hourlyRate
                        ? `Rp ${Number(
                            data.tutor.hourlyRate
                          ).toLocaleString('id-ID')}`
                        : '-'}
                    </span>
                    /jam
                  </span>
                  <span>
                    <span className="font-medium text-foreground">
                      {getTotalSessions(data.schedulesSummaryFix)}
                    </span>{' '}
                    sesi
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Circle
                      className={`h-2 w-2 fill-current ${
                        counterpartIsOnline
                          ? 'text-green-500'
                          : 'text-gray-400'
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {counterpartIsOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {!counterpartIsOnline && showCoordinates && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                      onClick={openMapsToStudent}
                      title="Lihat lokasi siswa di Google Maps"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Mulai Kontrak</p>
                <p className="font-medium">{formatDate(data.acceptedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Berakhir Kontrak
                </p>
                <p className="font-medium">
                  {formatDate(data.contractEndDate)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">
                  Mata Pelajaran
                </p>
                <p className="font-medium">
                  {data.student.matchedSubjects?.join(', ') || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== KALENDER ===== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Kalender Jadwal</CardTitle>
          <div className="flex items-center gap-2">
            {monthKeys.map((key) => {
              const d = monthGroups[key][0]
              const label = d.toLocaleDateString('id-ID', {
                month: 'short',
                year: 'numeric',
              })
              return (
                <Button
                  key={key}
                  size="sm"
                  variant={activeMonth === key ? 'default' : 'outline'}
                  onClick={() => setActiveMonth(key)}
                  className="text-xs"
                >
                  {label}
                </Button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500/50 border border-blue-400/60" />
              <span className="text-muted-foreground">Akan Datang</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500/50 border border-green-400/60" />
              <span className="text-muted-foreground">
                Sedang Berlangsung
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-600/40 border border-gray-500/60" />
              <span className="text-muted-foreground">Sudah Lewat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500/40 border border-red-400/60" />
              <span className="text-muted-foreground">Hangus</span>
            </div>
          </div>

          {visibleDates.length === 0 || timeSlots.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Belum ada jadwal yang ditentukan.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border p-1 min-w-[100px] text-left sticky left-0 bg-gray-800 z-10 border-r-2 font-semibold text-white">
                      Jam
                    </th>
                    {visibleDates.map((date, idx) => {
                      const isPast = date < new Date()
                      return (
                        <th
                          key={idx}
                          className={`border p-1 text-center min-w-[50px] ${
                            isPast
                              ? 'bg-gray-700 text-gray-400'
                              : 'bg-gray-800 text-white'
                          }`}
                        >
                          <div>{date.getDate()}</div>
                          <div className="text-xs opacity-70">
                            {date.toLocaleDateString('id-ID', {
                              weekday: 'short',
                            })}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="border p-1 font-medium text-xs sticky left-0 bg-gray-800 z-10 border-r-2 text-white">
                        {slot}
                      </td>
                      {visibleDates.map((date, colIdx) => {
                        const key = `${formatDateKey(date)}|${slot}`
                        const subject = sessionMap[key]
                        const isScheduled = !!subject

                        const status: SlotStatus = isScheduled
                          ? getSlotStatus(
                              date,
                              slot,
                              data.sessions || [],
                              now
                            )
                          : 'past'

                        const style = SLOT_STATUS_STYLE[status]

                        return (
                          <td
                            key={colIdx}
                            className={`border p-0.5 text-center ${
                              !isScheduled ? 'opacity-30' : ''
                            }`}
                          >
                            <div
                              className={`w-full h-10 flex items-center justify-center rounded text-xs font-semibold border ${
                                isScheduled
                                  ? `${style.bg} ${style.text} ${style.border}`
                                  : 'bg-gray-100/5 text-gray-600 border-transparent'
                              }`}
                              title={
                                isScheduled
                                  ? `${subject} - ${style.label} (${slot})`
                                  : ''
                              }
                            >
                              {isScheduled
                                ? subject.charAt(0).toUpperCase()
                                : ''}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== JADWAL BERIKUTNYA + TIMER ===== */}
      {nextSession && timerState && (
        <Card
          className={`transition-colors ${
            timerState.state === 'active'
              ? 'border-green-500/60 bg-green-500/5'
              : timerState.state === 'expired'
              ? 'border-red-500/60 bg-red-500/5'
              : timerState.state === 'cancelled'
              ? 'border-red-500/40 bg-red-500/5'
              : timerState.state === 'started'
              ? 'border-green-500/40 bg-green-500/5'
              : 'border-primary/40 bg-primary/5'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  timerState.state === 'active'
                    ? 'bg-green-500/20'
                    : timerState.state === 'expired' ||
                      timerState.state === 'cancelled'
                    ? 'bg-red-500/20'
                    : timerState.state === 'started'
                    ? 'bg-green-500/20'
                    : 'bg-primary/20'
                }`}
              >
                {timerState.state === 'expired' ||
                timerState.state === 'cancelled' ? (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : timerState.state === 'started' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock
                    className={`w-5 h-5 ${
                      timerState.state === 'active'
                        ? 'text-green-500'
                        : 'text-primary'
                    }`}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    Jadwal Berikutnya
                  </p>
                  {timerState.state === 'active' && (
                    <Badge className="bg-green-500/20 text-green-200 border-green-500/40 text-[10px]">
                      SEDANG BERLANGSUNG
                    </Badge>
                  )}
                  {timerState.state === 'expired' && (
                    <Badge className="bg-red-500/20 text-red-200 border-red-500/40 text-[10px]">
                      WAKTU HABIS
                    </Badge>
                  )}
                  {timerState.state === 'cancelled' && (
                    <Badge className="bg-red-500/20 text-red-200 border-red-500/40 text-[10px]">
                      HANGUS
                    </Badge>
                  )}
                  {timerState.state === 'started' && (
                    <Badge className="bg-green-500/20 text-green-200 border-green-500/40 text-[10px]">
                      BERLANGSUNG
                    </Badge>
                  )}
                </div>
                <p className="font-semibold text-sm">
                  {formatLongDate(nextSession.date)}, {nextSession.timeSlot}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nextSession.subject}
                </p>

                {/* Pesan & timer */}
                {timerState.state === 'before' && (
                  <p className="text-xs text-primary mt-1">
                    Dimulai dalam {timerState.minutesUntil} menit. Tombol "Siap
                    Belajar/Mengajar" akan aktif saat jam belajar dimulai.
                  </p>
                )}

                {timerState.state === 'active' && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Sisa waktu:
                      </span>
                      <span className="font-mono font-bold text-green-400 text-lg">
                        {timerState.label}
                      </span>
                    </div>

                    {/* Belum klik → suruh klik */}
                    {!timerState.iAmReady && (
                      <p className="text-xs text-muted-foreground">
                        Tekan tombol{' '}
                        <span className="font-semibold text-green-400">
                          "
                          {role === 'tutor'
                            ? 'Siap Mengajar'
                            : 'Siap Belajar'}
                          "
                        </span>{' '}
                        sekarang. Jika kedua pihak tidak menekan dalam batas
                        waktu, sesi akan hangus.
                      </p>
                    )}

                    {/* Sudah klik, tunggu lawan */}
                    {timerState.iAmReady && (
                      <p className="text-xs text-green-400">
                        ✅ Kamu sudah siap. Sekarang tinggal menunggu{' '}
                        <strong>
                          {role === 'tutor' ? 'murid' : 'tutor'}
                        </strong>{' '}
                        untuk menekan tombol{' '}
                        <span className="font-semibold">
                          "
                          {role === 'tutor'
                            ? 'Siap Belajar'
                            : 'Siap Mengajar'}
                          "
                        </span>{' '}
                        dan proses belajar-mengajar akan berlangsung.
                      </p>
                    )}
                  </div>
                )}

                {timerState.state === 'expired' && (
                  <p className="text-xs text-red-400 mt-1">
                    Waktu 20 menit sudah habis tanpa konfirmasi. Sesi ini
                    ditandai <strong>hangus</strong> dan tidak dapat
                    dilanjutkan.
                  </p>
                )}

                {timerState.state === 'cancelled' && (
                  <p className="text-xs text-red-400 mt-1">
                    Sesi ini sudah dibatalkan/hangus.
                  </p>
                )}

                {timerState.state === 'started' && (
                  <p className="text-xs text-green-400 mt-1">
                    Kedua pihak sudah siap. Sesi sedang berlangsung.
                  </p>
                )}
              </div>

              {showCoordinates && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 shrink-0"
                  onClick={openMapsToStudent}
                  title="Buka lokasi siswa di Google Maps"
                >
                  <MapPin className="w-4 h-4" />
                  <span className="hidden sm:inline">Lokasi</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== JADWAL TERKINI & KUSTOM ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              Jadwal Terkini
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(adjustedScheduleSummary) &&
            adjustedScheduleSummary.length > 0 ? (
              <ul className="space-y-1">
                {adjustedScheduleSummary.map((item: any, idx: number) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {item.subject}
                    </Badge>
                    <span className="text-muted-foreground">
                      {item.day}, {item.time}{' '}
                      {item.count > 0 ? (
                        <span>({item.count} sesi)</span>
                      ) : (
                        <span className="text-xs italic">(selesai)</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Belum ada jadwal terkini.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-teal-500" />
              Jadwal Kustom
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(data.schedulesCustom) &&
            data.schedulesCustom.length > 0 ? (
              <ul className="space-y-1">
                {data.schedulesCustom.map((item: any, idx: number) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {item.subject}
                    </Badge>
                    <span className="text-muted-foreground">
                      {item.day}, {item.time} ({item.count} sesi)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Belum ada jadwal kustom.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== ACTION BUTTONS ===== */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className={`flex-1 gap-1.5 ${
                iAmAlreadyReady
                  ? 'bg-green-700 hover:bg-green-700 cursor-default'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
              onClick={handleReady}
              disabled={readyLoading || iAmAlreadyReady}
            >
              {readyLoading ? (
                <Spinner className="w-4 h-4" />
              ) : iAmAlreadyReady ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              {iAmAlreadyReady
                ? role === 'tutor'
                  ? 'Sudah Siap Mengajar'
                  : 'Sudah Siap Belajar'
                : role === 'tutor'
                ? 'Siap Mengajar'
                : 'Siap Belajar'}
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onClick={() => alert('🎥 Video call akan segera hadir.')}
            >
              <Video className="w-4 h-4 mr-1.5" />
              Mulai Video Call
            </Button>

            <Button
              variant="destructive"
              className="flex-1"
              onClick={() =>
                alert('Fitur selesaikan kontrak akan segera hadir.')
              }
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Selesaikan Kontrak
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}