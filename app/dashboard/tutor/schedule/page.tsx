'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Circle,
  Users,
  RefreshCw,
  BookOpen,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

// ========== TIPE DATA ==========
interface StudentSchedule {
  id: string
  studentName: string
  studentGrade: string
  studentPhone: string
  studentEmail: string
  studentAddress: string
  subject: string
  matchedSubjects: string[]
  frequency: string
  startDate: string
  status: 'matched' | 'active' | 'pending' | 'completed'
  isOnline: boolean
  acceptedAt: string
  contractEndDate: string
  schedulesSummary?: { subject: string; day: string; time: string; count: number }[]
}

// ========== DATA DUMMY ==========
const DUMMY_STUDENTS: StudentSchedule[] = [
  {
    id: '1',
    studentName: 'Agus Kurniasariawan',
    studentGrade: 'SMA Kelas 11',
    studentPhone: '081234567890',
    studentEmail: 'agus@email.com',
    studentAddress: 'Jalan Teknika Selatan, Sekip Utara, Yogyakarta 55281',
    subject: 'Sejarah',
    matchedSubjects: ['Sejarah'],
    frequency: 'flexible',
    startDate: '2026-09-03',
    status: 'matched',
    isOnline: true,
    acceptedAt: '2026-09-04T07:00:00Z',
    contractEndDate: '2026-11-18T07:00:00Z',
    schedulesSummary: [
      { subject: 'Sejarah', day: 'Selasa', time: '12.00 - 13.00', count: 5 },
      { subject: 'Sejarah', day: 'Selasa', time: '13.00 - 14.00', count: 5 },
    ],
  },
  {
    id: '2',
    studentName: 'Josepha Marsha',
    studentGrade: 'SMA Kelas 10',
    studentPhone: '087654321098',
    studentEmail: 'josepha@email.com',
    studentAddress: 'Jl. Sanggrahan no. 4 Ambarawa 50611',
    subject: 'Kimia',
    matchedSubjects: ['Kimia', 'Akuntansi'],
    frequency: 'twice-a-week',
    startDate: '2026-09-02',
    status: 'active',
    isOnline: false,
    acceptedAt: '2026-09-02T08:00:00Z',
    contractEndDate: '2026-11-16T08:00:00Z',
    schedulesSummary: [
      { subject: 'Kimia', day: 'Rabu', time: '15.00 - 16.00', count: 4 },
      { subject: 'Akuntansi', day: 'Jumat', time: '15.00 - 16.00', count: 4 },
    ],
  },
  {
    id: '3',
    studentName: 'Budi Santoso',
    studentGrade: 'SMA Kelas 12',
    studentPhone: '085678901234',
    studentEmail: 'budi@email.com',
    studentAddress: 'Jl. Merdeka No. 10, Jakarta',
    subject: 'Matematika',
    matchedSubjects: ['Matematika', 'Fisika'],
    frequency: 'three-times-a-week',
    startDate: '2026-09-01',
    status: 'active',
    isOnline: true,
    acceptedAt: '2026-09-01T09:00:00Z',
    contractEndDate: '2026-11-15T09:00:00Z',
    schedulesSummary: [
      { subject: 'Matematika', day: 'Senin', time: '10.00 - 11.00', count: 6 },
      { subject: 'Fisika', day: 'Rabu', time: '10.00 - 11.00', count: 4 },
      { subject: 'Matematika', day: 'Jumat', time: '10.00 - 11.00', count: 6 },
    ],
  },
]

// ========== HELPER ==========
const STATUS_LABELS: Record<string, string> = {
  matched: 'Dikonfirmasi',
  active: 'Aktif',
  pending: 'Menunggu',
  completed: 'Selesai',
}

const STATUS_COLORS: Record<string, string> = {
  matched: 'bg-green-500/20 text-green-700 border-green-500/30',
  active: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  pending: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  completed: 'bg-slate-500/20 text-slate-700 border-slate-500/30',
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getDaysLeft(endDateStr: string): number {
  const end = new Date(endDateStr).getTime()
  const now = Date.now()
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24))
}

function renderScheduleSummary(summary: any) {
  if (!summary) return null
  if (typeof summary === 'string') {
    return <span className="text-muted-foreground">{summary}</span>
  }
  if (Array.isArray(summary)) {
    return (
      <div className="space-y-0.5">
        {summary.map((item, idx) => (
          <div key={idx} className="text-sm text-muted-foreground">
            <span className="font-medium">{item.subject}:</span>{' '}
            {item.day}, {item.time} ({item.count} sesi)
          </div>
        ))}
      </div>
    )
  }
  return <span className="text-muted-foreground">{JSON.stringify(summary)}</span>
}

