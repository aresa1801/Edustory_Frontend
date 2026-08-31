'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'

// ========== HELPER ==========
const getNext37Days = () => {
  const today = new Date()
  const dates = []
  for (let i = 0; i < 37; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d)
  }
  return dates
}

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

function parseStudentSchedule(scheduleStr: string): { allowedDays: number[], timeSlots: { label: string }[] } {
  if (!scheduleStr) {
    return {
      allowedDays: [0,1,2,3,4,5,6],
      timeSlots: [
        { label: '12.00 - 13.00' },
        { label: '13.00 - 14.00' },
        { label: '14.00 - 15.00' },
      ]
    }
  }

  const lower = scheduleStr.toLowerCase()

  if (lower.includes('senin') && lower.includes('jumat')) {
    const allowedDays = [1, 2, 3, 4, 5]
    const timeMatch = scheduleStr.match(/(\d{1,2}\.\d{2})\s*[-–]\s*(\d{1,2}\.\d{2})/)
    let timeSlots = []
    if (timeMatch) {
      const start = parseFloat(timeMatch[1].replace('.', ':'))
      const end = parseFloat(timeMatch[2].replace('.', ':'))
      for (let h = start; h < end; h++) {
        const next = h + 1
        const label = `${String(h).padStart(2, '0')}.00 - ${String(next).padStart(2, '0')}.00`
        timeSlots.push({ label })
      }
    } else {
      timeSlots = [
        { label: '12.00 - 13.00' },
        { label: '13.00 - 14.00' },
        { label: '14.00 - 15.00' },
      ]
    }
    return { allowedDays, timeSlots }
  }

  if (lower.includes('sabtu') && lower.includes('minggu')) {
    const allowedDays = [0, 6]
    const timeMatch = scheduleStr.match(/(\d{1,2}\.\d{2})\s*[-–]\s*(\d{1,2}\.\d{2})/)
    let timeSlots = []
    if (timeMatch) {
      const start = parseFloat(timeMatch[1].replace('.', ':'))
      const end = parseFloat(timeMatch[2].replace('.', ':'))
      for (let h = start; h < end; h++) {
        const next = h + 1
        const label = `${String(h).padStart(2, '0')}.00 - ${String(next).padStart(2, '0')}.00`
        timeSlots.push({ label })
      }
    } else {
      timeSlots = [
        { label: '12.00 - 13.00' },
        { label: '13.00 - 14.00' },
        { label: '14.00 - 15.00' },
      ]
    }
    return { allowedDays, timeSlots }
  }

  if (lower.includes('fleksibel')) {
    const allowedDays = [0, 1, 2, 3, 4, 5, 6]
    const timeSlots = []
    for (let h = 7; h < 20; h++) {
      const next = h + 1
      const label = `${String(h).padStart(2, '0')}.00 - ${String(next).padStart(2, '0')}.00`
      timeSlots.push({ label })
    }
    return { allowedDays, timeSlots }
  }

  return {
    allowedDays: [0,1,2,3,4,5,6],
    timeSlots: [
      { label: '12.00 - 13.00' },
      { label: '13.00 - 14.00' },
      { label: '14.00 - 15.00' },
    ]
  }
}

