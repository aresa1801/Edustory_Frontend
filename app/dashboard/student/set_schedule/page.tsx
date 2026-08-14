'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'

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

// ---------- KOMPONEN ----------
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

  const dates = getDatesInMonth(2026, 7)
  const monthName = 'Agustus 2026'

  // ========== SATU USEFFECT UNTUK SEMUA ==========
  useEffect(() => {
    let isMounted = true
    let fetchTimeout: NodeJS.Timeout
    let forceStopTimeout: NodeJS.Timeout

    const fetchMatch = async () => {
      try {
        // 1. Ambil matchId dari URL
        let matchId: string | null = null
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          matchId = params.get('matchId')
          console.log('[set_schedule] matchId from URL:', matchId)
        }

        if (!matchId) {
          throw new Error('ID match tidak ditemukan di URL.')
        }

        // 2. Ambil session
        const supabase = createClient()
        let token: string | null = null

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
              token = session.access_token
              console.log('[set_schedule] ✅ Token found on attempt', attempt + 1)
              break
            }
          } catch (e) {
            console.warn('[set_schedule] ⚠️ getSession attempt', attempt + 1, 'failed')
          }
          if (attempt < 2) await new Promise(r => setTimeout(r, 300))
        }

        if (!token) {
          throw new Error('Tidak dapat memperoleh token akses. Silakan login ulang.')
        }

        // 3. Cek sessionStorage
        const stored = sessionStorage.getItem('scheduleData')
        if (stored) {
          try {
            const data = JSON.parse(stored)
            if (data.id === matchId) {
              console.log('[set_schedule] ✅ Data dari sessionStorage')
              if (isMounted) {
                setMatchData(data)
                setSelectedSubjects(data.matched_subjects?.slice(0, 2) || [])
                setTimeSlots(parseScheduleToTimeSlots(data.student_schedule || ''))
                setLoading(false)
                setError(null)
                sessionStorage.removeItem('scheduleData')
              }
              return
            }
          } catch (e) {
            console.warn('[set_schedule] ⚠️ Gagal parse sessionStorage')
          }
        }

        // 4. Fetch dari API
        console.log('[set_schedule] 🔄 Fetch dari API...')
        const controller = new AbortController()
        fetchTimeout = setTimeout(() => controller.abort(), 5000)

        const res = await fetch(`/api/matches/${matchId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        })

        clearTimeout(fetchTimeout)

        if (!isMounted) return

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`Gagal fetch (${res.status}): ${errText}`)
        }

        const data = await res.json()
        console.log('[set_schedule] ✅ Data dari API:', data)

        if (isMounted) {
          setMatchData(data)
          setSelectedSubjects(data.matched_subjects?.slice(0, 2) || [])
          setTimeSlots(parseScheduleToTimeSlots(data.student_schedule || ''))
          setError(null)
          setLoading(false)
        }

      } catch (err: any) {
        console.error('[set_schedule] ❌ Error:', err)
        if (isMounted) {
          if (err.name === 'AbortError') {
            setError('Waktu pengambilan data habis. Silakan coba lagi.')
          } else {
            setError(err.message || 'Terjadi kesalahan saat mengambil data.')
          }
          setLoading(false)
        }
      } finally {
        clearTimeout(fetchTimeout)
      }
    }

    // --- Force stop setelah 8 detik ---
    forceStopTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[set_schedule] ⏱️ Force stop loading (8s timeout)')
        setLoading(false)
        setError('Waktu muat terlalu lama. Silakan refresh halaman.')
      }
    }, 8000)

    fetchMatch()

    return () => {
      isMounted = false
      clearTimeout(fetchTimeout)
      clearTimeout(forceStopTimeout)
    }
  }, []) // Hanya dijalankan sekali saat mount

  // ---------- Interaksi ----------
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

  const handleSave = async () => {
    const entries = Object.entries(schedule)
    if (entries.length === 0) {
      alert('Pilih minimal satu slot jadwal!')
      return
    }

    // Ambil matchId dari URL
    let matchId: string | null = null
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      matchId = params.get('matchId')
    }
    if (!matchId) {
      alert('ID match tidak ditemukan.')
      return
    }

    const sessions = entries.map(([key, subject]) => {
      const [dateStr, timeSlot] = key.split('|')
      return { date: dateStr, timeSlot, subject }
    })

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const res = await fetch(`/api/matches/${matchId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // ---------- RENDER ----------
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
              Pastikan Anda sudah login dan membuka dari halaman penawaran.
            </span>
          </AlertDescription>
        </Alert>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => window.location.reload()} variant="outline">
            Coba Lagi
          </Button>
          <Button onClick={() => window.history.back()}>
            Kembali
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
        <Button onClick={() => window.location.reload()} className="mt-4">
          Coba Lagi
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

      {saveMessage && (
        <Alert variant={saveMessage.type === 'success' ? 'default' : 'destructive'}>
          <AlertDescription>{saveMessage.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving && <Spinner className="h-4 w-4 mr-2" />}
          {isSaving ? 'Menyimpan...' : 'Simpan Jadwal'}
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