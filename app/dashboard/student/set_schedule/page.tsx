'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/auth'

// ---------- KONFIGURASI JAM ----------
const TIME_SLOTS = [
  { label: '12.00 - 13.00', start: 12, end: 13 },
  { label: '13.00 - 14.00', start: 13, end: 14 },
  { label: '14.00 - 15.00', start: 14, end: 15 },
]

const getDatesInMonth = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const dates = []
  for (let d = 1; d <= lastDay.getDate(); d++) {
    dates.push(new Date(year, month, d))
  }
  return dates
}

// ---------- KOMPONEN UTAMA ----------
function SetScheduleContent() {
  const searchParams = useSearchParams()
  const matchId = searchParams.get('matchId')
  const { user, loading: authLoading } = useAuth()

  const [matchData, setMatchData] = useState<any>(null)
  const [loadingMatch, setLoadingMatch] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [schedule, setSchedule] = useState<Record<string, string>>({})

  const dates = useMemo(() => getDatesInMonth(2026, 7), [])
  const monthName = 'Agustus 2026'

  // FETCH DATA MATCH
  useEffect(() => {
    console.log('[set_schedule] useEffect, matchId =', matchId, 'user =', user?.id)

    if (!matchId) {
      setError('Tidak ada ID match. Silakan buka melalui tombol "Atur Jadwal".')
      setLoadingMatch(false)
      return
    }

    if (!user) {
      setError('Silakan login terlebih dahulu.')
      setLoadingMatch(false)
      return
    }

    const fetchMatch = async () => {
      console.log('[set_schedule] fetchMatch mulai')
      setLoadingMatch(true)
      setError(null)

      try {
        const supabase = createClient()
        console.log('[set_schedule] Supabase client created')

        // 1. Cari student_id dari user yang login
        console.log('[set_schedule] mencari student_id untuk user:', user.id)
        const { data: studentData, error: studentErr } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        console.log('[set_schedule] studentData:', studentData, 'error:', studentErr)

        if (studentErr || !studentData) {
          throw new Error('Data siswa tidak ditemukan. Pastikan Anda adalah student.')
        }

        const studentId = studentData.id
        console.log('[set_schedule] student_id ditemukan:', studentId)

        // 2. Ambil match dengan filter student_id dan matchId
        console.log('[set_schedule] querying matches dengan student_id dan matchId')
        const { data: match, error: matchErr } = await supabase
          .from('matches')
          .select(`
            id,
            subject,
            matched_subjects,
            status,
            lesson_frequency,
            start_date,
            tutor_id,
            student_id,
            tutors:tutor_id (
              id,
              hourly_rate,
              user_id,
              user_profiles:user_id (
                full_name,
                avatar_url
              )
            ),
            students:student_id (
              id,
              grade_level,
              user_id,
              user_profiles:user_id (
                full_name
              )
            )
          `)
          .eq('id', matchId)
          .eq('student_id', studentId)
          .maybeSingle()

        console.log('[set_schedule] match query result:', match ? 'found' : 'null', 'error:', matchErr)

        if (matchErr) {
          console.error('[set_schedule] Supabase error:', matchErr)
          throw new Error(`Gagal mengambil data match: ${matchErr.message}`)
        }

        if (!match) {
          throw new Error('Data match tidak ditemukan atau Anda tidak memiliki akses.')
        }

        setMatchData(match)

        // Inisialisasi selectedSubjects
        if (match.matched_subjects && match.matched_subjects.length > 0) {
          setSelectedSubjects(match.matched_subjects.slice(0, 2))
        } else if (match.subject) {
          setSelectedSubjects([match.subject])
        }
        console.log('[set_schedule] selectedSubjects =', selectedSubjects)

      } catch (err: any) {
        console.error('[set_schedule] ERROR:', err)
        setError(err.message || 'Terjadi kesalahan')
      } finally {
        console.log('[set_schedule] finally, set loading false')
        setLoadingMatch(false)
      }
    }

    if (!authLoading) {
      fetchMatch()
    }
  }, [matchId, user, authLoading])

  // --- Fungsi-fungsi lainnya (toggleSubject, handleSlotClick, dll) ---
  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => {
      const index = prev.indexOf(subject)
      if (index !== -1) {
        return prev.filter(s => s !== subject)
      } else {
        if (prev.length >= 2) return prev
        return [...prev, subject]
      }
    })
  }

  const handleSlotClick = (date: Date, timeSlotLabel: string) => {
    const key = `${date.toISOString().split('T')[0]}|${timeSlotLabel}`
    const currentSubject = schedule[key]

    if (currentSubject) {
      const newSchedule = { ...schedule }
      delete newSchedule[key]
      const dayOfWeek = date.getDay()
      dates.forEach(d => {
        if (d.getDay() === dayOfWeek) {
          const mirrorKey = `${d.toISOString().split('T')[0]}|${timeSlotLabel}`
          if (newSchedule[mirrorKey] === currentSubject) {
            delete newSchedule[mirrorKey]
          }
        }
      })
      setSchedule(newSchedule)
    } else {
      if (selectedSubjects.length === 0) {
        alert('Pilih mata pelajaran terlebih dahulu!')
        return
      }
      const subjectCounts: Record<string, number> = {}
      Object.values(schedule).forEach(subj => {
        subjectCounts[subj] = (subjectCounts[subj] || 0) + 1
      })
      let selectedSubject = selectedSubjects[0]
      if (selectedSubjects.length > 1) {
        let minCount = Infinity
        for (const subj of selectedSubjects) {
          const count = subjectCounts[subj] || 0
          if (count < minCount) {
            minCount = count
            selectedSubject = subj
          }
        }
      }
      const newSchedule = { ...schedule, [key]: selectedSubject }
      const dayOfWeek = date.getDay()
      dates.forEach(d => {
        if (d.getDay() === dayOfWeek) {
          const mirrorKey = `${d.toISOString().split('T')[0]}|${timeSlotLabel}`
          if (!newSchedule[mirrorKey]) {
            newSchedule[mirrorKey] = selectedSubject
          }
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
    const grouped: Record<string, { subject: string; day: string; time: string; count: number }> = {}
    entries.forEach(([key, subject]) => {
      const [dateStr, timeSlot] = key.split('|')
      const date = new Date(dateStr)
      const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' })
      const groupKey = `${subject}-${dayName}-${timeSlot}`
      if (!grouped[groupKey]) {
        grouped[groupKey] = { subject, day: dayName, time: timeSlot, count: 0 }
      }
      grouped[groupKey].count += 1
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
  console.log('[set_schedule] render, authLoading =', authLoading, 'loadingMatch =', loadingMatch, 'error =', error)

  if (authLoading || loadingMatch) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="ml-3">{authLoading ? 'Memuat sesi...' : 'Memuat data jadwal...'}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => window.history.back()} className="mt-4">
          Kembali
        </Button>
      </div>
    )
  }

  if (!matchData) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>Data match tidak ditemukan.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const availableSubjects =
    matchData.matched_subjects && matchData.matched_subjects.length > 0
      ? matchData.matched_subjects
      : [matchData.subject].filter(Boolean)

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Atur Jadwal Belajar</h1>
      <p className="text-muted-foreground">
        Pilih mata pelajaran dan tentukan jadwal untuk{' '}
        <span className="font-medium">{matchData.tutors?.user_profiles?.full_name || 'tutor'}</span>.
      </p>

      {/* Pilihan Mata Pelajaran */}
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

      {/* Kalender */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{monthName}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              ←
            </Button>
            <Button variant="outline" size="sm" disabled>
              →
            </Button>
          </div>
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

      {/* Ringkasan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ringkasan Jadwal</CardTitle>
        </CardHeader>
        <CardContent>{generateSummary()}</CardContent>
      </Card>

      {/* Tombol Simpan */}
      <div className="flex justify-end">
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          Simpan Jadwal
        </Button>
      </div>
    </div>
  )
}

// ---------- PAGE UTAMA dengan SUSPENSE ----------
export default function SetSchedulePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>}>
      <SetScheduleContent />
    </Suspense>
  )
}