function getSlotsPerKlik(totalSessions: number): number {
  const map: Record<number, number> = {
    2: 2,
    4: 4,
    6: 3,
    8: 4,
    10: 5,
    12: 4,
    16: 4,
    20: 5,
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

// ========== KOMPONEN ==========
function SetScheduleContent() {
  const router = useRouter()
  const [matchData, setMatchData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [schedule, setSchedule] = useState<Record<string, string>>({})
  const [timeSlots, setTimeSlots] = useState<{ label: string }[]>([])
  const [allowedDays, setAllowedDays] = useState<number[]>([0,1,2,3,4,5,6])
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [allocation, setAllocation] = useState<Record<string, number>>({})
  const [activeSubject, setActiveSubject] = useState<string | null>(null)

  const allDates = getNext37Days()
  const visibleDates = allDates.filter(date => allowedDays.includes(date.getDay()))
  const monthName = getMonthRangeLabel(visibleDates.length > 0 ? visibleDates : allDates)

  const totalSelected = Object.keys(schedule).length
  const maxSessions = matchData?.student_sessions_per_month ?? 0
  const remainingSessions = maxSessions - totalSelected
  const slotsPerKlik = getSlotsPerKlik(maxSessions)
  const step = getAllocationStep(maxSessions)

  // ========== EFFECT INIT ==========
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('scheduleData')
      if (stored) {
        const data = JSON.parse(stored)
        console.log('[set_schedule] ✅ Data dari sessionStorage:', data)
        setMatchData(data)
        const subjects = data.matched_subjects?.slice(0, 2) || []
        setSelectedSubjects(subjects)
        const { allowedDays: days, timeSlots: slots } = parseStudentSchedule(data.student_schedule || '')
        setAllowedDays(days)
        setTimeSlots(slots)
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

  // ========== EFFECT ALOKASI ==========
  useEffect(() => {
    if (maxSessions === 0 || selectedSubjects.length === 0) {
      setAllocation({})
      setActiveSubject(null)
      return
    }

    if (step === 0 && selectedSubjects.length > 1) {
      setSelectedSubjects([selectedSubjects[0]])
      return
    }

    const newAlloc: Record<string, number> = {}
    if (selectedSubjects.length === 1) {
      newAlloc[selectedSubjects[0]] = maxSessions
    } else {
      let first = Math.floor(maxSessions / 2)
      let second = maxSessions - first
      if (step > 1) {
        const remainder = first % step
        if (remainder !== 0) {
          if (remainder < step / 2) {
            first = first - remainder
          } else {
            first = first + (step - remainder)
          }
          second = maxSessions - first
        }
        if (first <= 0) { first = step; second = maxSessions - step }
        if (second <= 0) { second = step; first = maxSessions - step }
      }
      newAlloc[selectedSubjects[0]] = first
      newAlloc[selectedSubjects[1]] = second
    }
    setAllocation(newAlloc)

    if (!activeSubject || !selectedSubjects.includes(activeSubject)) {
      setActiveSubject(selectedSubjects[0])
    }
  }, [selectedSubjects, maxSessions, step])

  // ========== EFFECT OTOMATIS PILIH SUBJECT BERIKUTNYA ==========
  useEffect(() => {
    if (!activeSubject || selectedSubjects.length === 0) return

    const used = Object.values(schedule).filter(s => s === activeSubject).length
    const allocated = allocation[activeSubject] || 0
    const remaining = allocated - used

    if (remaining <= 0) {
      const next = selectedSubjects.find(subj => {
        const usedSubj = Object.values(schedule).filter(s => s === subj).length
        const allocSubj = allocation[subj] || 0
        return (allocSubj - usedSubj) > 0
      })
      if (next) {
        setActiveSubject(next)
      }
    }
  }, [schedule, allocation, selectedSubjects, activeSubject])

  // ========== EFFECT HAPUS SLOT ==========
  useEffect(() => {
    const activeSet = new Set(selectedSubjects)
    const newSchedule = { ...schedule }
    let changed = false
    for (const [key, subject] of Object.entries(schedule)) {
      if (!activeSet.has(subject)) {
        delete newSchedule[key]
        changed = true
      }
    }
    if (changed) {
      setSchedule(newSchedule)
    }
  }, [selectedSubjects])

  // ========== ADJUST ALOKASI ==========
  const adjustAllocation = (subject: string, delta: number) => {
    if (step === 0) return
    const otherSubject = selectedSubjects.find(s => s !== subject)
    if (!otherSubject) return

    let currentAlloc = allocation[subject] || 0
    let otherAlloc = allocation[otherSubject] || 0
    let newAlloc = currentAlloc + delta
    let newOther = otherAlloc - delta

    if (newAlloc < 0) newAlloc = 0
    if (newOther < 0) newOther = 0

    if (newAlloc === 0) {
      setSelectedSubjects(prev => prev.filter(s => s !== subject))
      return
    }
    if (newOther === 0) {
      setSelectedSubjects(prev => prev.filter(s => s !== otherSubject))
      return
    }

    let total = newAlloc + newOther
    if (total !== maxSessions) {
      const diff = maxSessions - total
      if (newAlloc > newOther) {
        newAlloc += diff
      } else {
        newOther += diff
      }
    }

    if (step > 1) {
      const remainder = newAlloc % step
      if (remainder !== 0) {
        if (remainder < step / 2) {
          newAlloc = newAlloc - remainder
        } else {
          newAlloc = newAlloc + (step - remainder)
        }
        newOther = maxSessions - newAlloc
      }
      if (newOther < 0) {
        newAlloc = maxSessions - step
        newOther = step
      }
    }

    if (newAlloc <= 0) {
      setSelectedSubjects(prev => prev.filter(s => s !== subject))
      return
    }
    if (newOther <= 0) {
      setSelectedSubjects(prev => prev.filter(s => s !== otherSubject))
      return
    }

    setAllocation(prev => ({ ...prev, [subject]: newAlloc, [otherSubject]: newOther }))
  }

  // ========== INTERAKSI ==========
  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => {
      const index = prev.indexOf(subject)
      if (index !== -1) {
        return prev.filter(s => s !== subject)
      } else {
        if (prev.length >= 2) {
          alert('Maksimal 2 mata pelajaran yang dapat dipilih.')
          return prev
        }
        if (step === 0 && prev.length === 1) {
          alert(`Dengan total ${maxSessions} sesi, hanya 1 mata pelajaran yang dapat dipilih.`)
          return prev
        }
        return [...prev, subject]
      }
    })
  }

  const handleSlotClick = (date: Date, timeSlotLabel: string) => {
    const day = date.getDay()
    const key = `${date.toISOString().split('T')[0]}|${timeSlotLabel}`
    const current = schedule[key]

    const sameDayDates = visibleDates.filter(d => d.getDay() === day)
    const mirrorDates = sameDayDates.slice(0, slotsPerKlik)

    if (current) {
      const newSchedule = { ...schedule }
      mirrorDates.forEach(d => {
        const mirrorKey = `${d.toISOString().split('T')[0]}|${timeSlotLabel}`
        if (newSchedule[mirrorKey] === current) delete newSchedule[mirrorKey]
      })
      setSchedule(newSchedule)
    } else {
      if (remainingSessions <= 0) {
        alert(`Sesi Anda sudah penuh (maksimal ${maxSessions} sesi).`)
        return
      }
      if (selectedSubjects.length === 0) {
        alert('Pilih mata pelajaran dulu!')
        return
      }

      if (!activeSubject) {
        alert('Silakan pilih mata pelajaran aktif terlebih dahulu.')
        return
      }

      const used = Object.values(schedule).filter(s => s === activeSubject).length
      const allocated = allocation[activeSubject] || 0
      const remaining = allocated - used
      if (remaining <= 0) {
        const next = selectedSubjects.find(subj => {
          const usedSubj = Object.values(schedule).filter(s => s === subj).length
          const allocSubj = allocation[subj] || 0
          return (allocSubj - usedSubj) > 0
        })
        if (next) {
          setActiveSubject(next)
          alert(`Sisa alokasi untuk ${activeSubject} sudah habis. Otomatis beralih ke ${next}.`)
          return
        } else {
          alert(`Semua mata pelajaran sudah habis alokasinya.`)
          return
        }
      }

      const availableMirrors = mirrorDates.filter(d => {
        const mirrorKey = `${d.toISOString().split('T')[0]}|${timeSlotLabel}`
        return !schedule[mirrorKey]
      })

      if (availableMirrors.length === 0) {
        alert('Semua slot untuk hari ini sudah terisi.')
        return
      }

      if (totalSelected + availableMirrors.length > maxSessions) {
        alert(`Hanya tersisa ${remainingSessions} sesi, tidak cukup untuk mengisi ${availableMirrors.length} slot.`)
        return
      }

      const newSchedule = { ...schedule }
      availableMirrors.forEach(d => {
        const mirrorKey = `${d.toISOString().split('T')[0]}|${timeSlotLabel}`
        newSchedule[mirrorKey] = activeSubject
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

  // ========== HANDLE SAVE (DIPERBAIKI) ==========
  const handleSave = async () => {
  console.log('🚀 handleSave START');

  const entries = Object.entries(schedule);
  if (entries.length === 0) {
    alert('Pilih minimal satu slot jadwal!');
    return;
  }

  if (!matchData?.id) {
    alert('Data match tidak valid. Silakan kembali ke halaman penawaran.');
    return;
  }

  // Buat summary JSON dari schedule (ini yang akan dikirim)
  const summaryMap: Record<string, { subject: string; day: string; time: string; count: number }> = {};
  for (const [key, subject] of entries) {
    const [dateStr, timeSlot] = key.split('|');
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' });
    const keyGroup = `${subject}-${dayName}-${timeSlot}`;
    if (!summaryMap[keyGroup]) {
      summaryMap[keyGroup] = { subject, day: dayName, time: timeSlot, count: 0 };
    }
    summaryMap[keyGroup].count += 1;
  }
  const schedulesSummary = Object.values(summaryMap);
  console.log('📝 schedulesSummary:', schedulesSummary);

  // Kirim data ke API (tanpa token, karena server pakai service role)
  setIsSaving(true);
  setSaveMessage(null);

  try {
    // Kirim sessions (data mentah) ke API, biar API yang generate summary
    const sessions = entries.map(([key, subject]) => {
      const [dateStr, timeSlot] = key.split('|');
      return { date: dateStr, timeSlot, subject };
    });

    const res = await fetch(`/api/matches/${matchData.id}/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessions }),
    });

    console.log('📥 Response status:', res.status);
    const result = await res.json();
    console.log('📥 Response body:', result);

    if (!res.ok) {
      const errorMsg = result.error || result.message || `HTTP ${res.status}`;
      throw new Error(errorMsg);
    }

    setSaveMessage({ type: 'success', text: 'Jadwal berhasil disimpan! Menunggu konfirmasi tutor.' });
    setTimeout(() => {
      router.push('/dashboard/student/tutor-offers');
    }, 1500);
  } catch (err: any) {
    console.error('❌ Fetch error:', err);
    setSaveMessage({ type: 'error', text: err.message || 'Terjadi kesalahan saat menyimpan' });
    alert('Error: ' + err.message);
  } finally {
    setIsSaving(false);
  }
};

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
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-3 flex-wrap">
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
          </div>

          {selectedSubjects.length === 2 && step > 0 && maxSessions > 0 && (
            <div className="flex flex-wrap gap-6 mt-2 border-t pt-3">
              {selectedSubjects.map(subj => {
                const used = Object.values(schedule).filter(s => s === subj).length
                const allocated = allocation[subj] || 0
                const otherSubject = selectedSubjects.find(s => s !== subj)!
                const otherAlloc = allocation[otherSubject] || 0
                return (
                  <div key={subj} className="flex items-center gap-2">
                    <span className="font-medium capitalize min-w-[80px]">{subj}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => adjustAllocation(subj, -step)}
                      disabled={allocated <= 0}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-bold">{allocated}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => adjustAllocation(subj, step)}
                      disabled={otherAlloc - step < 0 || allocated >= maxSessions}
                    >
                      +
                    </Button>
                    <span className="text-sm text-muted-foreground">/{maxSessions}</span>
                  </div>
                )
              })}
            </div>
          )}
          {selectedSubjects.length === 1 && maxSessions > 0 && (
            <div className="mt-2 border-t pt-3 text-sm text-muted-foreground">
              {selectedSubjects[0]}: {maxSessions} sesi
              {step === 0 && " (hanya 1 mata pelajaran yang dapat dipilih)"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== TOMBOL PILIHAN MATA PELAJARAN AKTIF ========== */}
      {selectedSubjects.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pilih Mata Pelajaran Aktif</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {selectedSubjects.map(subj => {
              const used = Object.values(schedule).filter(s => s === subj).length
              const allocated = allocation[subj] || 0
              const remaining = allocated - used
              const isActive = activeSubject === subj
              const isExhausted = remaining <= 0

              if (isExhausted) {
                return (
                  <Button
                    key={subj}
                    variant="outline"
                    disabled
                    className="bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed capitalize"
                  >
                    {subj} {used}/{allocated}
                  </Button>
                )
              }

              return (
                <Button
                  key={subj}
                  variant={isActive ? 'default' : 'outline'}
                  onClick={() => setActiveSubject(subj)}
                  className={`capitalize ${
                    isActive
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {subj} {used}/{allocated}
                  {isActive && ' ✓'}
                </Button>
              )
            })}
            {activeSubject && (
              <span className="text-sm text-muted-foreground self-center ml-2">
                Aktif: {activeSubject}
              </span>
            )}
          </CardContent>
        </Card>
      )}

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
                  <th className="border p-1 min-w-[100px] text-left sticky left-0 bg-gray-800 z-10 border-r-2 font-semibold text-white">
                    Jam
                  </th>
                  {visibleDates.map((date, idx) => (
                    <th key={idx} className="border p-1 text-center min-w-[44px] bg-gray-800 text-white">
                      <div>{date.getDate()}</div>
                      <div className="text-xs text-gray-300">
                        {date.toLocaleDateString('id-ID', { weekday: 'short' })}
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
          onClick={() => {
            console.log('>>> Tombol Simpan diklik!');
            console.log('📊 totalSelected:', totalSelected);
            console.log('📋 schedule:', schedule);
            handleSave();
          }}
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