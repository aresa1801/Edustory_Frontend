'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import FilekuCard from '@/components/fileku-card'
import { useAuth } from '@/lib/auth-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Info } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
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
  Send,
  Settings,
} from 'lucide-react'

import RescheduleWizard, {
  type SourceSlot,
  type ReschedulePayload,
} from '@/components/reschedule-wizard'

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
  schedulesCustomRequest: any
  rescheduleNotification?: any | null
  extensionRequest?: any | null
  extensionNotification?: any | null
  tutorPrivateFolderLabel?: string
  studentPrivateFolderLabel?: string
  gmeetLink?: string | null
  terminationRequest?: any | null
  contractEndedAt?: string | null
  acceptedAt: string
  contractEndDate: string
  student: any
  tutor: any
  sessions: any[]
}

// ============================================================
// SECURITY: GMeet Link Validator
// ============================================================
const ALLOWED_GMEET_DOMAINS = ['meet.google.com', 'hangouts.google.com']

function isSafeGmeetLink(link: string | null | undefined): boolean {
  if (!link || typeof link !== 'string') return false
  if (link.length > 500) return false

  const lower = link.toLowerCase()

  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('about:')
  ) {
    return false
  }

  if (!lower.startsWith('https://')) return false

  try {
    const url = new URL(link)
    const hostname = url.hostname.toLowerCase()
    return ALLOWED_GMEET_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith('.' + d)
    )
  } catch {
    return false
  }
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

// ===== REQUEST DEADLINE & COUNTDOWN =====
function getRequestDeadline(request: any): number {
  if (!request) return 0

  // Deadline 1: requested_at + 2 hari
  const requestedAt = new Date(request.requested_at).getTime()
  const deadline1 = requestedAt + 2 * 24 * 60 * 60 * 1000

  // Deadline 2: waktu target (date + startHour)
  const { start } = parseTimeRange(request.to?.time || '00.00 - 01.00')
  const targetDate = new Date(request.to?.date || '')
  targetDate.setHours(start, 0, 0, 0)
  const deadline2 = targetDate.getTime()

  // Ambil yang paling cepat
  return Math.min(deadline1, deadline2)
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Waktu habis'
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60

  if (days > 0) {
    return `${days} hari ${hours} jam ${minutes} menit`
  }
  return `${hours} jam ${minutes} menit ${seconds} detik`
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

function getTimeSlotFromDate(d: Date): string {
  const h = d.getHours()
  const nextH = h + 1
  return `${String(h).padStart(2, '0')}.00 - ${String(nextH).padStart(2, '0')}.00`
}

// ========== STATUS SLOT ==========
type SlotStatus = 'upcoming' | 'ongoing' | 'past' | 'cancelled' | 'moved'

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
  moved: {
    bg: 'bg-amber-500/40',
    text: 'text-amber-100',
    border: 'border-amber-500/60',
    label: 'Dipindah',
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
  if (matched?.moved_at) return 'moved'

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

function isPendingSourceSlot(
  date: Date,
  slot: string,
  pendingRequest: any
): boolean {
  if (!pendingRequest) return false
  if (pendingRequest.status && pendingRequest.status !== 'pending') return false
  if (!pendingRequest.from) return false
  return (
    formatDateKey(date) === pendingRequest.from.date &&
    slot === pendingRequest.from.time
  )
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
  const [movedInfoItem, setMovedInfoItem] = useState<any | null>(null)
  const { user: authUser } = useAuth()

  // ===== GMEET STATE =====
  const [showGmeetDialog, setShowGmeetDialog] = useState(false)
  const [gmeetInput, setGmeetInput] = useState('')
  const [savingGmeet, setSavingGmeet] = useState(false)
  const [showNoLinkDialog, setShowNoLinkDialog] = useState(false)

  // ===== TERMINATE CONTRACT STATE =====
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)
  const [terminateStep, setTerminateStep] = useState<
    'initial' | 'select' | 'confirm-unilateral' | 'confirm-mutual'
  >('initial')
  const [terminateReason, setTerminateReason] = useState('')
  const [processingTerminate, setProcessingTerminate] = useState(false)
  const [showTerminatedPopup, setShowTerminatedPopup] = useState(false)
  const [showResponseDialog, setShowResponseDialog] = useState(false)
  const [showRejectionNotice, setShowRejectionNotice] = useState(false)

  // ===== RESCHEDULE STATE =====
  const [isRescheduleMode, setIsRescheduleMode] = useState(false)
  const [rescheduleSource, setRescheduleSource] = useState<SourceSlot | null>(
    null
  )
  const [submittingReschedule, setSubmittingReschedule] = useState(false)
  const [processingRequest, setProcessingRequest] = useState(false)
  const [infoItem, setInfoItem] = useState<any | null>(null)

  // ===== RESCHEDULE NOTIFICATION STATE =====
  const [showRescheduleNotification, setShowRescheduleNotification] = useState(false)
  const [acknowledgingNotif, setAcknowledgingNotif] = useState(false)

  // ===== EXTEND CONTRACT STATE =====
  const [showExtensionCancelDialog, setShowExtensionCancelDialog] = useState(false)
  const [showExtensionActionDialog, setShowExtensionActionDialog] = useState(false)
  const [showExtensionNotification, setShowExtensionNotification] = useState(false)
  const [processingExtension, setProcessingExtension] = useState(false)
  const [acknowledgingExtNotif, setAcknowledgingExtNotif] = useState(false)

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

  // Auto-show popup penolakan ke pengaju
  useEffect(() => {
    const tr = data?.terminationRequest
    if (
      tr?.status === 'rejected' &&
      tr?.requested_by === role &&
      !tr?.requester_notified_at
    ) {
      setShowRejectionNotice(true)
    }
  }, [data?.terminationRequest, role])

  // Auto-show popup notifikasi reschedule (approved/rejected)
  useEffect(() => {
    if (data?.rescheduleNotification) {
      setShowRescheduleNotification(true)
    }
  }, [data?.rescheduleNotification])

  // Auto-show popup notifikasi perpanjangan
  useEffect(() => {
    if (data?.extensionNotification) {
      setShowExtensionNotification(true)
    }
  }, [data?.extensionNotification])

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

  // ===== CLICK OUTSIDE UNTUK CANCEL =====
  useEffect(() => {
    if (!isRescheduleMode) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target) return
      // Skip kalau klik di dalam elemen "keep" (kalender & wizard)
      if (target.closest('[data-reschedule-keep="true"]')) return
      // Skip kalau klik di dalam Radix Dialog (modal konfirmasi pakai Portal)
      if (target.closest('[role="dialog"]')) return
      // Skip kalau klik di dalam popper/dropdown
      if (target.closest('[data-radix-popper-content-wrapper]')) return
      // Kalau sampai sini, cancel
      cancelReschedule()
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler)
    }, 200)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [isRescheduleMode])

  const visibleDates = monthGroups[activeMonth] || []

  const sessionMap = useMemo(() => {
  if (!data?.acceptedAt || !data?.schedulesSummaryFix) return {}
  const base = buildSessionMap(data.acceptedAt, data.schedulesSummaryFix)

  // 1. Hapus slot yang dipindah (moved_from) — nanti jadi kuning di render
  ;(data.schedulesCustom || []).forEach((c: any) => {
    if (c.moved_from?.date && c.moved_from?.time) {
      delete base[`${c.moved_from.date}|${c.moved_from.time}`]
    }
  })

  // 2. Tambahkan slot baru (hasil pindah)
  ;(data.schedulesCustom || []).forEach((c: any) => {
    if (c.date && c.time) {
      base[`${c.date}|${c.time}`] = c.subject
    }
  })

  // ⚠️ Cancelled TIDAK dihapus — biar merah muncul di kalender
  return base
}, [data?.acceptedAt, data?.schedulesSummaryFix, data?.schedulesCustom])

  // ===== MAP AKTIF: exclude cancelled (untuk hitung & next session) =====
  const activeSessionMap = useMemo(() => {
    const filtered: Record<string, string> = { ...sessionMap }
    ;(data?.sessions || []).forEach((s: any) => {
      if (s.cancelled_at) {
        const sd = new Date(s.scheduled_at)
        const key = `${formatDateKey(sd)}|${getTimeSlotFromDate(sd)}`
        delete filtered[key]
      }
    })
    return filtered
  }, [sessionMap, data?.sessions])

  const timeSlots = useMemo(() => {
    if (!data?.schedulesSummaryFix) return []
    const set = new Set<string>()
    ;(data.schedulesSummaryFix || []).forEach((item: any) => {
      if (item.time) set.add(item.time)
    })
    return Array.from(set).sort()
  }, [data?.schedulesSummaryFix])

  // ===== NEXT SESSION =====
  const nextSession = useMemo(() => {
    let next: {
      date: Date
      timeSlot: string
      subject: string
      sessionRow: any | null
    } | null = null

    for (const [key, subject] of Object.entries(activeSessionMap)) {
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
  }, [activeSessionMap, now, data?.sessions])

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

    const iAmReady = role === 'tutor' ? tutorReady : studentReady
    const otherReady = role === 'tutor' ? studentReady : tutorReady

    if (isCancelled) {
      return { state: 'cancelled' as const }
    }

    if (isStarted) {
      return { state: 'started' as const }
    }

    if (nowMs < startMs) {
      const diffMs = startMs - nowMs
      return {
        state: 'before' as const,
        minutesUntil: Math.ceil(diffMs / 60000),
        remainingMs: diffMs,
      }
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

  // ===== JADWAL TERKINI =====
  const adjustedScheduleSummary = useMemo(() => {
    const grouped: Record<
      string,
      { subject: string; day: string; time: string; count: number }
    > = {}

    Object.entries(activeSessionMap).forEach(([key, subject]) => { 
      const [dateStr, time] = key.split('|')
      const date = new Date(dateStr)
      const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' })
      const gk = `${subject}-${dayName}-${time}`
      if (!grouped[gk]) {
        grouped[gk] = { subject, day: dayName, time, count: 0 }
      }
      grouped[gk].count += 1
    })

    return Object.values(grouped)
  }, [sessionMap])

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
      setData((prev) => (prev ? { ...prev, sessions: prevSessions } : prev))
      alert('❌ ' + err.message)
    } finally {
      setReadyLoading(false)
    }
  }

  // ===== RESCHEDULE HANDLERS =====
  const enterRescheduleMode = () => {
    setIsRescheduleMode(true)
    setRescheduleSource(null)
  }

  const cancelReschedule = () => {
    setIsRescheduleMode(false)
    setRescheduleSource(null)
  }

  const handleConfirmReschedule = async (payload: ReschedulePayload) => {
  if (!data) return
  setSubmittingReschedule(true)
  try {
    const res = await fetch(
      `/api/match-schedules/${data.matchId}/reschedule`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Gagal mengirim permintaan')

    alert(
      '✅ Permintaan perpindahan dikirim! Menunggu konfirmasi tutor (maks 2 hari).'
    )

    // ✅ UPDATE STATE LANGSUNG — biar card langsung muncul
    if (result.request) {
      setData((prev) =>
        prev ? { ...prev, schedulesCustomRequest: result.request } : prev
      )
    }

    cancelReschedule()
    // Refresh untuk sinkron dengan server
    await fetchData(true)
  } catch (err: any) {
    alert('❌ ' + err.message)
  } finally {
    setSubmittingReschedule(false)
  }
}

// ===== TUTOR: APPROVE / REJECT RESCHEDULE =====
const handleRescheduleAction = async (action: 'approve' | 'reject') => {
  if (!data || processingRequest) return
  setProcessingRequest(true)
  try {
    const res = await fetch(
      `/api/match-schedules/${data.matchId}/reschedule`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }
    )
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Gagal')

    alert(
      action === 'approve'
        ? '✅ Permintaan perpindahan disetujui!'
        : '❌ Permintaan perpindahan ditolak.'
    )
    await fetchData(true)
  } catch (err: any) {
    alert('❌ ' + err.message)
  } finally {
    setProcessingRequest(false)
  }
}

