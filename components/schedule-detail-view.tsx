'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  BookOpen,
  Circle,
  CheckCircle,
  RotateCw,
  Video,
  Navigation,
  PlayCircle,
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

// ========== HELPER ==========
function parseTimeRange(timeStr: string): { start: number; end: number } {
  // "12.00 - 13.00" => { start: 12, end: 13 }
  const match = timeStr.match(/(\d{1,2})\.(\d{2})\s*[-–]\s*(\d{1,2})\.(\d{2})/)
  if (!match) return { start: 12, end: 13 }
  return {
    start: parseInt(match[1]),
    end: parseInt(match[3]),
  }
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

function getDayName(date: Date): string {
  return date.toLocaleDateString('id-ID', { weekday: 'long' })
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Map schedules_summary_fix to a lookup: { dayName: { timeSlot: subject } }
function buildScheduleLookup(summary: any): Record<string, Record<string, string>> {
  const lookup: Record<string, Record<string, string>> = {}
  if (!Array.isArray(summary)) return lookup
  summary.forEach((item: any) => {
    if (!lookup[item.day]) lookup[item.day] = {}
    lookup[item.day][item.time] = item.subject
  })
  return lookup
}

// Get unique time slots from summary
function getTimeSlots(summary: any): string[] {
  if (!Array.isArray(summary)) return []
  const set = new Set<string>()
  summary.forEach((item: any) => {
    if (item.time) set.add(item.time)
  })
  return Array.from(set).sort()
}

// ========== KOMPONEN ==========
export default function ScheduleDetailView({ matchId, role }: ScheduleDetailViewProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ScheduleData | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/match-schedules/${matchId}`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Gagal memuat jadwal')
        }
        const result = await res.json()
        setData(result)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (matchId) fetchData()
  }, [matchId])

  // Compute calendar dates (fixed)
  const allDates = useMemo(() => {
    if (!data?.acceptedAt || !data?.contractEndDate) return []
    return getDatesBetween(data.acceptedAt, data.contractEndDate)
  }, [data?.acceptedAt, data?.contractEndDate])

  // Group by month for navigation
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

  // Schedule lookup
  const scheduleLookup = useMemo(() => {
    if (!data?.schedulesSummaryFix) return {}
    return buildScheduleLookup(data.schedulesSummaryFix)
  }, [data?.schedulesSummaryFix])

  const timeSlots = useMemo(() => {
    if (!data?.schedulesSummaryFix) return []
    return getTimeSlots(data.schedulesSummaryFix)
  }, [data?.schedulesSummaryFix])

  // Handle actions
  const handleBack = () => router.back()
  const handleReady = () => {
    alert(`✅ Tanda siap dikirim! Menunggu pihak lain untuk memulai sesi.`)
  }
  const handleRequestReschedule = () => {
    alert(`📅 Fitur ajukan perpindahan jadwal akan segera hadir.`)
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
          <AlertDescription>❌ {error || 'Data tidak ditemukan'}</AlertDescription>
        </Alert>
        <Button onClick={handleBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Kembali
        </Button>
      </div>
    )
  }

  const counterpart = role === 'tutor' ? data.student : data.tutor
  const counterpartLabel = role === 'tutor' ? 'Siswa' : 'Tutor'
  const counterpartName =
    role === 'tutor' ? data.student.name : data.tutor?.fullName || 'Tutor'
  const counterpartAvatar =
    role === 'tutor' ? data.student.avatar : data.tutor?.avatar
  const counterpartIsOnline =
    role === 'tutor' ? data.student.isOnline : data.tutor?.isOnline ?? true

  // Apakah siswa offline? Tampilkan koordinat ke tutor
  const isStudentOffline = data.student.isOnline === false
  const hasCoords =
    data.student.latitude != null && data.student.longitude != null
  const showCoordinates = role === 'tutor' && isStudentOffline && hasCoords

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Detail Jadwal</h1>
          <p className="text-muted-foreground text-sm">
            Jadwal mengajar yang sudah dikonfirmasi
          </p>
        </div>
      </div>

      {/* ===== INFO CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Counterpart card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
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
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{counterpartLabel}</p>
                <p className="font-semibold">{counterpartName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Circle
                    className={`h-2 w-2 fill-current ${
                      counterpartIsOnline ? 'text-green-500' : 'text-gray-400'
                    }`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {counterpartIsOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract info */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Mulai Kontrak</p>
                <p className="font-medium">{formatDate(data.acceptedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Berakhir Kontrak</p>
                <p className="font-medium">{formatDate(data.contractEndDate)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Mata Pelajaran</p>
                <p className="font-medium">
                  {data.student.matchedSubjects?.join(', ') || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== KALENDER GRID (FIXED) ===== */}
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
                            isPast ? 'bg-gray-700 text-gray-400' : 'bg-gray-800 text-white'
                          }`}
                        >
                          <div>{date.getDate()}</div>
                          <div className="text-xs opacity-70">
                            {date.toLocaleDateString('id-ID', { weekday: 'short' })}
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
                        const dayName = getDayName(date)
                        const subject = scheduleLookup[dayName]?.[slot]
                        const isPast = date < new Date()
                        const isScheduled = !!subject

                        return (
                          <td
                            key={colIdx}
                            className={`border p-0.5 text-center ${
                              isPast ? 'opacity-50' : ''
                            }`}
                          >
                            <div
                              className={`w-full h-10 flex items-center justify-center rounded text-xs font-semibold ${
                                isScheduled
                                  ? isPast
                                    ? 'bg-slate-600 text-slate-300'
                                    : 'bg-primary/30 text-primary'
                                  : 'bg-gray-100/10 text-gray-500'
                              }`}
                            >
                              {isScheduled ? subject.charAt(0).toUpperCase() : ''}
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

      {/* ===== KOORDINAT (khusus tutor & siswa offline) ===== */}
      {showCoordinates && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="w-4 h-4 text-amber-500" />
              Koordinat Siswa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Siswa ini sedang offline. Gunakan koordinat berikut untuk menemui siswa di lokasi.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 p-3 rounded-md bg-background border">
                <p className="text-xs text-muted-foreground">Alamat</p>
                <p className="font-medium text-sm">
                  {data.student.address || '-'}
                </p>
              </div>
              <div className="flex-1 p-3 rounded-md bg-background border">
                <p className="text-xs text-muted-foreground">Koordinat</p>
                <p className="font-mono text-sm">
                  {data.student.latitude}, {data.student.longitude}
                </p>
              </div>
            </div>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${data.student.latitude},${data.student.longitude}&travelmode=driving`
                window.open(url, '_blank')
              }}
            >
              <MapPin className="w-4 h-4 mr-1.5" />
              Buka di Google Maps
            </Button>
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
            {Array.isArray(data.schedulesSummaryFix) &&
            data.schedulesSummaryFix.length > 0 ? (
              <ul className="space-y-1">
                {data.schedulesSummaryFix.map((item: any, idx: number) => (
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
              className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
              onClick={handleReady}
            >
              <PlayCircle className="w-4 h-4" />
              {role === 'tutor' ? 'Siap Mengajar' : 'Siap Belajar'}
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onClick={() => alert('🎥 Video call akan segera hadir.')}
            >
              <Video className="w-4 h-4 mr-1.5" />
              Mulai Video Call
            </Button>

            {role === 'student' && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleRequestReschedule}
              >
                <RotateCw className="w-4 h-4 mr-1.5" />
                Ajukan Perpindahan
              </Button>
            )}

            {role === 'tutor' && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => alert('📅 Belum ada pengajuan perpindahan dari siswa.')}
                disabled
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Terima Perpindahan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}