// ========== KOMPONEN UTAMA ==========
export default function SchedulePage() {
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<StudentSchedule[]>([])
  const [mode, setMode] = useState<'online' | 'offline' | 'all'>('all')
  const [selectedStudent, setSelectedStudent] = useState<StudentSchedule | null>(null)
  const [showProfileDialog, setShowProfileDialog] = useState(false)

  // Simulasi load data
  useEffect(() => {
    setLoading(true)
    setTimeout(() => {
      setStudents(DUMMY_STUDENTS)
      setLoading(false)
    }, 500)
  }, [])

  const filteredStudents = students.filter((s) => {
    if (mode === 'online') return s.isOnline === true
    if (mode === 'offline') return s.isOnline === false
    return true
  })

  const toggleMode = () => {
    if (mode === 'all') setMode('online')
    else if (mode === 'online') setMode('offline')
    else setMode('all')
  }

  const getModeLabel = () => {
    if (mode === 'all') return 'Semua'
    if (mode === 'online') return 'Online'
    return 'Offline'
  }

  const handleViewSchedule = (student: StudentSchedule) => {
    // Nanti redirect ke detail jadwal
    alert(`Lihat jadwal untuk ${student.studentName}`)
  }

  const handleViewProfile = (student: StudentSchedule) => {
    setSelectedStudent(student)
    setShowProfileDialog(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="ml-3 text-muted-foreground">Memuat jadwal...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jadwal Mengajar</h1>
          <p className="text-muted-foreground">
            Kelola jadwal mengajar dengan siswa yang sudah dikonfirmasi.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Filter:</span>
            <button
              onClick={toggleMode}
              className="px-3 py-1.5 text-xs font-medium rounded-md border bg-background hover:bg-muted transition-colors"
            >
              {getModeLabel()}
            </button>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistik ringkas */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Siswa</p>
              <p className="text-xl font-bold">{students.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Circle className="w-4 h-4 text-green-500 fill-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Online</p>
              <p className="text-xl font-bold">{students.filter(s => s.isOnline).length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-400/20 flex items-center justify-center">
              <Circle className="w-4 h-4 text-gray-400 fill-gray-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Offline</p>
              <p className="text-xl font-bold">{students.filter(s => !s.isOnline).length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Daftar siswa dalam format baris */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tidak Ada Siswa</h3>
            <p className="text-muted-foreground">
              {mode === 'all'
                ? 'Belum ada siswa yang dikonfirmasi.'
                : `Tidak ada siswa dengan status ${getModeLabel().toLowerCase()}.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) => {
            const daysLeft = getDaysLeft(student.contractEndDate)
            const isExpired = daysLeft < 0

            return (
              <Card
                key={student.id}
                className="border shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    {/* Kiri: Nama, status, kontrak */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {student.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{student.studentName}</h3>
                          <span className="text-xs text-muted-foreground">
                            {student.studentGrade}
                          </span>
                        </div>
                        <Badge className={`${STATUS_COLORS[student.status] || ''} text-xs border`}>
                          {STATUS_LABELS[student.status] || student.status}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs">
                          <Circle
                            className={`h-2 w-2 fill-current ${
                              student.isOnline ? 'text-green-500' : 'text-gray-400'
                            }`}
                          />
                          <span className="text-muted-foreground">
                            {student.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>

                      {/* Kontrak berakhir + countdown */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          <span className="font-medium">Kontrak berakhir:</span>{' '}
                          {formatDate(student.contractEndDate)}
                          {!isExpired ? (
                            <span className="text-gray-400 ml-1">
                              (sisa {daysLeft} hari)
                            </span>
                          ) : (
                            <span className="text-red-500 ml-1">
                              (lewat {Math.abs(daysLeft)} hari)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Kanan: Tombol aksi */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleViewSchedule(student)}
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        Lihat Jadwal
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleViewProfile(student)}
                      >
                        <User className="w-3.5 h-3.5 mr-1.5" />
                        Profil Siswa
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog Profil Siswa */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Profil Siswa</DialogTitle>
            <DialogDescription>
              Informasi lengkap siswa yang telah dikonfirmasi.
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {selectedStudent.studentName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedStudent.studentName}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {selectedStudent.studentGrade}
                  </Badge>
                  <div className="flex items-center gap-1 mt-1">
                    <Circle
                      className={`h-2.5 w-2.5 fill-current ${
                        selectedStudent.isOnline ? 'text-green-500' : 'text-gray-400'
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedStudent.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedStudent.studentPhone || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedStudent.studentEmail || '-'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span>{selectedStudent.studentAddress || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span>
                    <span className="font-medium">Mapel:</span>{' '}
                    {selectedStudent.matchedSubjects.join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    <span className="font-medium">Mulai kontrak:</span>{' '}
                    {formatDate(selectedStudent.acceptedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>
                    <span className="font-medium">Kontrak berakhir:</span>{' '}
                    {formatDate(selectedStudent.contractEndDate)}
                  </span>
                </div>

                {/* Tampilkan ringkasan jadwal di profil jika ada */}
                {selectedStudent.schedulesSummary && (
                  <div className="mt-2 p-2 bg-muted/50 rounded-md">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Jadwal:</p>
                    {renderScheduleSummary(selectedStudent.schedulesSummary)}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}