// ===== STUDENT: BATALKAN PENGAJUAN RESCHEDULE =====
const handleCancelRescheduleRequest = async () => {
  if (!data || processingRequest) return
  if (!confirm('Batalkan pengajuan perpindahan jadwal ini?')) return

  setProcessingRequest(true)
  try {
    const res = await fetch(
      `/api/match-schedules/${data.matchId}/reschedule`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      }
    )
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Gagal membatalkan')

    alert('✅ Pengajuan perpindahan dibatalkan.')
    await fetchData(true)
  } catch (err: any) {
    alert('❌ ' + err.message)
  } finally {
    setProcessingRequest(false)
  }
}

// ===== ACKNOWLEDGE RESCHEDULE NOTIFICATION =====
const acknowledgeRescheduleNotification = async () => {
  if (!data) return
  setShowRescheduleNotification(false)
  setAcknowledgingNotif(true)
  try {
    await fetch(`/api/match-schedules/${data.matchId}/reschedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acknowledge-notification' }),
    })
    await fetchData(true)
  } catch (err) {
    console.error('acknowledge reschedule notification error:', err)
  } finally {
    setAcknowledgingNotif(false)
  }
}

// ===== EXTEND CONTRACT HANDLERS =====
const handleExtensionAction = async (action: 'approve' | 'reject') => {
  if (!data || !authUser || processingExtension) return
  setProcessingExtension(true)
  try {
    const res = await fetch(`/api/match-schedules/${data.matchId}/extend`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, role, user_id: authUser.id }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Gagal')

    alert(
      action === 'approve'
        ? '✅ Perpanjangan disetujui! Kontrak diperpanjang 75 hari.'
        : '❌ Perpanjangan ditolak.'
    )
    setShowExtensionActionDialog(false)
    await fetchData(true)
  } catch (err: any) {
    alert('❌ ' + err.message)
  } finally {
    setProcessingExtension(false)
  }
}

const handleCancelExtension = async () => {
  if (!data || !authUser || processingExtension) return
  setProcessingExtension(true)
  try {
    const res = await fetch(`/api/match-schedules/${data.matchId}/extend`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', role, user_id: authUser.id }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Gagal')

    alert('✅ Pengajuan perpanjangan dibatalkan.')
    setShowExtensionCancelDialog(false)
    await fetchData(true)
  } catch (err: any) {
    alert('❌ ' + err.message)
  } finally {
    setProcessingExtension(false)
  }
}

const acknowledgeExtensionNotification = async () => {
  if (!data) return
  setShowExtensionNotification(false)
  setAcknowledgingExtNotif(true)
  try {
    await fetch(`/api/match-schedules/${data.matchId}/extend`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'acknowledge-notification',
        role,
        user_id: authUser?.id,
      }),
    })
    await fetchData(true)
  } catch (err) {
    console.error('acknowledge extension notification error:', err)
  } finally {
    setAcknowledgingExtNotif(false)
  }
}

// ===== GMEET HANDLERS =====
const handleStartVideoCall = () => {
  if (!data) return

  const gmeetLink = data.gmeetLink

  // Kalau link ada & valid → buka
  if (gmeetLink && isSafeGmeetLink(gmeetLink)) {
    window.open(gmeetLink, '_blank', 'noopener,noreferrer')
    return
  }

  // Link ada tapi tidak valid
  if (gmeetLink && !isSafeGmeetLink(gmeetLink)) {
    alert('⚠️ Link video call tidak valid. Hubungi tutor untuk memperbarui.')
    return
  }

  // Link belum ada
  if (role === 'tutor') {
    setShowNoLinkDialog(true)
  } else {
    alert('Link GMeet belum dibuat oleh tutor. Harap tunggu ya!')
  }
}

const openGmeetSettings = () => {
  if (!data) return
  setGmeetInput(data.gmeetLink || '')
  setShowGmeetDialog(true)
}

const handleSaveGmeet = async () => {
  if (!data || !authUser) return
  setSavingGmeet(true)
  try {
    const res = await fetch(
      `/api/match-schedules/${data.matchId}/gmeet`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link: gmeetInput.trim(),
          user_id: authUser.id,
          role,
        }),
      }
    )
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Gagal menyimpan link')

    setData((prev) =>
      prev ? { ...prev, gmeetLink: result.gmeet_link || null } : prev
    )
    setShowGmeetDialog(false)
    setGmeetInput('')
  } catch (err: any) {
    alert('❌ ' + err.message)
  } finally {
    setSavingGmeet(false)
  }
}

// ===== TERMINATE CONTRACT HANDLERS =====
const openTerminateDialog = () => {
  setTerminateStep('initial')
  setShowTerminateDialog(true)
}

const closeTerminateDialog = () => {
  setShowTerminateDialog(false)
  setTerminateStep('initial')
}

const submitTermination = async (type: 'unilateral' | 'mutual') => {
  if (!data || !authUser) return

  if (type === 'mutual') {
    const trimmed = terminateReason.trim()
    if (!trimmed) {
      alert('⚠️ Alasan pengakhiran wajib diisi.')
      return
    }
    if (trimmed.length > 500) {
      alert('⚠️ Alasan maksimal 500 karakter.')
      return
    }
  }

  setProcessingTerminate(true)
  try {
    const res = await fetch(`/api/match-schedules/${data.matchId}/terminate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        role,
        user_id: authUser.id,
        reason: type === 'mutual' ? terminateReason.trim() : undefined,
      }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Gagal')

    if (type === 'unilateral') {
      alert('✅ Kontrak telah diakhiri.')
    } else {
      alert('✅ Pengajuan dikirim. Menunggu respons pihak lain (maks 2 hari).')
    }
    setTerminateReason('')
    closeTerminateDialog()
    await fetchData(true)
  } catch (err: any) {
    alert('❌ ' + err.message)
  } finally {
    setProcessingTerminate(false)
  }
}

