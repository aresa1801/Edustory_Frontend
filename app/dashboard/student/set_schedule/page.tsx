'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'

// ========== HELPER BARU ==========
// Ambil 30 hari ke depan dari hari ini
const getNext30Days = () => {
  const today = new Date()
  const dates = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d)
  }
  return dates
}

// Buat label rentang bulan (misal "Agustus - September 2026")
const getMonthRangeLabel = (dates: Date[]) => {
  if (dates.length === 0) return ''
  const first = dates[0]
  const last = dates[dates.length - 1]
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  if (first.getMonth() === last.getMonth()) {
    return `${monthNames[first.getMonth()]} ${first.getFullYear()}`
  } else {
    return `${monthNames[first.getMonth()]} - ${monthNames[last.getMonth()]} ${last.getFullYear()}`
  }
}

// Parsing student_schedule (tetap sama)
const parseScheduleToTimeSlots = (scheduleStr: string) => {
  if (!scheduleStr) {
    return [
      { label: '12.00 - 13.00' },
      { label: '13.00 - 14.00' },
      { label: '14.00 - 15.00' },
    ]
  }
  const match = scheduleStr.match(/(\d{1,2}\.\d{2})\s*[-–]\s*(\d{1,2}\.\d{2})/)
  if (match) {
    const start = parseFloat(match[1].replace('.', ':'))
    const end = parseFloat(match[2].replace('.', ':'))
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

// ========== KOMPONEN ==========
function SetScheduleContent() {
  const router = useRouter()
  const [matchData, setMatchData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [schedule, setSchedule] = useState<Record<string, string>>({})
  const [timeSlots, setTimeSlots] = useState<{ label: string }[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Kalender 30 hari ke depan
  const dates = getNext30Days()
  const monthName = getMonthRangeLabel(dates)

  // Hitung jumlah sesi
  const totalSelected = Object.keys(schedule).length
  const maxSessions = matchData?.student_sessions_per_month ?? 0
  const remainingSessions = maxSessions - totalSelected

  useEffect(() => {
    // Ambil data dari sessionStorage
    try {
      const stored = sessionStorage.getItem('scheduleData')
      if (stored) {
        const data = JSON.parse(stored)
        console.log('[set_schedule] ✅ Data dari sessionStorage:', data)
        setMatchData(data)
        setSelectedSubjects(data.matched_subjects?.slice(0, 2) || [])
        setTimeSlots(parseScheduleToTimeSlots(data.student_schedule || ''))
        setLoading(false)
      } else {
        setError('Data jadwal tidak ditemukan. Silakan kembali ke halaman penawaran.')
        setLoading(false)
      }
    } catch (e) {
      setError('Data jadwal tidak valid. Silakan kembali ke halaman penawaran.')
      setLoading(false)
    }
  }, [])

  // ========== INTERAKSI ==========
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
      // Hapus slot
      const newSchedule = { ...schedule }
      delete newSchedule[key]
      // Mirroring: hapus juga di tanggal lain dengan hari yang sama
      const day = date.getDay()
      dates.forEach(d => {
        if (d.getDay() === day) {
          const mirrorKey = `${d.toISOString().split('T')[0]}|${timeSlotLabel}`
          if (newSchedule[mirrorKey] === current) delete newSchedule[mirrorKey]
        }
      })
      setSchedule(newSchedule)
    } else {
      // Cek kuota
      if (remainingSessions <= 0) {
        alert(`Sesi Anda sudah penuh (maksimal ${maxSessions} sesi).`)
        return
      }
      if (selectedSubjects.length === 0) {
        alert('Pilih mata pelajaran dulu!')
        return
      }
      // Pilih subject dengan jumlah paling sedikit
      const counts: Record<string, number> = {}
      Object.values(schedule).forEach(s => { counts[s] = (counts[s] || 0) + 1 })
      let chosen = selectedSubjects[0]
      let min = Infinity
      selectedSubjects.forEach(s => {
        const c = counts[s] || 0
        if (c < min) { min = c; chosen = s }
      })
      const newSchedule = { ...schedule, [key]: chosen }
      // Mirroring: tambahkan di tanggal lain dengan hari yang sama
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

  const handleSave = async () => {
    const entries = Object.entries(schedule)
    if (entries.length === 0) {
      alert('Pilih minimal satu slot jadwal!')
      return
    }

    // Ambil token dari localStorage
    let token: string | null = null
    try {
      const keys = Object.keys(localStorage)
      for (const key of keys) {
        if (key.includes('sb-') && key.includes('auth-token')) {
          const raw = localStorage.getItem(key)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed?.access_token) {
              token = parsed.access_token
              break
            }
          }
        }
      }
    } catch (e) {}

    if (!token) {
      alert('Token tidak ditemukan. Silakan login ulang.')
      return
    }

    const sessions = entries.map(([key, subject]) => {
      const [dateStr, timeSlot] = key.split('|')
      return { date: dateStr, timeSlot, subject }
    })

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const res = await fetch(`/api/matches/${matchData?.id}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessions }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Gagal menyimpan jadwal')
      }

      setSaveMessage({ type: 'success', text: 'Jadwal berhasil disimpan!' })
      setTimeout(() => {
        router.push('/dashboard/student')
      }, 1500)
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  // ========== RENDER ==========
  if (loading) {
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
            <br />
            <span className="text-sm mt-2 block">
              Silakan kembali ke halaman penawaran dan coba lagi.
            </span>
          </AlertDescription>
        </Alert>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => window.history.back()}>
            Kembali ke Penawaran
          </Button>
        </div>
      </div>
    )
  }

  if (!matchData) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>Data match tidak ditemukan.</AlertDescription>
        </Alert>
        <Button onClick={() => window.history.back()} className="mt-4">
          Kembali
        </Button>
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
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Pilih Mata Pelajaran (maks 2)</CardTitle>
          <Badge variant="outline" className="text-sm font-normal">
            📊 Sesi tersisa:{' '}
            <span className={`font-bold ${
              remainingSessions <= 0 ? 'text-red-500' :
              remainingSessions <= 3 ? 'text-orange-500' :
              'text-green-600'
            }`}>
              {remainingSessions}
            </span>
            {' / '}
            {maxSessions}
          </Badge>
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
          <span className="text-sm text-muted-foreground">
            {totalSelected} sesi dipilih
          </span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border p-1 min-w-[100px] text-left sticky left-0 bg-gray-50 z-10 border-r-2 font-semibold text-gray-700">
                    Jam
                  </th>
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
                    <td className="border p-1 font-medium text-xs sticky left-0 bg-gray-50 z-10 border-r-2 text-gray-700">
                      {slot.label}
                    </td>
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

      {saveMessage && (
        <Alert variant={saveMessage.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{saveMessage.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={handleSave}
          disabled={isSaving || totalSelected === 0}
        >
          {isSaving && <Spinner className="h-4 w-4 mr-2" />}
          {isSaving ? 'Menyimpan...' : 'Simpan Jadwal'}
        </Button>
      </div>
    </div>
  )
}

// ========== PAGE ==========
export default function SetSchedulePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>}>
      <SetScheduleContent />
    </Suspense>
  )
}