// app/dashboard/student/set_schedule/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth-context'

// ---------- DUMMY DATA (fallback) ----------
const DUMMY_MATCH = {
  id: 'dummy-id',
  matched_subjects: ['Matematika', 'Kimia', 'Sejarah'],
  student_schedule: 'Senin-Jumat 12.00-15.00',
  tutor_full_name: 'Tutor Dummy',
  status: 'pending',
}

// ---------- HELPER ----------
const getDatesInMonth = (year: number, month: number) => {
  const dates = []
  const lastDay = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= lastDay; d++) {
    dates.push(new Date(year, month, d))
  }
  return dates
}

const parseScheduleToTimeSlots = (scheduleStr: string) => {
  const timeMatch = scheduleStr.match(/(\d{2}\.\d{2})\s*-\s*(\d{2}\.\d{2})/)
  if (timeMatch) {
    const start = parseFloat(timeMatch[1].replace('.', ':'))
    const end = parseFloat(timeMatch[2].replace('.', ':'))
    const slots = []
    for (let h = start; h < end; h++) {
      const next = h + 1
      const label = `${String(h).padStart(2, '0')}.00 - ${String(next).padStart(2, '0')}.00`
      slots.push({ label })
    }
    return slots
  }
  return [
    { label: '12.00 - 13.00' },
    { label: '13.00 - 14.00' },
    { label: '14.00 - 15.00' },
  ]
}