const handleTerminationAction = async (action: 'approve' | 'reject' | 'cancel') => {
  if (!data || !authUser) return
  setProcessingRequest(true)
  try {
    const res = await fetch(`/api/match-schedules/${data.matchId}/terminate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, role, user_id: authUser.id }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Gagal')

    const msg =
      action === 'approve'
        ? '✅ Pengajuan disetujui. Kontrak diakhiri.'
        : action === 'reject'
        ? '❌ Pengajuan ditolak.'
        : 'Pengajuan dibatalkan.'

    alert(msg)
    await fetchData(true)
  } catch (err: any) {
    alert('❌ ' + err.message)
  } finally {
    setProcessingRequest(false)
  }
}

  const acknowledgeRejection = async () => {
  if (!data || !authUser) return
  setShowRejectionNotice(false)
  try {
    await fetch(`/api/match-schedules/${data.matchId}/terminate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'acknowledge',
        role,
        user_id: authUser.id,
      }),
    })
    await fetchData(true)
  } catch (err) {
    console.error('acknowledge error', err)
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
  const showCoordinates = role === 'tutor' && isStudentOffline && hasCoords

    // ===== TERMINATION STATE HELPERS =====
  const terminationReq = data.terminationRequest
  const isCompleted = data.status === 'completed'
  const isTerminationPending = terminationReq?.status === 'pending'
  const isTerminationRejected = terminationReq?.status === 'rejected'
  const iAmRequester = terminationReq?.requested_by === role
  const iAmReceiver = isTerminationPending && !iAmRequester
  const showRejectionToMe =
    isTerminationRejected &&
    iAmRequester &&
    !terminationReq?.requester_notified_at

  const completedMessage = (() => {
    if (!isCompleted) return ''
    if (terminationReq?.type === 'unilateral') {
      const pihak = terminationReq.requested_by === 'tutor' ? 'tutor' : 'siswa'
      return `Sesi belajar-mengajar telah dihentikan oleh ${pihak}.`
    }
    if (terminationReq?.type === 'mutual' && terminationReq?.status === 'approved') {
      return 'Sesi belajar-mengajar telah sepakat dihentikan.'
    }
    return 'Kontrak belajar telah selesai.'
  })()

  const openMapsToStudent = () => {
    if (!hasCoords) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${data.student.latitude},${data.student.longitude}&travelmode=driving`
    window.open(url, '_blank')
  }

  const iAmAlreadyReady =
    timerState?.state === 'active' && !!timerState.iAmReady

  // ===== RESCHEDULE MODE HELPERS =====
  const isSlotSelectable = (status: SlotStatus) => status === 'upcoming'

  const isSlotSelected = (date: Date, slot: string) =>
    !!rescheduleSource &&
    formatDateKey(rescheduleSource.date) === formatDateKey(date) &&
    rescheduleSource.timeSlot === slot

  const hasPendingRequest =
    !!data.schedulesCustomRequest &&
    (data.schedulesCustomRequest.status === 'pending' ||
      !data.schedulesCustomRequest.status)

    return (
        <div
          className="max-w-7xl mx-auto p-4 space-y-6"
          onClickCapture={
            isCompleted
              ? (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowTerminatedPopup(true)
                }
              : undefined
          }
        >
      {/* ====== FIXED OVERLAY (klik untuk batal) ====== */}
      {isRescheduleMode && (
        <div
          className="fixed inset-0 z-30 bg-black/60 pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* ====== BAGIAN ATAS (DIM saat mode reschedule) ====== */}
      <div
        className={`space-y-6 relative transition-opacity duration-300 ${
          isRescheduleMode
            ? 'opacity-30 pointer-events-none select-none'
            : 'z-10'
        }`}
      >
        {/* HEADER */}
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

        {/* INFO CARDS */}
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

        {/* ===== FILEKU ===== */}
        {authUser && (
          <div
            className={`relative transition-opacity duration-300 ${
              isRescheduleMode ? 'opacity-30 pointer-events-none select-none' : 'z-10'
            }`}
          >
            <FilekuCard
              matchId={data.matchId}
              role={role}
              userId={authUser.id}
              privateFolderLabel={
                role === 'tutor'
                  ? data.tutorPrivateFolderLabel || 'Pribadi Saya'
                  : data.studentPrivateFolderLabel || 'Pribadi Saya'
              }
              onPrivateFolderRenamed={() => fetchData(true)}
            />
          </div>
        )}
      </div>

      {/* ====== KALENDER (TERANG saat mode reschedule) ====== */}
        <div data-reschedule-keep="true" className="relative z-50">
          <Card
            className={`transition-all duration-300 ${
              isRescheduleMode
                ? 'z-40 ring-2 ring-primary shadow-2xl border-primary/50'
                : 'z-10'
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg">Kalender Jadwal</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Tombol Ajukan Pindah Jadwal (student only) */}
                {role === 'student' && !isRescheduleMode && (
                  <Button
                    size="sm"
                    onClick={enterRescheduleMode}
                    disabled={hasPendingRequest}
                    className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                    title={
                      hasPendingRequest
                        ? 'Masih ada permintaan perpindahan yang belum direspons'
                        : 'Ajukan perpindahan jadwal'
                    }
                  >
                    <Send className="w-3.5 h-3.5" />
                    Ajukan Pindah Jadwal
                  </Button>
                )}

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
              {/* Banner 1: pilih slot */}
              {isRescheduleMode && !rescheduleSource && (
                <div className="mb-4 p-3 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      Pilih jadwal yang ingin dipindah
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Hanya slot <span className="text-blue-400 font-medium">biru</span>{' '}
                      (akan datang) yang bisa dipilih. Klik area di luar kalender
                      untuk membatalkan.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelReschedule}
                    className="shrink-0"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Banner 2: slot sudah terpilih */}
              {isRescheduleMode && rescheduleSource && (
                <div className="mb-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-amber-400">
                      Slot terpilih: {formatLongDate(rescheduleSource.date)},{' '}
                      {rescheduleSource.timeSlot} ({rescheduleSource.subject})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Klik slot{' '}
                      <span className="text-blue-400 font-medium">biru</span> lain di
                      kalender untuk mengganti, atau lengkapi form di bawah untuk
                      melanjutkan.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelReschedule}
                    className="shrink-0"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* LEGEND */}
              <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-500/50 border border-blue-400/60" />
                  <span className="text-muted-foreground">Akan Datang</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-green-500/50 border border-green-400/60" />
                  <span className="text-muted-foreground">Sedang Berlangsung</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-gray-600/40 border border-gray-500/60" />
                  <span className="text-muted-foreground">Sudah Lewat</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-500/40 border border-red-400/60" />
                  <span className="text-muted-foreground">Hangus</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-amber-500/50 border border-amber-400/60" />
                  <span className="text-muted-foreground">Dipindah</span>
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

                            // Cek apakah slot ini sumber perpindahan (moved_from)
                            const movedInfo = (data.schedulesCustom || []).find(
                              (c: any) =>
                                c.moved_from?.date === formatDateKey(date) &&
                                c.moved_from?.time === slot
                            )
                            const isMoved = !!movedInfo

                            // Cek apakah slot ini adalah hasil perpindahan (custom slot)
                            const customInfo = (data.schedulesCustom || []).find(
                              (c: any) => c.date === formatDateKey(date) && c.time === slot
                            )
                            const isCustomSlot = !!customInfo

                            // ✅ FIX: displaySubject dengan fallback
                            const displaySubject =
                              subject ||
                              movedInfo?.moved_from?.subject ||
                              customInfo?.subject ||
                              ''

                            // Tentukan status
                            // Tentukan status
                            let status: SlotStatus = 'past'
                            if (isCustomSlot) {
                              // Slot hasil pindahan → biarkan biru (upcoming) sesuai waktunya
                              status = isScheduled
                                ? getSlotStatus(date, slot, data.sessions || [], now)
                                : 'upcoming'
                              // Kalau waktunya belum lewat & belum hangus → paksa upcoming
                              if (status !== 'cancelled' && status !== 'past' && status !== 'ongoing') {
                                status = 'upcoming'
                              }
                            } else if (isMoved) {
                              status = 'moved'   // ← hanya slot ASAL yang jadi kuning
                            } else if (isScheduled) {
                              status = getSlotStatus(date, slot, data.sessions || [], now)
                            }

                            const style = SLOT_STATUS_STYLE[status]

                            const isPendingSource = isPendingSourceSlot(
                              date,
                              slot,
                              data.schedulesCustomRequest
                            )

                            const canSelect =
                              isRescheduleMode &&
                              isScheduled &&
                              isSlotSelectable(status) &&
                              !isPendingSource &&
                              !isMoved &&
                              !isCustomSlot

                            const selected = isSlotSelected(date, slot)

                            return (
                              <td
                                key={colIdx}
                                className={`border p-0.5 text-center ${
                                  !isScheduled && !isMoved ? 'opacity-30' : ''
                                }`}
                                onClick={(e) => {
                                  if (isPendingSource) {
                                    e.stopPropagation()
                                    alert('Jadwal ini sedang dalam proses pengajuan perpindahan!')
                                    return
                                  }
                                  if (isMoved) {
                                    e.stopPropagation()
                                    setMovedInfoItem(movedInfo)
                                    return
                                  }
                                  if (isCustomSlot) {
                                    e.stopPropagation()
                                    alert('Jadwal ini adalah hasil perpindahan dan tidak bisa dipindah lagi!')
                                    return
                                  }
                                  if (canSelect && subject) {
                                    e.stopPropagation()
                                    setRescheduleSource({ date, timeSlot: slot, subject })
                                  }
                                }}
                              >
                                <div
                                  className={`w-full h-10 flex items-center justify-center rounded text-xs font-semibold border transition-all ${
                                    isScheduled || isMoved
                                      ? `${style.bg} ${style.text} ${style.border}`
                                      : 'bg-gray-100/5 text-gray-600 border-transparent'
                                  } ${
                                    canSelect
                                      ? 'cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-105'
                                      : ''
                                  } ${
                                    selected ? 'ring-2 ring-amber-400 scale-105 shadow-lg' : ''
                                  }`}
                                  title={
                                    isMoved
                                      ? `${displaySubject} — Dipindah ke ${movedInfo?.dateLabel || movedInfo?.date}, ${movedInfo?.time}`
                                      : isCustomSlot
                                      ? `${displaySubject} — Jadwal pindah dari ${
                                          customInfo?.moved_from?.dayLabel || customInfo?.moved_from?.date
                                        }, ${customInfo?.moved_from?.time}`
                                      : isScheduled
                                      ? `${displaySubject} - ${style.label} (${slot})`
                                      : ''
                                  }
                                >
                                  {/* ✅ FIX: charAt dengan guard */}
                                  {displaySubject ? displaySubject.charAt(0).toUpperCase() : ''}
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
        </div>

      {/* ====== WIZARD (jika sudah pilih source) ====== */}
      {isRescheduleMode && rescheduleSource && (
        <div data-reschedule-keep="true" className="relative z-50">
          <RescheduleWizard
            key={`${formatDateKey(rescheduleSource.date)}-${rescheduleSource.timeSlot}`}
            source={rescheduleSource}
            contractEndDate={data.contractEndDate}
            matchedSubjects={data.student.matchedSubjects || []}
            submitting={submittingReschedule}
            onCancel={cancelReschedule}
            onConfirm={handleConfirmReschedule}
          />
        </div>
      )}

      {/* ====== BAGIAN BAWAH (DIM saat mode reschedule) ====== */}
      <div
        className={`space-y-6 relative transition-opacity duration-300 ${
          isRescheduleMode
            ? 'opacity-30 pointer-events-none select-none'
            : 'z-10'
        }`}
      >
        {/* NEXT SESSION + TIMER */}
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

                  {timerState.state === 'before' && (
                    <p className="text-xs text-primary mt-1">
                      Dimulai dalam {formatCountdown(timerState.remainingMs)}. Tombol
                      "Siap Belajar/Mengajar" akan aktif saat jam belajar
                      dimulai.
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

        {/* JADWAL TERKINI & KUSTOM */}
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
              {(() => {
                // Pending request
                const pendingReq =
                  data.schedulesCustomRequest &&
                  (data.schedulesCustomRequest.status === 'pending' ||
                    !data.schedulesCustomRequest.status)
                    ? data.schedulesCustomRequest
                    : null

                // Time left untuk pending request
                let pendingTimeLeft: number | null = null
                if (pendingReq) {
                  const deadline = getRequestDeadline(pendingReq)
                  pendingTimeLeft = deadline - now.getTime()
                }

                const customList = Array.isArray(data.schedulesCustom)
                  ? data.schedulesCustom
                  : []

                if (!pendingReq && customList.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground italic">
                      Belum ada jadwal kustom.
                    </p>
                  )
                }

                return (
                  <div className="space-y-2">
                    {/* ===== Pending Request Card ===== */}
                    {pendingReq && (
                      <div
                        className={`p-3 rounded-md border ${
                          pendingTimeLeft !== null && pendingTimeLeft <= 0
                            ? 'border-red-500/40 bg-red-500/5'
                            : 'border-amber-500/40 bg-amber-500/5'
                        }`}
                      >
                        {/* ===== BADGE HEADER ===== */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge
                            className={`text-[10px] ${
                              pendingTimeLeft !== null && pendingTimeLeft <= 0
                                ? 'bg-red-500/20 text-red-200 border-red-500/40'
                                : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                            }`}
                          >
                            {pendingTimeLeft !== null && pendingTimeLeft <= 0
                              ? 'HANGUS'
                              : role === 'tutor'
                              ? 'PERMINTAAN PERPINDAHAN JADWAL'
                              : 'MENUNGGU PERSETUJUAN TUTOR'}
                          </Badge>
                        </div>

                        {/* ===== FROM → TO ===== */}
                        <div className="space-y-1 text-xs">
                          <div className="flex items-start gap-1.5">
                            <span className="text-muted-foreground w-12 shrink-0">Dari:</span>
                            <span className="text-muted-foreground line-through">
                              {pendingReq.from?.subject} · {pendingReq.from?.date},{' '}
                              {pendingReq.from?.time}
                            </span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="text-muted-foreground w-12 shrink-0">Ke:</span>
                            <span className="font-medium text-foreground">
                              {pendingReq.to?.subject} · {pendingReq.to?.date},{' '}
                              {pendingReq.to?.time}
                            </span>
                          </div>
                        </div>

                        {/* ===== TIMER + BATALKAN — HANYA STUDENT ===== */}
                        {role === 'student' &&
                          pendingTimeLeft !== null &&
                          pendingTimeLeft > 0 && (
                            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-amber-500/20">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-xs text-muted-foreground">Sisa waktu:</span>
                                <span className="font-mono font-bold text-amber-400 text-sm">
                                  {formatCountdown(pendingTimeLeft)}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelRescheduleRequest}
                                disabled={processingRequest}
                                className="gap-1 border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs h-7 px-2 shrink-0"
                              >
                                {processingRequest ? (
                                  <Spinner className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                Batalkan
                              </Button>
                            </div>
                          )}

                        {role === 'student' &&
                          pendingTimeLeft !== null &&
                          pendingTimeLeft <= 0 && (
                            <p className="text-xs text-red-400 mt-2">
                              Waktu habis. Menunggu sistem menghapus permintaan...
                            </p>
                          )}

                        {/* ===== BUTTONS — HANYA TUTOR ===== */}
                        {role === 'tutor' && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-amber-500/20">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                              onClick={() => handleRescheduleAction('approve')}
                              disabled={processingRequest}
                            >
                              {processingRequest ? (
                                <Spinner className="w-3.5 h-3.5" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5" />
                              )}
                              Terima
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 gap-1.5"
                              onClick={() => handleRescheduleAction('reject')}
                              disabled={processingRequest}
                            >
                              {processingRequest ? (
                                <Spinner className="w-3.5 h-3.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              Tolak
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ===== Approved Custom Schedules ===== */}
                    {customList.length > 0 && (
                      <ul className="space-y-2">
                        {customList.map((item: any, idx: number) => (
                          <li
                            key={idx}
                            className="text-sm flex items-start justify-between gap-2 p-2 rounded-md border border-border bg-muted/20"
                          >
                            <div className="flex-1 min-w-0">
                              <Badge variant="outline" className="text-xs">
                                {item.subject}
                              </Badge>
                              <p className="text-muted-foreground mt-1 text-xs">
                                {item.dateLabel
                                  ? `${item.dateLabel}, ${item.time}`
                                  : `${item.day}, ${item.time}`}
                              </p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={() => setInfoItem(item)}
                              title="Lihat detail perpindahan"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>

        {/* ===== BANNER PENGKHIRAN KONTRAK ===== */}
        {isTerminationPending && iAmRequester && (
          <Card className="border-amber-500/60 bg-amber-500/5">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/40">
                  MENUNGGU RESPONS {role === 'tutor' ? 'SISWA' : 'GURU'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Pengajuan pengakhiran sudah dikirim. Pihak lain punya waktu{' '}
                <span className="font-mono font-bold text-amber-400">
                  {formatCountdown(new Date(terminationReq.deadline).getTime() - now.getTime())}
                </span>{' '}
                untuk merespons.
              </p>
              <p className="text-xs text-muted-foreground italic">
                Alasan kamu: {terminationReq.reason}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTerminationAction('cancel')}
                disabled={processingRequest}
                className="gap-1.5"
              >
                {processingRequest ? <Spinner className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                Batalkan Pengajuan
              </Button>
            </CardContent>
          </Card>
        )}

                {/* ===== BANNER PERPANJANGAN KONTRAK ===== */}
        {data.extensionRequest?.status === 'pending' && (
          <>
            {/* Sisi student (pengaju) */}
            {role === 'student' && (
              <Card className="border-amber-500/60 bg-amber-500/5">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/40">
                      MENUNGGU RESPONS TUTOR
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pengajuan perpanjangan sudah dikirim. Tutor punya waktu{' '}
                    <span className="font-mono font-bold text-amber-400">
                      {formatCountdown(
                        new Date(data.extensionRequest.deadline).getTime() -
                          now.getTime()
                      )}
                    </span>{' '}
                    untuk merespons.
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>
                      • Durasi:{' '}
                      <strong className="text-foreground">
                        {data.extensionRequest.duration_days} hari
                      </strong>
                    </span>
                    <span>
                      • Budget:{' '}
                      <strong className="text-foreground">
                        Rp{' '}
                        {Number(
                          data.extensionRequest.new_budget_per_month || 0
                        ).toLocaleString('id-ID')}
                      </strong>
                    </span>
                    <span>
                      • Sesi/bulan:{' '}
                      <strong className="text-foreground">
                        {data.extensionRequest.new_sessions_per_month}×
                      </strong>
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowExtensionCancelDialog(true)}
                    disabled={processingExtension}
                    className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10"
                  >
                    {processingExtension ? (
                      <Spinner className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    Batalkan Pengajuan
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Sisi tutor (penerima) */}
            {role === 'tutor' && (
              <Card className="border-amber-500/60 bg-amber-500/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/40">
                      PERMINTAAN PERPANJANGAN KONTRAK
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Siswa mengajukan perpanjangan kontrak{' '}
                    <strong className="text-foreground">
                      {data.extensionRequest.duration_days} hari
                    </strong>
                    . Kamu punya waktu{' '}
                    <span className="font-mono font-bold text-amber-400">
                      {formatCountdown(
                        new Date(data.extensionRequest.deadline).getTime() -
                          now.getTime()
                      )}
                    </span>{' '}
                    untuk merespons.
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>
                      • Budget baru:{' '}
                      <strong className="text-foreground">
                        Rp{' '}
                        {Number(
                          data.extensionRequest.new_budget_per_month || 0
                        ).toLocaleString('id-ID')}
                      </strong>
                    </span>
                    <span>
                      • Sesi/bulan:{' '}
                      <strong className="text-foreground">
                        {data.extensionRequest.new_sessions_per_month}×
                      </strong>
                    </span>
                    <span>
                      • Total slot:{' '}
                      <strong className="text-foreground">
                        {data.extensionRequest.proposed_slots?.length || 0} sesi
                      </strong>
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowExtensionActionDialog(true)}
                    disabled={processingExtension}
                    className="gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Lihat Detail & Respons
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ACTION BUTTONS */}
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

              {role === 'student' ? (
                // ===== STUDENT =====
                isSafeGmeetLink(data.gmeetLink) ? (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleStartVideoCall}
                  >
                    <Video className="w-4 h-4 mr-1.5" />
                    Mulai Video Call
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1 text-muted-foreground italic text-xs"
                    disabled
                    title="Tutor belum membuat link GMeet"
                  >
                    <Video className="w-4 h-4 mr-1.5 shrink-0" />
                    Link GMeet belum dibuat oleh tutor, harap tunggu ya!
                  </Button>
                )
              ) : (
                // ===== TUTOR =====
                <div className="flex-1 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleStartVideoCall}
                  >
                    <Video className="w-4 h-4 mr-1.5" />
                    Mulai Video Call
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={openGmeetSettings}
                    title="Atur Link GMeet"
                    className="shrink-0"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {isCompleted ? (
                <Button
                  variant="destructive"
                  className="flex-1 opacity-60"
                  disabled
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Kontrak Selesai
                </Button>
              ) : iAmReceiver ? (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setShowResponseDialog(true)}
                  style={{
                    animation: 'pulseRedWhite 2s ease-in-out infinite',
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mr-1.5" />
                  Respons Pengakhiran ({formatCountdown(
                    new Date(terminationReq.deadline).getTime() - now.getTime()
                  )})
                </Button>
              ) : iAmRequester && isTerminationPending ? (
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled
                >
                  <Clock className="w-4 h-4 mr-1.5" />
                  Pengakhiran Diproses
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={openTerminateDialog}
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Selesaikan Kontrak
                </Button>
              )}
            </div>
          </CardContent>
        </Card>   

        {/* ===== DIALOG INFO JADWAL DIPINDAH ===== */}
        <Dialog
          open={!!movedInfoItem}
          onOpenChange={() => setMovedInfoItem(null)}
         >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Jadwal Sudah Dipindah</DialogTitle>
              <DialogDescription>
                Jadwal ini tidak bisa digunakan lagi karena sudah dipindah.
              </DialogDescription>
            </DialogHeader>
            {movedInfoItem && (
              <div className="space-y-3 py-2">
                <div className="p-3 rounded-md border border-red-500/30 bg-red-500/5">
                  <p className="text-xs text-muted-foreground mb-1">Jadwal ini:</p>
                  <p className="font-semibold text-sm">
                    {movedInfoItem.moved_from?.subject ||
                      movedInfoItem.subject ||
                      'Sejarah'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {movedInfoItem.moved_from?.dayLabel
                      ? `${movedInfoItem.moved_from.dayLabel}, ${movedInfoItem.moved_from.time}`
                      : `${movedInfoItem.moved_from?.day}, ${movedInfoItem.moved_from?.time}`}
                  </p>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-primary rotate-90" />
                </div>

                <div className="p-3 rounded-md border border-green-500/30 bg-green-500/5">
                  <p className="text-xs text-muted-foreground mb-1">Dipindah ke:</p>
                  <p className="font-semibold text-sm">
                    {movedInfoItem.subject || 'Sejarah'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {movedInfoItem.dateLabel
                      ? `${movedInfoItem.dateLabel}, ${movedInfoItem.time}`
                      : `${movedInfoItem.day}, ${movedInfoItem.time}`}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setMovedInfoItem(null)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== DIALOG ATUR LINK GMEET (TUTOR) ===== */}
        <Dialog open={showGmeetDialog} onOpenChange={setShowGmeetDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                Atur Link Google Meet
              </DialogTitle>
              <DialogDescription>
                Tempel link Google Meet kamu di sini. Link ini akan muncul otomatis
                di tombol video call siswa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Link Google Meet
                </label>
                <input
                  autoFocus
                  type="url"
                  value={gmeetInput}
                  onChange={(e) => setGmeetInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveGmeet()
                  }}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className="w-full p-2.5 text-sm rounded-md bg-background border border-input focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  💡 Buka Google Meet → buat room → Copy link → Tempel di sini.
                </p>
              </div>

              {data?.gmeetLink && (
                <div className="p-2.5 rounded-md bg-muted/30 border border-border">
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Link saat ini:
                  </p>
                  <p className="text-xs font-mono break-all text-foreground">
                    {data.gmeetLink}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGmeetDialog(false)
                  setGmeetInput('')
                }}
                disabled={savingGmeet}
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveGmeet}
                disabled={savingGmeet}
                className="gap-1.5"
              >
                {savingGmeet ? (
                  <Spinner className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== DIALOG "LINK BELUM DIBUAT" (TUTOR) ===== */}
        <Dialog open={showNoLinkDialog} onOpenChange={setShowNoLinkDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Video className="w-5 h-5 text-amber-500" />
                Link GMeet Belum Dibuat
              </DialogTitle>
              <DialogDescription>
                Kamu belum membuat link Google Meet untuk sesi belajar ini. Siswa
                tidak bisa klik tombol video call sampai link dibuat.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 px-3 rounded-md bg-amber-500/5 border border-amber-500/20">
              <p className="text-sm text-muted-foreground">
                Buat room baru di Google Meet, lalu tempel link-nya di sini. Siswa
                akan otomatis dapat link tersebut.
              </p>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowNoLinkDialog(false)}
              >
                Batal
              </Button>
              <Button
                onClick={() => {
                  setShowNoLinkDialog(false)
                  setGmeetInput('')
                  setShowGmeetDialog(true)
                }}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Settings className="w-3.5 h-3.5" />
                Atur Sekarang
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== DIALOG 1: KONFIRMASI AWAL ===== */}
        <Dialog open={showTerminateDialog && terminateStep === 'initial'} onOpenChange={closeTerminateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Selesaikan Kontrak dengan {role === 'tutor' ? 'Siswa' : 'Guru'}?
              </DialogTitle>
              <DialogDescription>
                Kontrak ini akan diakhiri. Kamu akan memilih metode pengakhiran
                di langkah berikutnya.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={closeTerminateDialog}>
                Batalkan
              </Button>
              <Button variant="destructive" onClick={() => setTerminateStep('select')}>
                Selesaikan Kontrak
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== DIALOG 2: PILIH METODE ===== */}
        <Dialog open={showTerminateDialog && terminateStep === 'select'} onOpenChange={closeTerminateDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Pilih Metode Pengakhiran</DialogTitle>
              <DialogDescription>
                Ada 2 cara untuk mengakhiri kontrak ini.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <button
                onClick={() => setTerminateStep('confirm-unilateral')}
                className="w-full text-left p-4 rounded-md border border-red-500/40 bg-red-500/5 hover:bg-red-500/10 transition"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Hentikan Sekarang</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Akhiri kontrak langsung tanpa persetujuan pihak lain.
                      Tindakan ini akan dicatat dalam sistem.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setTerminateStep('confirm-mutual')}
                className="w-full text-left p-4 rounded-md border border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 transition"
              >
                <div className="flex items-start gap-3">
                  <Send className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Ajukan Pengakhiran</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Kirim pengajuan ke pihak lain untuk disetujui. Waktu
                      respons maksimal 2 hari.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setTerminateStep('initial')}>
                Kembali
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== DIALOG 3A: KONFIRMASI UNILATERAL ===== */}
        <Dialog open={showTerminateDialog && terminateStep === 'confirm-unilateral'} onOpenChange={closeTerminateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-5 h-5" />
                Yakin ingin menghentikan sekarang?
              </DialogTitle>
              <DialogDescription>
                Tindakan ini akan dicatat sebagai pengakhiran sepihak. Pihak
                lain akan menerima notifikasi bahwa kontrak diakhiri.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setTerminateStep('select')}
                disabled={processingTerminate}
              >
                Pikirkan Lagi
              </Button>
              <Button
                variant="destructive"
                onClick={() => submitTermination('unilateral')}
                disabled={processingTerminate}
                className="gap-1.5"
              >
                {processingTerminate ? <Spinner className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                Ya, Konfirmasi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== DIALOG 3B: KONFIRMASI MUTUAL + ALASAN WAJIB ===== */}
        <Dialog open={showTerminateDialog && terminateStep === 'confirm-mutual'} onOpenChange={closeTerminateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-500" />
                Ajukan Pengakhiran Kontrak
              </DialogTitle>
              <DialogDescription>
                Tuliskan alasan kenapa kamu ingin mengakhiri kontrak. Alasan akan
                dikirim ke {role === 'tutor' ? 'Siswa' : 'Guru'}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <label className="text-xs font-medium text-muted-foreground block">
                Alasan <span className="text-red-500">*wajib</span>
              </label>
              <textarea
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value.slice(0, 500))}
                rows={4}
                placeholder="Contoh: Jadwal bentrok dengan kegiatan sekolah, kesulitan koordinasi waktu..."
                className="w-full p-2.5 text-sm rounded-md bg-background border border-input focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <p className="text-[11px] text-muted-foreground text-right">
                {terminateReason.length}/500
              </p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setTerminateStep('select')} disabled={processingTerminate}>
                Batalkan
              </Button>
              <Button
                onClick={() => submitTermination('mutual')}
                disabled={processingTerminate || !terminateReason.trim()}
                className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {processingTerminate ? <Spinner className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                Kirim Pengajuan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== DIALOG 4: PENERIMA — SETUJU / TOLAK ===== */}
        <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {terminationReq?.requested_by === 'tutor' ? 'Tutor' : 'Siswa'} meminta pengakhiran kontrak
              </DialogTitle>
              <DialogDescription>
                Baca alasan mereka, lalu tentukan apakah kamu setuju.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs text-muted-foreground mb-1">Alasan:</p>
                <p className="text-sm whitespace-pre-wrap">{terminationReq?.reason}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                Sisa waktu:{' '}
                <span className="font-mono font-bold text-amber-400">
                  {formatCountdown(new Date(terminationReq?.deadline).getTime() - now.getTime())}
                </span>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1 gap-1.5"
                onClick={() => {
                  setShowResponseDialog(false)
                  handleTerminationAction('reject')
                }}
                disabled={processingRequest}
              >
                {processingRequest ? <Spinner className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                Tidak Setuju
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                onClick={() => {
                  setShowResponseDialog(false)
                  handleTerminationAction('approve')
                }}
                disabled={processingRequest}
              >
                {processingRequest ? <Spinner className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Setuju
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== DIALOG 5: TERMINATED POPUP ===== */}
        <Dialog open={showTerminatedPopup} onOpenChange={setShowTerminatedPopup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Kontrak Telah Diakhiri
              </DialogTitle>
              <DialogDescription>{completedMessage}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowTerminatedPopup(false)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== DIALOG 6: REJECTION NOTICE (pengaju) ===== */}
        <Dialog open={showRejectionNotice} onOpenChange={(o) => { if (!o) acknowledgeRejection() }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-500">
                <XCircle className="w-5 h-5" />
                Permintaan Pengakhiran Ditolak
              </DialogTitle>
              <DialogDescription>
                {terminationReq?.requested_by === role
                  ? `${role === 'tutor' ? 'Siswa' : 'Tutor'} menolak permintaan pengakhiran anda.`
                  : 'Permintaan pengakhiran ditolak.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={acknowledgeRejection}>Mengerti</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

                {/* ===== DIALOG 7: RESCHEDULE NOTIFICATION ===== */}
        <Dialog
          open={showRescheduleNotification}
          onOpenChange={(o) => {
            if (!o) acknowledgeRescheduleNotification()
          }}
        >
          <DialogContent className="sm:max-w-md">
            {data?.rescheduleNotification?.type === 'approved' ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="w-5 h-5" />
                    Jadwal Disetujui Tutor
                  </DialogTitle>
                  <DialogDescription>
                    Permintaan perpindahan jadwal kamu telah disetujui.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-3">
                  <div className="p-3 rounded-md border border-red-500/30 bg-red-500/5">
                    <p className="text-xs text-muted-foreground mb-1">Jadwal lama:</p>
                    <p className="font-semibold text-sm">
                      {data.rescheduleNotification.from?.subject}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {data.rescheduleNotification.from?.date},{' '}
                      {data.rescheduleNotification.from?.time}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="w-5 h-5 text-primary rotate-90" />
                  </div>
                  <div className="p-3 rounded-md border border-green-500/30 bg-green-500/5">
                    <p className="text-xs text-muted-foreground mb-1">Dipindah ke:</p>
                    <p className="font-semibold text-sm">
                      {data.rescheduleNotification.to?.subject}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {data.rescheduleNotification.to?.date},{' '}
                      {data.rescheduleNotification.to?.time}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={acknowledgeRescheduleNotification}
                    disabled={acknowledgingNotif}
                    className="gap-1.5"
                  >
                    {acknowledgingNotif && <Spinner className="w-3.5 h-3.5" />}
                    Mengerti
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-500">
                    <XCircle className="w-5 h-5" />
                    Jadwal Ditolak Tutor
                  </DialogTitle>
                  <DialogDescription>
                    Permintaan perpindahan jadwal kamu ditolak oleh tutor.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-3">
                  <div className="p-3 rounded-md border border-amber-500/30 bg-amber-500/5">
                    <p className="text-xs text-muted-foreground mb-1">
                      Pengajuan yang ditolak:
                    </p>
                    <p className="font-semibold text-sm">
                      {data.rescheduleNotification?.from?.subject}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {data.rescheduleNotification?.from?.date},{' '}
                      {data.rescheduleNotification?.from?.time}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      → Ke: {data.rescheduleNotification?.to?.date},{' '}
                      {data.rescheduleNotification?.to?.time}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Jadwal asli tetap berlaku. Kamu bisa mengajukan perpindahan
                    lagi.
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    onClick={acknowledgeRescheduleNotification}
                    disabled={acknowledgingNotif}
                    className="gap-1.5"
                  >
                    {acknowledgingNotif && <Spinner className="w-3.5 h-3.5" />}
                    Mengerti
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

                {/* ===== DIALOG 8: CANCEL EXTENSION (student) ===== */}
        <Dialog
          open={showExtensionCancelDialog}
          onOpenChange={setShowExtensionCancelDialog}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-5 h-5" />
                Batalkan Pengajuan Perpanjangan?
              </DialogTitle>
              <DialogDescription>
                Pengajuan perpanjangan akan dihapus. Kamu bisa mengajukan lagi
                nanti, tapi waktu tunggu akan di-reset dari awal.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowExtensionCancelDialog(false)}
                disabled={processingExtension}
              >
                Kembali
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelExtension}
                disabled={processingExtension}
                className="gap-1.5"
              >
                {processingExtension ? (
                  <Spinner className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Ya, Batalkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== DIALOG 9: EXTENSION ACTION (tutor) ===== */}
        <Dialog
          open={showExtensionActionDialog}
          onOpenChange={setShowExtensionActionDialog}
        >
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Detail Permintaan Perpanjangan
              </DialogTitle>
              <DialogDescription>
                Periksa detail di bawah, lalu tentukan apakah kamu setuju.
              </DialogDescription>
            </DialogHeader>

            {data.extensionRequest && (
              <div className="space-y-4 py-2">
                {/* Info utama */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Durasi</p>
                    <p className="font-semibold">
                      {data.extensionRequest.duration_days} hari
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sesi/bulan</p>
                    <p className="font-semibold">
                      {data.extensionRequest.new_sessions_per_month}×
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Budget/bulan</p>
                    <p className="font-semibold">
                      Rp{' '}
                      {Number(
                        data.extensionRequest.new_budget_per_month || 0
                      ).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <Separator/>

                {/* List slot */}
                <div>
                  <p className="text-sm font-medium mb-2">
                    Jadwal yang Diajukan (
                    {data.extensionRequest.proposed_slots?.length || 0} sesi)
                  </p>
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    <ul className="divide-y">
                      {(data.extensionRequest.proposed_slots || [])
                        .slice()
                        .sort((a: any, b: any) =>
                          a.date.localeCompare(b.date) ||
                          a.timeSlot.localeCompare(b.timeSlot)
                        )
                        .map((slot: any, idx: number) => (
                          <li
                            key={idx}
                            className="p-2 text-xs flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge
                                variant="outline"
                                className="text-[10px] shrink-0"
                              >
                                {slot.subject}
                              </Badge>
                              <span className="text-muted-foreground truncate">
                                {new Date(
                                  `${slot.date}T00:00:00Z`
                                ).toLocaleDateString('id-ID', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                                , {slot.timeSlot}
                              </span>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/20">
                  <p className="text-xs text-muted-foreground">
                    Kalau kamu setujui, kontrak akan diperpanjang 75 hari sejak
                    tanggal slot pertama, dan <strong>semua sesi lama akan diganti</strong>{' '}
                    dengan jadwal baru ini.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1 gap-1.5"
                onClick={() => handleExtensionAction('reject')}
                disabled={processingExtension}
              >
                {processingExtension ? (
                  <Spinner className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Tolak
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                onClick={() => handleExtensionAction('approve')}
                disabled={processingExtension}
              >
                {processingExtension ? (
                  <Spinner className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                Setujui Perpanjangan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== DIALOG 10: EXTENSION NOTIFICATION ===== */}
        <Dialog
          open={showExtensionNotification}
          onOpenChange={(o) => {
            if (!o) acknowledgeExtensionNotification()
          }}
        >
          <DialogContent className="sm:max-w-md">
            {data.extensionNotification?.type === 'approved' ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="w-5 h-5" />
                    Perpanjangan Disetujui
                  </DialogTitle>
                  <DialogDescription>
                    Tutor menyetujui perpanjangan kontrak belajar kamu.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-3">
                  {data.extensionRequest?.new_contract_start && (
                    <div className="p-3 rounded-md border border-green-500/30 bg-green-500/5">
                      <p className="text-xs text-muted-foreground mb-1">
                        Kontrak baru berlaku:
                      </p>
                      <p className="text-sm font-semibold">
                        {new Date(
                          data.extensionRequest.new_contract_start
                        ).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        s/d{' '}
                        {new Date(
                          data.extensionRequest.new_contract_end
                        ).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Jadwal lama sudah diganti dengan jadwal baru. Cek kalender
                    di halaman ini ya!
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    onClick={acknowledgeExtensionNotification}
                    disabled={acknowledgingExtNotif}
                    className="gap-1.5"
                  >
                    {acknowledgingExtNotif && (
                      <Spinner className="w-3.5 h-3.5" />
                    )}
                    Mengerti
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-500">
                    <XCircle className="w-5 h-5" />
                    {data.extensionNotification?.type === 'expired'
                      ? 'Pengajuan Perpanjangan Hangus'
                      : 'Perpanjangan Ditolak'}
                  </DialogTitle>
                  <DialogDescription>
                    {data.extensionNotification?.type === 'expired'
                      ? 'Tutor tidak merespons dalam 3 hari, pengajuan otomatis dibatalkan.'
                      : 'Tutor menolak permintaan perpanjangan kontrak kamu.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-3">
                  <p className="text-sm text-muted-foreground">
                    Kontrak lama tetap berlaku. Kamu bisa mengajukan perpanjangan
                    lagi kapan saja.
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    onClick={acknowledgeExtensionNotification}
                    disabled={acknowledgingExtNotif}
                    className="gap-1.5"
                  >
                    {acknowledgingExtNotif && (
                      <Spinner className="w-3.5 h-3.5" />
                    )}
                    Mengerti
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}