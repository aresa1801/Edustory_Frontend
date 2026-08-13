// app/dashboard/student/set_schedule/page.tsx (sementara: hardcoded)
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const TIME_SLOTS = [
  { label: '12.00 - 13.00' },
  { label: '13.00 - 14.00' },
  { label: '14.00 - 15.00' },
]

// Dummy data sementara
const dummyMatch = {
  id: 'd695f951-171a-4ac2-a0b7-e1f1bd0f85f6',
  subject: 'Matematika',
  matched_subjects: ['Matematika', 'Kimia'],
  status: 'pending',
  lesson_frequency: '2x seminggu',
  start_date: '2026-09-01',
  tutor_id: 'tutor-id',
  student_id: 'student-id',
  tutors: {
    id: 'tutor-id',
    hourly_rate: 150000,
    user_profiles: {
      full_name: 'Tutor Dummy',
      avatar_url: null,
    },
  },
  students: {
    id: 'student-id',
    grade_level: 'SMA Kelas 11',
    user_profiles: {
      full_name: 'Student Dummy',
    },
  },
}

const getDatesInMonth = (year: number, month: number) => {
  const dates = []
  const lastDay = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= lastDay; d++) {
    dates.push(new Date(year, month, d))
  }
  return dates
}

export default function SetSchedulePage() {
  const [matchData] = useState(dummyMatch)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(dummyMatch.matched_subjects.slice(0, 2))
  const [schedule, setSchedule] = useState<Record<string, string>>({})

  const dates = getDatesInMonth(2026, 7)
  const monthName = 'Agustus 2026'

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
      // hapus mirror
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
      // pilih subject dengan count paling sedikit
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
    if (entries.length === 0) return <p className="text-muted-foreground">Belum ada jadwal.</p>
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

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Atur Jadwal Belajar</h1>
      <p className="text-muted-foreground">
        Pilih mata pelajaran dan tentukan jadwal untuk{' '}
        <span className="font-medium">{matchData.tutors?.user_profiles?.full_name || 'tutor'}</span>.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pilih Mata Pelajaran (maks 2)</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          {matchData.matched_subjects?.map((subj: string) => {
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