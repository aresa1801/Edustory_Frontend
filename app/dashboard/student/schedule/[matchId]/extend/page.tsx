'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/lib/auth-context'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Calendar,
  BookOpen,
  Wallet,
  AlertTriangle,
  Copy,
  Sparkles,
} from 'lucide-react'

// ============================================================
// KONSTANTA
// ============================================================
const EXTENSION_DURATION_DAYS = 75

const SCHEDULE_OPTIONS = [
  'Senin – Jumat (Pagi 07.00–12.00)',
  'Senin – Jumat (Siang 12.00–15.00)',
  'Senin – Jumat (Sore 15.00–19.00)',
  'Sabtu – Minggu (Pagi 07.00–12.00)',
  'Sabtu – Minggu (Siang 12.00–15.00)',
  'Sabtu – Minggu (Sore 15.00–19.00)',
  'Fleksibel',
]

const SESSION_OPTIONS = ['2', '4', '6', '8', '10', '12', '16', '20']

// ============================================================
// HELPER — Ambil 75 hari ke depan (mulai besok)
// ============================================================
function getExtensionDates(): Date[] {
  const dates: Date[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 1; i <= EXTENSION_DURATION_DAYS; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d)
  }
  return dates
}

function getMonthRangeLabel(dates: Date[]): string {
  if (dates.length === 0) return ''
  const first = dates[0]
  const last = dates[dates.length - 1]
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  if (first.getMonth() === last.getMonth()) {
    return `${monthNames[first.getMonth()]} ${first.getFullYear()}`
  }
  return `${monthNames[first.getMonth()]} - ${monthNames[last.getMonth()]} ${last.getFullYear()}`
}

// ============================================================
// HELPER — Parse range jadwal → allowedDays + timeSlots
// ============================================================
function parseScheduleRange(scheduleStr: string): {
  allowedDays: number[]
  timeSlots: { label: string }[]
} {
  if (!scheduleStr) {
    return {
      allowedDays: [0, 1, 2, 3, 4, 5, 6],
      timeSlots: [
        { label: '12.00 - 13.00' },
        { label: '13.00 - 14.00' },
        { label: '14.00 - 15.00' },
      ],
    }
  }

  const lower = scheduleStr.toLowerCase()
  let allowedDays: number[] = [0, 1, 2, 3, 4, 5, 6]
  let timeSlots: { label: string }[] = []

  if (lower.includes('senin') && lower.includes('jumat')) {
    allowedDays = [1, 2, 3, 4, 5]
  } else if (lower.includes('sabtu') && lower.includes('minggu')) {
    allowedDays = [0, 6]
  }

  const timeMatch = scheduleStr.match(/(\d{1,2})\.(\d{2})\s*[-–]\s*(\d{1,2})\.(\d{2})/)
  if (timeMatch && !lower.includes('fleksibel')) {
    const start = parseInt(timeMatch[1])
    const end = parseInt(timeMatch[3])
    for (let h = start; h < end; h++) {
      const next = h + 1
      timeSlots.push({
        label: `${String(h).padStart(2, '0')}.00 - ${String(next).padStart(2, '0')}.00`,
      })
    }
  } else {
    for (let h = 7; h < 19; h++) {
      const next = h + 1
      timeSlots.push({
        label: `${String(h).padStart(2, '0')}.00 - ${String(next).padStart(2, '0')}.00`,
      })
    }
  }

  return { allowedDays, timeSlots }
}

// ============================================================
// HELPER — Alokasi (sama seperti set_schedule)
// ============================================================
function getSlotsPerKlik(totalSessions: number): number {
  const map: Record<number, number> = {
    2: 2, 4: 4, 6: 3, 8: 4, 10: 5, 12: 4, 16: 4, 20: 5,
  }
  return map[totalSessions] || 4
}

function getAllocationStep(totalSessions: number): number {
  if (totalSessions <= 4) return 0
  if (totalSessions === 6) return 3
  if (totalSessions === 8) return 4
  if (totalSessions === 10) return 5
  if (totalSessions === 12 || totalSessions === 16) return 4
  if (totalSessions === 20) return 5
  return 1
}

