// app/dashboard/student/set_schedule/page.tsx
'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// ---------- DATA DUMMY ----------
// Mata pelajaran yang tersedia (nanti dari match)
const AVAILABLE_SUBJECTS = ['Matematika', 'Kimia', 'Sejarah']

// Rentang waktu (jam) berdasarkan preferensi siswa (misal 12.00 - 15.00, interval 1 jam)
const TIME_SLOTS = [
  { label: '12.00 - 13.00', start: 12, end: 13 },
  { label: '13.00 - 14.00', start: 13, end: 14 },
  { label: '14.00 - 15.00', start: 14, end: 15 },
]

// Fungsi untuk menghasilkan tanggal dalam bulan Agustus 2026 (dummy)
const getDummyDates = () => {
  const year = 2026
  const month = 7 // Agustus = 7 (0-based)
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const dates = []
  for (let d = 1; d <= lastDay.getDate(); d++) {
    dates.push(new Date(year, month, d))
  }
  return dates
}

// ---------- KOMPONEN UTAMA ----------
export default function StudentSetSchedulePage() {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]) // urutan pilihan
  const [schedule, setSchedule] = useState<Record<string, string>>({}) // key: "date|timeSlot", value: subject

  const dates = useMemo(() => getDummyDates(), [])
  const monthName = 'Agustus 2026'

  // Toggle pilihan mata pelajaran (maks 2)
  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => {
      const index = prev.indexOf(subject)
      if (index !== -1) {
        // Sudah ada, hapus
        return prev.filter(s => s !== subject)
      } else {
        // Tambahkan jika masih kurang dari 2
        if (prev.length >= 2) return prev
        return [...prev, subject]
      }
    })
  }

  // Fungsi untuk mengisi atau mengosongkan slot
  const handleSlotClick = (date: Date, timeSlotLabel: string) => {
    const key = `${date.toISOString().split('T')[0]}|${timeSlotLabel}`
    const currentSubject = schedule[key]

    if (currentSubject) {
      // Jika sudah terisi, hapus (toggle)
      const newSchedule = { ...schedule }
      delete newSchedule[key]
      // Hapus juga mirroring di tanggal lain dengan hari yang sama
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
      // Jika kosong, isi dengan subjek yang paling sedikit terisi (untuk keseimbangan)
      if (selectedSubjects.length === 0) {
        alert('Pilih mata pelajaran terlebih dahulu!')
        return
      }

      // Hitung jumlah slot per subjek
      const subjectCounts: Record<string, number> = {}
      Object.values(schedule).forEach(subj => {
        subjectCounts[subj] = (subjectCounts[subj] || 0) + 1
      })

      // Pilih subjek dengan jumlah paling sedikit (jika lebih dari 1, pilih sesuai urutan)
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

      // Isi slot utama
      const newSchedule = { ...schedule, [key]: selectedSubject }

      // Mirror ke semua tanggal dengan hari yang sama
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

  // Helper untuk mengecek status slot
  const isSlotFilled = (date: Date, timeSlotLabel: string): boolean => {
    const key = `${date.toISOString().split('T')[0]}|${timeSlotLabel}`
    return !!schedule[key]
  }

  const getSlotSubject = (date: Date, timeSlotLabel: string): string | null => {
    const key = `${date.toISOString().split('T')[0]}|${timeSlotLabel}`
    return schedule[key] || null
  }

  // Generate ringkasan jadwal
  const generateSummary = () => {
    const entries = Object.entries(schedule)
    if (entries.length === 0) {
      return <p className="text-muted-foreground">Belum ada jadwal dipilih.</p>
    }

    // Kelompokkan berdasarkan subjek, hari, dan jam
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

  // ---- RENDER ----
  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Atur Jadwal Belajar</h1>

      {/* Pilihan Mata Pelajaran */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pilih Mata Pelajaran (maks 2)</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          {AVAILABLE_SUBJECTS.map(subj => {
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
            <Button variant="outline" size="sm" disabled>←</Button>
            <Button variant="outline" size="sm" disabled>→</Button>
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
                            {filled ? subject?.charAt(0) : 'O'}
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
        <CardContent>
          {generateSummary()}
        </CardContent>
      </Card>
    </div>
  )
}