// ---------- KOMPONEN ----------
function SetScheduleContent() {
  const searchParams = useSearchParams()
  const matchId = searchParams.get('matchId')
  const { user, loading: authLoading } = useAuth()

  const [matchData, setMatchData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingDummy, setUsingDummy] = useState(false)

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [schedule, setSchedule] = useState<Record<string, string>>({})
  const [timeSlots, setTimeSlots] = useState<{ label: string }[]>([])

  const dates = getDatesInMonth(2026, 7)
  const monthName = 'Agustus 2026'

  useEffect(() => {
    console.log('[set_schedule] useEffect, matchId =', matchId)

    if (authLoading) {
      console.log('[set_schedule] authLoading true, menunggu...')
      return
    }

    if (!user) {
      setError('Silakan login terlebih dahulu.')
      setLoading(false)
      return
    }

    if (!matchId) {
      setError('Tidak ada ID match di URL.')
      setLoading(false)
      return
    }

    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const loadData = () => {
      // --- PRIORITAS 1: sessionStorage ---
      const stored = sessionStorage.getItem('scheduleData')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          if (data.id === matchId) {
            console.log('[set_schedule] Data dari sessionStorage:', data)
            setMatchData(data)
            setSelectedSubjects(data.matched_subjects?.slice(0, 2) || [])
            setTimeSlots(parseScheduleToTimeSlots(data.student_schedule || ''))
            setUsingDummy(false)
            setLoading(false)
            setError(null)
            // Hapus sessionStorage agar tidak dipakai ulang
            sessionStorage.removeItem('scheduleData')
            return
          }
        } catch (e) {
          console.warn('[set_schedule] Gagal parse sessionStorage', e)
        }
      }

      // --- PRIORITAS 2: Fetch API ---
      console.log('[set_schedule] fetchMatch mulai (API)')
      setLoading(true)
      setError(null)

      const fetchMatch = async () => {
        try {
          const controller = new AbortController()
          timeoutId = setTimeout(() => controller.abort(), 5000)

          const res = await fetch(`/api/matches/${matchId}`, {
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' }
          })

          clearTimeout(timeoutId)

          if (!isMounted) return

          if (!res.ok) {
            const errText = await res.text()
            throw new Error(`Gagal fetch (${res.status}): ${errText}`)
          }

          const data = await res.json()
          console.log('[set_schedule] Data dari API:', data)

          if (!data.matched_subjects) {
            throw new Error('Data match tidak memiliki kolom matched_subjects.')
          }

          setMatchData(data)
          setSelectedSubjects(data.matched_subjects.slice(0, 2) || [])
          setTimeSlots(parseScheduleToTimeSlots(data.student_schedule || ''))
          setUsingDummy(false)
          setError(null)
        } catch (err: any) {
          console.error('[set_schedule] Fetch error:', err)
          if (isMounted) {
            // --- PRIORITAS 3: Fallback dummy ---
            console.log('[set_schedule] Gagal fetch, pakai dummy')
            setMatchData(DUMMY_MATCH)
            setSelectedSubjects(DUMMY_MATCH.matched_subjects.slice(0, 2))
            setTimeSlots(parseScheduleToTimeSlots(DUMMY_MATCH.student_schedule))
            setUsingDummy(true)
            setError(null)
          }
        } finally {
          if (isMounted) {
            setLoading(false)
            clearTimeout(timeoutId)
          }
        }
      }

      fetchMatch()
    }

    loadData()

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [matchId, user, authLoading])

  // --- Fungsi interaksi ---
  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => {
      const index = prev.indexOf(subject)
      if (index !== -1) return prev.filter(s => s !== subject)
      if (prev.length >= 2) return prev
      return [...prev, subject]
    })
  }

  const handleSlotClick = (date: Date, timeSlotLabel: string) => {
    const key = `${date.toISOString().split('T')[0]}|${timeSlotLabel}`
    const current = schedule[key]
    if (current) {
      const newSchedule = { ...schedule }
      delete newSchedule[key]
      const day = date.getDay()
      dates.forEach(d => {
        if (d.getDay() === day) {
          const mirrorKey = `${d.toISOString().split('T')[0]}|${timeSlotLabel}`
          if (newSchedule[mirrorKey] === current) delete newSchedule[mirrorKey]
        }
      })
      setSchedule(newSchedule)
    } else {
      if (selectedSubjects.length === 0) {
        alert('Pilih mata pelajaran dulu!')
        return
      }
      const counts: Record<string, number> = {}
      Object.values(schedule).forEach(s => { counts[s] = (counts[s] || 0) + 1 })
      let chosen = selectedSubjects[0]
      let min = Infinity
      selectedSubjects.forEach(s => {
        const c = counts[s] || 0
        if (c < min) { min = c; chosen = s }
      })
      const newSchedule = { ...schedule, [key]: chosen }
      const day = date.getDay()
      dates.forEach(d => {
        if (d.getDay() === day) {
          const mirrorKey = `${d.toISOString().split('T')[0]}|${timeSlotLabel}`
          if (!newSchedule[mirrorKey]) newSchedule[mirrorKey] = chosen
        }
      })
      setSchedule(newSchedule)
    }
  }

  const isSlotFilled = (date: Date, timeSlotLabel: string): boolean => {
    const key = `${date.toISOString().split('T')[0]}|${timeSlotLabel}`
    return !!schedule[key]
  }

  const getSlotSubject = (date: Date, timeSlotLabel: string): string | null => {
    const key = `${date.toISOString().split('T')[0]}|${timeSlotLabel}`
    return schedule[key] || null
  }

  const generateSummary = () => {
    const entries = Object.entries(schedule)
    if (entries.length === 0) {
      return <p className="text-muted-foreground">Belum ada jadwal dipilih.</p>
    }
    const grouped: Record<string, any> = {}
    entries.forEach(([key, subject]) => {
      const [dateStr, timeSlot] = key.split('|')
      const date = new Date(dateStr)
      const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' })
      const gk = `${subject}-${dayName}-${timeSlot}`
      if (!grouped[gk]) grouped[gk] = { subject, day: dayName, time: timeSlot, count: 0 }
      grouped[gk].count += 1
    })
    return (
      <ul className="space-y-1">
        {Object.values(grouped).map((item, idx) => (
          <li key={idx} className="text-sm">
            <Badge variant="outline" className="mr-2">{item.subject}</Badge>
            {item.day}, {item.time} ({item.count} sesi)
          </li>
        ))}
      </ul>
    )
  }

  // ---------- RENDER ----------
  console.log('[set_schedule] render, loading =', loading, 'matchData =', !!matchData, 'usingDummy =', usingDummy)

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="ml-3">Memuat data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()} className="mt-4">Coba Lagi</Button>
      </div>
    )
  }

  if (!matchData) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>Data tidak ditemukan.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const availableSubjects = matchData.matched_subjects || []
  const TIME_SLOTS = timeSlots.length > 0 ? timeSlots : [
    { label: '12.00 - 13.00' },
    { label: '13.00 - 14.00' },
    { label: '14.00 - 15.00' },
  ]

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Atur Jadwal Belajar</h1>
          <p className="text-muted-foreground">
            Pilih mata pelajaran dan tentukan jadwal untuk{' '}
            <span className="font-medium">{matchData.tutor_full_name || 'Tutor'}</span>.
          </p>
        </div>
        {usingDummy && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            ⚠️ Data dummy (fallback)
          </Badge>
        )}
      </div>

      {usingDummy && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertDescription className="text-yellow-800 text-sm">
            ⚠️ Menggunakan data dummy karena API belum merespons. Data ini hanya contoh.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pilih Mata Pelajaran (maks 2)</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          {availableSubjects.map((subj: string) => {
            const isSelected = selectedSubjects.includes(subj)
            return (
              <Button
                key={subj}
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => toggleSubject(subj)}
                disabled={!isSelected && selectedSubjects.length >= 2}
                className="capitalize"
              >
                {subj} {isSelected && '✓'}
              </Button>
            )
          })}
          <span className="text-sm text-muted-foreground ml-2">
            {selectedSubjects.length}/2 terpilih
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{monthName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border p-1 min-w-[100px] text-left">Jam</th>
                  {dates.map((date, idx) => (
                    <th key={idx} className="border p-1 text-center min-w-[44px]">
                      <div>{date.getDate()}</div>
                      <div className="text-xs text-muted-foreground">
                        {date.toLocaleDateString('id-ID', { weekday: 'short' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="border p-1 font-medium text-xs">{slot.label}</td>
                    {dates.map((date, colIdx) => {
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
                                ? 'bg-primary/20 text-primary font-bold'
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ringkasan Jadwal</CardTitle>
        </CardHeader>
        <CardContent>{generateSummary()}</CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          Simpan Jadwal
        </Button>
      </div>
    </div>
  )
}

// ---------- PAGE ----------
export default function SetSchedulePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>}>
      <SetScheduleContent />
    </Suspense>
  )
}