// ============================================================
// HELPER — Generate slots dari jadwal lama (recurring)
// ============================================================
function generateSlotsFromOldSchedule(
  summary: any[],
  startDate: string
): Array<{ date: string; timeSlot: string; subject: string }> {
  const dayNames: Record<string, number> = {
    Minggu: 0, Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6,
  }
  const slots: Array<{ date: string; timeSlot: string; subject: string }> = []
  const start = new Date(`${startDate}T00:00:00Z`)
  const startDay = start.getUTCDay()

  summary.forEach((item: any) => {
    const targetDay = dayNames[item.day]
    if (targetDay === undefined) return
    const offset = (targetDay - startDay + 7) % 7
    const current = new Date(start)
    current.setUTCDate(current.getUTCDate() + offset)
    for (let i = 0; i < (item.count || 0); i++) {
      const y = current.getUTCFullYear()
      const m = String(current.getUTCMonth() + 1).padStart(2, '0')
      const d = String(current.getUTCDate()).padStart(2, '0')
      slots.push({
        date: `${y}-${m}-${d}`,
        timeSlot: item.time,
        subject: item.subject,
      })
      current.setUTCDate(current.getUTCDate() + 7)
    }
  })

  return slots.sort((a, b) => a.date.localeCompare(b.date))
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================
function ExtendContractContent() {
  const router = useRouter()
  const params = useParams()
  const matchId = params.matchId as string
  const { user: authUser } = useAuth()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduleData, setScheduleData] = useState<any>(null)

  // ===== STEP 1: Rencana Belajar =====
  const [scheduleRange, setScheduleRange] = useState('')
  const [budgetPerMonth, setBudgetPerMonth] = useState('')
  const [sessionsPerMonth, setSessionsPerMonth] = useState('')
  const [useOldSchedule, setUseOldSchedule] = useState(false)

  // ===== STEP 2: Grid Jadwal =====
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [schedule, setSchedule] = useState<Record<string, string>>({})
  const [allocation, setAllocation] = useState<Record<string, number>>({})
  const [activeSubject, setActiveSubject] = useState<string | null>(null)

  // ===== Derived dari scheduleRange =====
  const { allowedDays, timeSlots } = parseScheduleRange(scheduleRange)

  const allDates = getExtensionDates()
  const visibleDates = allDates.filter((d) => allowedDays.includes(d.getDay()))
  const monthName = getMonthRangeLabel(visibleDates.length > 0 ? visibleDates : allDates)

  const totalSelected = Object.keys(schedule).length
  const maxSessions = Number(sessionsPerMonth) || 0
  const remainingSessions = maxSessions - totalSelected
  const slotsPerKlik = getSlotsPerKlik(maxSessions)
  const step2AllocStep = getAllocationStep(maxSessions)

  // ===== Load data match =====
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch(`/api/match-schedules/${matchId}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Gagal memuat data jadwal')
        const data = await res.json()
        if (mounted) {
          setScheduleData(data)
          const subs = data.student?.matchedSubjects || []
          setSelectedSubjects(subs.slice(0, 2))
          setBudgetPerMonth(String(data.student?.budgetPerMonth || ''))
          setSessionsPerMonth(String(data.student?.sessionsPerMonth || ''))
        }
      } catch (err: any) {
        if (mounted) setError(err.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (matchId) load()
    return () => {
      mounted = false
    }
  }, [matchId])

  // ===== Alokasi mapel (kalau >1 mapel) =====
  useEffect(() => {
    if (useOldSchedule) return
    if (maxSessions === 0 || selectedSubjects.length === 0) {
      setAllocation({})
      setActiveSubject(null)
      return
    }

    if (step2AllocStep === 0 && selectedSubjects.length > 1) {
      setSelectedSubjects([selectedSubjects[0]])
      return
    }

    const newAlloc: Record<string, number> = {}
    if (selectedSubjects.length === 1) {
      newAlloc[selectedSubjects[0]] = maxSessions
    } else {
      let first = Math.floor(maxSessions / 2)
      let second = maxSessions - first
      if (step2AllocStep > 1) {
        const remainder = first % step2AllocStep
        if (remainder !== 0) {
          if (remainder < step2AllocStep / 2) {
            first = first - remainder
          } else {
            first = first + (step2AllocStep - remainder)
          }
          second = maxSessions - first
        }
        if (first <= 0) { first = step2AllocStep; second = maxSessions - step2AllocStep }
        if (second <= 0) { second = step2AllocStep; first = maxSessions - step2AllocStep }
      }
      newAlloc[selectedSubjects[0]] = first
      newAlloc[selectedSubjects[1]] = second
    }
    setAllocation(newAlloc)

    if (!activeSubject || !selectedSubjects.includes(activeSubject)) {
      setActiveSubject(selectedSubjects[0])
    }
  }, [selectedSubjects, maxSessions, step2AllocStep, useOldSchedule])

  // ===== Auto-pilih subject berikutnya =====
  useEffect(() => {
    if (useOldSchedule) return
    if (!activeSubject || selectedSubjects.length === 0) return
    const used = Object.values(schedule).filter((s) => s === activeSubject).length
    const allocated = allocation[activeSubject] || 0
    if (allocated - used <= 0) {
      const next = selectedSubjects.find((subj) => {
        const u = Object.values(schedule).filter((s) => s === subj).length
        const a = allocation[subj] || 0
        return a - u > 0
      })
      if (next) setActiveSubject(next)
    }
  }, [schedule, allocation, selectedSubjects, activeSubject, useOldSchedule])

  // ===== Hapus slot yang mapelnya sudah tidak aktif =====
  useEffect(() => {
    if (useOldSchedule) return
    const activeSet = new Set(selectedSubjects)
    const ns = { ...schedule }
    let changed = false
    for (const [k, v] of Object.entries(schedule)) {
      if (!activeSet.has(v)) {
        delete ns[k]
        changed = true
      }
    }
    if (changed) setSchedule(ns)
  }, [selectedSubjects, useOldSchedule])

  // ===== Reset schedule kalau range berubah =====
  useEffect(() => {
    if (step === 2 && !useOldSchedule) {
      setSchedule({})
      setActiveSubject(selectedSubjects[0] || null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleRange])

  // ===== Handlers =====
  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) => {
      const idx = prev.indexOf(subject)
      if (idx !== -1) return prev.filter((s) => s !== subject)
      if (prev.length >= 2) {
        alert('Maksimal 2 mata pelajaran.')
        return prev
      }
      if (step2AllocStep === 0 && prev.length === 1) {
        alert(`Dengan ${maxSessions} sesi, hanya 1 mapel yang bisa dipilih.`)
        return prev
      }
      return [...prev, subject]
    })
  }

  const adjustAllocation = (subject: string, delta: number) => {
    if (step2AllocStep === 0) return
    const other = selectedSubjects.find((s) => s !== subject)
    if (!other) return

    let curr = allocation[subject] || 0
    let oth = allocation[other] || 0
    let nc = curr + delta
    let no = oth - delta

    if (nc < 0) nc = 0
    if (no < 0) no = 0
    if (nc === 0) { setSelectedSubjects((p) => p.filter((s) => s !== subject)); return }
    if (no === 0) { setSelectedSubjects((p) => p.filter((s) => s !== other)); return }

    let total = nc + no
    if (total !== maxSessions) {
      const diff = maxSessions - total
      if (nc > no) nc += diff
      else no += diff
    }

    if (step2AllocStep > 1) {
      const rem = nc % step2AllocStep
      if (rem !== 0) {
        if (rem < step2AllocStep / 2) nc = nc - rem
        else nc = nc + (step2AllocStep - rem)
        no = maxSessions - nc
      }
      if (no < 0) { nc = maxSessions - step2AllocStep; no = step2AllocStep }
    }

    if (nc <= 0) { setSelectedSubjects((p) => p.filter((s) => s !== subject)); return }
    if (no <= 0) { setSelectedSubjects((p) => p.filter((s) => s !== other)); return }

    setAllocation((p) => ({ ...p, [subject]: nc, [other]: no }))
  }

  const handleSlotClick = (date: Date, timeSlotLabel: string) => {
    const day = date.getDay()
    const key = `${date.toISOString().split('T')[0]}|${timeSlotLabel}`
    const current = schedule[key]

    const sameDayDates = visibleDates.filter((d) => d.getDay() === day)
    const mirrorDates = sameDayDates.slice(0, slotsPerKlik)

    if (current) {
      const ns = { ...schedule }
      mirrorDates.forEach((d) => {
        const mk = `${d.toISOString().split('T')[0]}|${timeSlotLabel}`
        if (ns[mk] === current) delete ns[mk]
      })
      setSchedule(ns)
      return
    }

    if (remainingSessions <= 0) {
      alert(`Sesi sudah penuh (maks ${maxSessions}).`)
      return
    }
    if (!activeSubject) {
      alert('Pilih mata pelajaran aktif dulu.')
      return
    }

    const used = Object.values(schedule).filter((s) => s === activeSubject).length
    const allocated = allocation[activeSubject] || 0
    if (allocated - used <= 0) {
      const next = selectedSubjects.find((subj) => {
        const u = Object.values(schedule).filter((s) => s === subj).length
        const a = allocation[subj] || 0
        return a - u > 0
      })
      if (next) {
        setActiveSubject(next)
        alert(`Alokasi ${activeSubject} habis. Beralih ke ${next}.`)
        return
      }
      alert('Semua alokasi habis.')
      return
    }

    const available = mirrorDates.filter((d) => {
      const mk = `${d.toISOString().split('T')[0]}|${timeSlotLabel}`
      return !schedule[mk]
    })

    if (available.length === 0) {
      alert('Semua slot untuk hari ini sudah terisi.')
      return
    }

    if (totalSelected + available.length > maxSessions) {
      alert(`Sisa ${remainingSessions} sesi, tidak cukup untuk ${available.length} slot.`)
      return
    }

    const ns = { ...schedule }
    available.forEach((d) => {
      const mk = `${d.toISOString().split('T')[0]}|${timeSlotLabel}`
      ns[mk] = activeSubject
    })
    setSchedule(ns)
  }

  const isSlotFilled = (date: Date, label: string) =>
    !!schedule[`${date.toISOString().split('T')[0]}|${label}`]

  const getSlotSubject = (date: Date, label: string) =>
    schedule[`${date.toISOString().split('T')[0]}|${label}`] || null

  const generateSummary = () => {
    const entries = Object.entries(schedule)
    if (entries.length === 0) return null
    const grouped: Record<string, any> = {}
    entries.forEach(([key, subject]) => {
      const [dateStr, timeSlot] = key.split('|')
      const date = new Date(dateStr)
      const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' })
      const gk = `${subject}-${dayName}-${timeSlot}`
      if (!grouped[gk]) grouped[gk] = { subject, day: dayName, time: timeSlot, count: 0 }
      grouped[gk].count += 1
    })
    return Object.values(grouped)
  }

  // ===== Validasi step =====
  const validateStep1 = () => {
    if (!scheduleRange) { setError('Pilih rentang jadwal'); return false }
    if (!budgetPerMonth || Number(budgetPerMonth) < 50000) {
      setError('Budget minimal Rp 50.000'); return false
    }
    if (!sessionsPerMonth) { setError('Pilih jumlah sesi'); return false }
    return true
  }

  const validateStep2 = () => {
    if (useOldSchedule) return true
    if (totalSelected === 0) { setError('Pilih minimal 1 slot jadwal'); return false }
    if (totalSelected !== maxSessions) {
      setError(`Pilih tepat ${maxSessions} slot. Sekarang: ${totalSelected}`)
      return false
    }
    return true
  }

  const handleNext = () => {
    setError(null)
    if (step === 1) {
      if (!validateStep1()) return
      // Kalau pakai jadwal lama → generate slots + langsung step 3
      if (useOldSchedule) {
        const summary = scheduleData?.schedulesSummaryFix || []
        if (!Array.isArray(summary) || summary.length === 0) {
          setError('Jadwal lama tidak ditemukan. Silakan pilih "Atur Jadwal Baru".')
          return
        }
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const startDate = tomorrow.toISOString().split('T')[0]
        const slots = generateSlotsFromOldSchedule(summary, startDate)
        if (slots.length === 0) {
          setError('Jadwal lama tidak valid. Silakan pilih "Atur Jadwal Baru".')
          return
        }
        setSchedule(
          slots.reduce((acc: Record<string, string>, s) => {
            acc[`${s.date}|${s.timeSlot}`] = s.subject
            return acc
          }, {})
        )
        setStep(3)
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!validateStep2()) return
      setStep(3)
    }
  }

  const handleBack = () => {
    setError(null)
    if (step === 1) {
      router.back()
    } else if (step === 3 && useOldSchedule) {
      setStep(1)
    } else {
      setStep(step - 1)
    }
  }

  // ===== Submit =====
  const handleSubmit = async () => {
    if (!authUser || !scheduleData) return
    setSubmitting(true)
    setError(null)

    try {
      const slots = Object.entries(schedule).map(([key, subject]) => {
        const [date, timeSlot] = key.split('|')
        return { date, timeSlot, subject }
      })

      if (slots.length === 0) {
        setError('Tidak ada slot jadwal. Silakan ulangi pengaturan.')
        setSubmitting(false)
        return
      }

      const res = await fetch(
        `/api/match-schedules/${matchId}/extend`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: authUser.id,
            budget_per_month: Number(budgetPerMonth),
            sessions_per_month: Number(sessionsPerMonth),
            proposed_slots: slots,
          }),
        }
      )
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal mengirim pengajuan')

      alert(
        '✅ Pengajuan perpanjangan terkirim. Menunggu respons tutor (maks 3 hari).'
      )
      router.push('/dashboard/student/schedule')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ===== Loading / Error =====
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="ml-3 text-muted-foreground">Memuat data...</p>
      </div>
    )
  }

  if (!scheduleData) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Data tidak ditemukan'}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
        </Button>
      </div>
    )
  }

  const matchedSubjects: string[] = scheduleData.student?.matchedSubjects || []
  const counterpartName = scheduleData.tutor?.fullName || 'Tutor'
  const TIME_SLOTS = timeSlots.length > 0
    ? timeSlots
    : [{ label: '12.00 - 13.00' }, { label: '13.00 - 14.00' }, { label: '14.00 - 15.00' }]

  const oldSummary = Array.isArray(scheduleData?.schedulesSummaryFix)
    ? scheduleData.schedulesSummaryFix
    : []

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Perpanjang Kontrak</h1>
          <p className="text-muted-foreground text-sm">
            Lanjutkan belajar dengan <strong>{counterpartName}</strong> — durasi{' '}
            <strong>{EXTENSION_DURATION_DAYS} hari</strong>.
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: 'Rencana Belajar', icon: BookOpen },
          { n: 2, label: 'Pilih Jadwal', icon: Calendar },
          { n: 3, label: 'Konfirmasi', icon: CheckCircle },
        ]
          .filter((s) => !(useOldSchedule && s.n === 2))
          .map((s, idx, arr) => {
            const Icon = s.icon
            const active = step === s.n
            const done = step > s.n
            return (
              <div key={s.n} className="flex items-center flex-1 min-w-0">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                    active
                      ? 'bg-primary text-white'
                      : done
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {done ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <Icon className="w-4 h-4 shrink-0" />
                  )}
                  <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      done ? 'bg-green-400' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            )
          })}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ============ STEP 1: RENCANA BELAJAR ============ */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              Rencana Belajar Baru
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tentukan rentang jadwal, anggaran, dan frekuensi belajar untuk kontrak perpanjangan.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info fixed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-muted/30 border">
                <p className="text-xs text-muted-foreground mb-1">Durasi Kontrak</p>
                <p className="font-semibold">
                  {EXTENSION_DURATION_DAYS} hari (fixed)
                </p>
              </div>
              <div className="p-3 rounded-md bg-muted/30 border">
                <p className="text-xs text-muted-foreground mb-1">Mata Pelajaran</p>
                <p className="font-semibold">{matchedSubjects.join(', ') || '-'}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tidak dapat diubah
                </p>
              </div>
            </div>

            <Separator />

            {/* Metode jadwal */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Metode Jadwal <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setUseOldSchedule(false)}
                  className={`px-4 py-3 rounded-lg border text-left transition-all ${
                    !useOldSchedule
                      ? 'bg-primary text-white border-primary'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Atur Jadwal Baru</p>
                      <p className="text-xs opacity-80 mt-1">
                        Pilih hari & jam dari awal (bisa berbeda dari sebelumnya)
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setUseOldSchedule(true)}
                  disabled={oldSummary.length === 0}
                  className={`px-4 py-3 rounded-lg border text-left transition-all ${
                    useOldSchedule
                      ? 'bg-primary text-white border-primary'
                      : 'bg-card border-border hover:border-primary/50'
                  } ${oldSummary.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <Copy className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Pakai Jadwal Lama</p>
                      <p className="text-xs opacity-80 mt-1">
                        Sama seperti kontrak sebelumnya, langsung ke konfirmasi
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {useOldSchedule && oldSummary.length > 0 && (
                <div className="p-3 rounded-md bg-blue-500/5 border border-blue-500/20 mt-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Jadwal lama yang akan dipakai:
                  </p>
                  <ul className="space-y-1">
                    {oldSummary.map((item: any, idx: number) => (
                      <li key={idx} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {item.subject}:
                        </span>{' '}
                        {item.day}, {item.time} ({item.count} sesi)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Separator />

            {/* Rentang jadwal */}
            {!useOldSchedule && (
              <>
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Rentang Jadwal Belajar <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SCHEDULE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setScheduleRange(opt)}
                        className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left ${
                          scheduleRange === opt
                            ? 'bg-primary text-white border-primary'
                            : 'bg-card border-border hover:border-primary/50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Budget & Sessions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label className="text-base font-semibold">
                  Budget per Bulan (Rp) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    Rp
                  </span>
                  <Input
                    type="number"
                    min="50000"
                    step="50000"
                    value={budgetPerMonth}
                    onChange={(e) => setBudgetPerMonth(e.target.value)}
                    placeholder="500000"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Minimum Rp 50.000</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-base font-semibold">
                  Jumlah Sesi per Bulan <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {SESSION_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setSessionsPerMonth(n)}
                      className={`py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                        sessionsPerMonth === n
                          ? 'bg-primary text-white border-primary'
                          : 'bg-card border-border hover:border-primary/50'
                      }`}
                    >
                      {n}×
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {budgetPerMonth && sessionsPerMonth && (
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-sm font-semibold text-blue-300 mb-1">
                  Estimasi Biaya per Jam
                </p>
                <p className="text-2xl font-bold text-blue-200">
                  Rp{' '}
                  {Math.round(
                    Number(budgetPerMonth) / Number(sessionsPerMonth)
                  ).toLocaleString('id-ID')}
                  <span className="text-sm font-normal text-blue-300">/jam</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============ STEP 2: PILIH JADWAL ============ */}
      {step === 2 && !useOldSchedule && (
        <>
          {/* Subject picker */}
          {matchedSubjects.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Mata Pelajaran Aktif</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Pilih mapel aktif, lalu klik slot di kalender. Setiap klik akan
                  mengisi {slotsPerKlik} slot untuk hari yang sama.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {matchedSubjects.map((subj) => {
                    const used = Object.values(schedule).filter((s) => s === subj).length
                    const alloc = allocation[subj] || 0
                    const isActive = activeSubject === subj
                    const exhausted = alloc > 0 && used >= alloc
                    const isSelected = selectedSubjects.includes(subj)

                    return (
                      <div key={subj} className="flex items-center gap-1.5">
                        <Button
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            if (!isSelected) toggleSubject(subj)
                            setActiveSubject(subj)
                          }}
                          disabled={exhausted}
                          className={`capitalize ${
                            isActive
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : ''
                          } ${exhausted ? 'opacity-50' : ''}`}
                        >
                          {subj}
                          {isSelected && ` ${used}/${alloc}`}
                          {isActive && ' ✓'}
                        </Button>
                        {selectedSubjects.length === 2 && isSelected && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => adjustAllocation(subj, -step2AllocStep)}
                              disabled={alloc <= 0}
                              className="h-8 w-8 p-0"
                            >
                              -
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => adjustAllocation(subj, step2AllocStep)}
                              disabled={
                                (allocation[
                                  matchedSubjects.find((s) => s !== subj) || ''
                                ] || 0) - step2AllocStep < 0 || alloc >= maxSessions
                              }
                              className="h-8 w-8 p-0"
                            >
                              +
                            </Button>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grid */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{monthName}</CardTitle>
              <Badge variant="outline">
                {totalSelected} / {maxSessions} sesi dipilih
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border p-1 min-w-[100px] text-left sticky left-0 bg-gray-800 z-10 border-r-2 font-semibold text-white">
                        Jam
                      </th>
                      {visibleDates.map((date, idx) => (
                        <th
                          key={idx}
                          className="border p-1 text-center min-w-[44px] bg-gray-800 text-white"
                        >
                          <div>{date.getDate()}</div>
                          <div className="text-xs text-gray-300">
                            {date.toLocaleDateString('id-ID', {
                              weekday: 'short',
                            })}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map((slot, rowIdx) => (
                      <tr key={rowIdx}>
                        <td className="border p-1 font-medium text-xs sticky left-0 bg-gray-800 z-10 border-r-2 text-white">
                          {slot.label}
                        </td>
                        {visibleDates.map((date, colIdx) => {
                          const filled = isSlotFilled(date, slot.label)
                          const subject = getSlotSubject(date, slot.label)
                          return (
                            <td
                              key={colIdx}
                              className="border p-0.5 text-center cursor-pointer hover:bg-gray-50"
                              onClick={() => handleSlotClick(date, slot.label)}
                            >
                              <div
                                className={`w-full h-10 flex items-center justify-center rounded transition-colors ${
                                  filled
                                    ? 'bg-primary/30 text-primary font-bold'
                                    : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                              >
                                {filled ? subject?.charAt(0).toUpperCase() : 'O'}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                * Grid menyesuaikan rentang jadwal yang dipilih di step sebelumnya.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* ============ STEP 3: KONFIRMASI ============ */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Konfirmasi Pengajuan
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Periksa kembali detail perpanjangan sebelum mengirim ke tutor.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Tutor</p>
                <p className="font-medium">{counterpartName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Durasi</p>
                <p className="font-medium">{EXTENSION_DURATION_DAYS} hari</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Metode</p>
                <p className="font-medium">
                  {useOldSchedule ? 'Pakai Jadwal Lama' : 'Atur Jadwal Baru'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rentang Jadwal</p>
                <p className="font-medium">{scheduleRange || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget per Bulan</p>
                <p className="font-medium">
                  Rp {Number(budgetPerMonth).toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sesi per Bulan</p>
                <p className="font-medium">{sessionsPerMonth}×</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Total Slot Dipilih</p>
                <p className="font-medium">{totalSelected} sesi</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-2">Jadwal yang Dipilih</p>
              <div className="max-h-60 overflow-y-auto">
                <ul className="space-y-1">
                  {(generateSummary() || []).map((item: any, idx: number) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0">
                        {item.subject}
                      </Badge>
                      <span className="text-muted-foreground">
                        {item.day}, {item.time} ({item.count} sesi)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/20 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Tutor punya waktu <strong>3 hari</strong> untuk merespons. Jika
                tidak direspons, pengajuan otomatis <strong>ditolak</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} disabled={submitting}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {step === 1 ? 'Batal' : 'Sebelumnya'}
        </Button>

        {step < 3 ? (
          <Button onClick={handleNext} className="gap-1.5">
            Selanjutnya
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting || totalSelected === 0}
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Kirim Pengajuan Perpanjangan
          </Button>
        )}
      </div>
    </div>
  )
}

export default function ExtendContractPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <ExtendContractContent />
    </Suspense>
  )
}