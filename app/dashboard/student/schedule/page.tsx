'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  CheckCircle,
  RotateCw,
  School,
  UsersRound,
  Target,
  Home,
  GraduationCap,
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
  studentGender: string
  studentPhone: string
  studentEmail: string
  studentAddress: string
  studentAbout: string
  // Data Sekolah
  schoolName: string
  schoolLevel: string
  schoolCity: string
  // Data Orang Tua
  parentName: string
  parentRelation: string
  parentPhone: string
  parentEmail: string
  // Tujuan belajar
  learningGoal: string
  // Jadwal
  matchedSubjects: string[]
  frequency: string
  startDate: string
  status: 'matched' | 'active' | 'pending' | 'completed'
  isOnline: boolean
  acceptedAt: string
  contractEndDate: string
  schedulesSummary?: { subject: string; day: string; time: string; count: number }[]
  schedulesCustom?: { subject: string; day: string; time: string; count: number }[] | null
}

// ========== DATA DUMMY ==========
const DUMMY_STUDENTS: StudentSchedule[] = [
  {
    id: '1',
    studentName: 'Agus Kurniasariawan',
    studentGrade: 'SMA Kelas 11',
    studentGender: 'Laki-laki',
    studentPhone: '082223450823',
    studentEmail: 'agus@email.com',
    studentAddress: 'Jalan Teknika Selatan, Sekip Utara, Yogyakarta 55281',
    studentAbout: 'Saya suka belajar IPA',
    schoolName: 'SMA Angkasa 1',
    schoolLevel: 'SMA / SMK',
    schoolCity: 'Jakarta Utara',
    parentName: 'Gilbert',
    parentRelation: 'Ayah',
    parentPhone: '081102346578',
    parentEmail: 'ardi.santoso@gmail.com',
    learningGoal: 'Ingin lulus UTBK dengan nilai tinggi dan masuk FK UGM',
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
    schedulesCustom: null,
  },
  {
    id: '2',
    studentName: 'Josepha Marsha',
    studentGrade: 'SMA Kelas 10',
    studentGender: 'Perempuan',
    studentPhone: '087654321098',
    studentEmail: 'josepha@email.com',
    studentAddress: 'Jl. Sanggrahan no. 4 Ambarawa 50611',
    studentAbout: 'Suka belajar sambil mendengarkan musik',
    schoolName: 'SMA Negeri 3 Semarang',
    schoolLevel: 'SMA / SMK',
    schoolCity: 'Semarang',
    parentName: 'Bambang Marsha',
    parentRelation: 'Ayah',
    parentPhone: '081234567890',
    parentEmail: 'bambang.marsha@gmail.com',
    learningGoal: 'Ingin menguasai Kimia dan Akuntansi untuk olimpiade',
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
    schedulesCustom: [
      { subject: 'Kimia', day: 'Sabtu', time: '10.00 - 11.00', count: 1 },
    ],
  },
  {
    id: '3',
    studentName: 'Budi Santoso',
    studentGrade: 'SMA Kelas 12',
    studentGender: 'Laki-laki',
    studentPhone: '085678901234',
    studentEmail: 'budi@email.com',
    studentAddress: 'Jl. Merdeka No. 10, Jakarta',
    studentAbout: 'Suka tantangan soal matematika tingkat tinggi',
    schoolName: 'SMA Negeri 8 Jakarta',
    schoolLevel: 'SMA / SMK',
    schoolCity: 'Jakarta Selatan',
    parentName: 'Siti Santoso',
    parentRelation: 'Ibu',
    parentPhone: '081298765432',
    parentEmail: 'siti.santoso@gmail.com',
    learningGoal: 'Persiapan SNBT 2027',
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
    schedulesCustom: null,
  },
  {
    id: '4',
    studentName: 'Siti Rahayu',
    studentGrade: 'SMA Kelas 11',
    studentGender: 'Perempuan',
    studentPhone: '081298765432',
    studentEmail: 'siti@email.com',
    studentAddress: 'Jl. Kenanga No. 5, Bandung',
    studentAbout: 'Suka biologi dan kimia',
    schoolName: 'SMA Negeri 1 Bandung',
    schoolLevel: 'SMA / SMK',
    schoolCity: 'Bandung',
    parentName: 'Ahmad Rahayu',
    parentRelation: 'Ayah',
    parentPhone: '081234567890',
    parentEmail: 'ahmad.rahayu@gmail.com',
    learningGoal: 'Ingin menjadi dokter',
    matchedSubjects: ['Biologi', 'Kimia'],
    frequency: 'twice-a-week',
    startDate: '2026-06-01',
    status: 'completed',
    isOnline: false,
    acceptedAt: '2026-06-01T08:00:00Z',
    contractEndDate: '2026-08-15T08:00:00Z',
    schedulesSummary: [
      { subject: 'Biologi', day: 'Senin', time: '14.00 - 15.00', count: 8 },
      { subject: 'Kimia', day: 'Rabu', time: '14.00 - 15.00', count: 8 },
    ],
    schedulesCustom: null,
  },
  {
    id: '5',
    studentName: 'Dewi Lestari',
    studentGrade: 'SMA Kelas 10',
    studentGender: 'Perempuan',
    studentPhone: '087812345678',
    studentEmail: 'dewi@email.com',
    studentAddress: 'Jl. Mawar No. 12, Surabaya',
    studentAbout: 'Suka belajar santai tapi fokus',
    schoolName: 'SMA Negeri 5 Surabaya',
    schoolLevel: 'SMA / SMK',
    schoolCity: 'Surabaya',
    parentName: 'Rina Lestari',
    parentRelation: 'Ibu',
    parentPhone: '087812345678',
    parentEmail: 'rina.lestari@gmail.com',
    learningGoal: 'Meningkatkan nilai matematika',
    matchedSubjects: ['Matematika'],
    frequency: 'once-a-week',
    startDate: '2026-05-15',
    status: 'completed',
    isOnline: false,
    acceptedAt: '2026-05-15T09:00:00Z',
    contractEndDate: '2026-07-30T09:00:00Z',
    schedulesSummary: [
      { subject: 'Matematika', day: 'Jumat', time: '16.00 - 17.00', count: 10 },
    ],
    schedulesCustom: null,
  },
]

// ========== HELPER ==========
const STATUS_LABELS: Record<string, string> = {
  matched: 'Aktif',
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
  if (!summary) return <span className="text-sm text-muted-foreground">-</span>
  if (typeof summary === 'string') {
    return <span className="text-sm text-muted-foreground">{summary}</span>
  }
  if (Array.isArray(summary)) {
    return (
      <div className="space-y-1">
        {summary.map((item, idx) => (
          <div key={idx} className="text-sm text-muted-foreground">
            <span className="font-medium">{item.subject}:</span>{' '}
            {item.day}, {item.time} ({item.count} sesi)
          </div>
        ))}
      </div>
    )
  }
  return <span className="text-sm text-muted-foreground">{JSON.stringify(summary)}</span>
}

// ========== KOMPONEN UTAMA ==========
export default function TutorSchedulePage() {
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

  const activeStudents = students.filter(
    (s) => s.status === 'matched' || s.status === 'active'
  )
  const completedStudents = students.filter((s) => s.status === 'completed')

  const filterByMode = (list: StudentSchedule[]) => {
    if (mode === 'online') return list.filter((s) => s.isOnline === true)
    if (mode === 'offline') return list.filter((s) => s.isOnline === false)
    return list
  }

  const filteredActive = filterByMode(activeStudents)
  const filteredCompleted = filterByMode(completedStudents)

  const totalOnline = students.filter((s) => s.isOnline).length
  const totalOffline = students.filter((s) => !s.isOnline).length

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

      {/* Statistik */}
      <div className="grid grid-cols-4 gap-4">
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
              <p className="text-xl font-bold">{totalOnline}</p>
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
              <p className="text-xl font-bold">{totalOffline}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-500/20 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kontrak Selesai</p>
              <p className="text-xl font-bold">{completedStudents.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ===== BAGIAN 1: AKTIF ===== */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Circle className="w-4 h-4 text-green-500 fill-green-500" />
          Aktif ({filteredActive.length})
        </h2>
        {filteredActive.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {mode === 'all'
                ? 'Belum ada siswa aktif.'
                : `Tidak ada siswa aktif dengan status ${getModeLabel().toLowerCase()}.`}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredActive.map((student) => {
              const daysLeft = getDaysLeft(student.contractEndDate)
              const isExpired = daysLeft < 0

              return (
                <Card
                  key={student.id}
                  className="border shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {student.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{student.studentName}</h3>
                            <span className="text-xs text-muted-foreground">
                              {student.studentGrade} | {student.matchedSubjects.join(', ')}
                            </span>
                          </div>
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
      </div>

      {/* ===== BAGIAN 2: KONTRAK SELESAI ===== */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-slate-500" />
          Kontrak Selesai ({filteredCompleted.length})
        </h2>
        {filteredCompleted.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {mode === 'all'
                ? 'Belum ada kontrak yang selesai.'
                : `Tidak ada kontrak selesai dengan status ${getModeLabel().toLowerCase()}.`}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCompleted.map((student) => (
              <Card
                key={student.id}
                className="border shadow-sm hover:shadow-md transition-shadow border-slate-200 bg-slate-50/50"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {student.studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{student.studentName}</h3>
                          <span className="text-xs text-muted-foreground">
                            {student.studentGrade} | {student.matchedSubjects.join(', ')}
                          </span>
                        </div>
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          <span className="font-medium">Berakhir pada:</span>{' '}
                          {formatDate(student.contractEndDate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleViewProfile(student)}
                      >
                        <User className="w-3.5 h-3.5 mr-1.5" />
                        Profil Siswa
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        disabled
                      >
                        <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                        Menunggu Perpanjangan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ========== DIALOG PROFIL SISWA (DIPERBESAR) ========== */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Profil Siswa</DialogTitle>
            <DialogDescription>
              Informasi lengkap siswa yang telah dikonfirmasi.
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-6 py-2">
              {/* ===== HEADER PROFIL ===== */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                  {selectedStudent.studentName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedStudent.studentName}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {selectedStudent.studentGrade}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs">
                      <Circle
                        className={`h-2.5 w-2.5 fill-current ${
                          selectedStudent.isOnline ? 'text-green-500' : 'text-gray-400'
                        }`}
                      />
                      <span className="text-muted-foreground">
                        {selectedStudent.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== GRID 3 KOLOM: DATA SISWA, SEKOLAH, ORANG TUA ===== */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* KOLOM 1: DATA SISWA */}
                <Card className="border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <User className="w-4 h-4 text-blue-500" />
                      <h4 className="font-semibold text-sm">Data Siswa</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Nama Lengkap</p>
                        <p className="font-medium">{selectedStudent.studentName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Jenis Kelamin</p>
                        <p className="font-medium">{selectedStudent.studentGender || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">No. HP / WhatsApp</p>
                        <p className="font-medium">{selectedStudent.studentPhone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium break-all">{selectedStudent.studentEmail || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Alamat Rumah</p>
                        <p className="font-medium">{selectedStudent.studentAddress || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tentang Saya</p>
                        <p className="font-medium italic">{selectedStudent.studentAbout || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KOLOM 2: DATA SEKOLAH */}
                <Card className="border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <School className="w-4 h-4 text-purple-500" />
                      <h4 className="font-semibold text-sm">Data Sekolah</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Nama Sekolah</p>
                        <p className="font-medium">{selectedStudent.schoolName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Jenjang Sekolah</p>
                        <p className="font-medium">{selectedStudent.schoolLevel || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Kota Sekolah</p>
                        <p className="font-medium">{selectedStudent.schoolCity || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Kelas</p>
                        <p className="font-medium">{selectedStudent.studentGrade || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Mata Pelajaran</p>
                        <p className="font-medium">
                          {selectedStudent.matchedSubjects.join(', ') || '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KOLOM 3: DATA ORANG TUA */}
                <Card className="border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <UsersRound className="w-4 h-4 text-green-500" />
                      <h4 className="font-semibold text-sm">Data Orang Tua / Wali</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Nama Orang Tua / Wali</p>
                        <p className="font-medium">{selectedStudent.parentName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hubungan</p>
                        <p className="font-medium">{selectedStudent.parentRelation || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">No. HP Orang Tua</p>
                        <p className="font-medium">{selectedStudent.parentPhone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email Orang Tua</p>
                        <p className="font-medium break-all">{selectedStudent.parentEmail || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ===== TUJUAN BELAJAR ===== */}
              <Card className="border shadow-sm bg-blue-50/50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-sm">Tujuan Belajar</h4>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedStudent.learningGoal || 'Belum ada tujuan belajar yang ditentukan.'}
                  </p>
                </CardContent>
              </Card>

              {/* ===== JADWAL: TERKINI (KIRI) & KUSTOM (KANAN) ===== */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* KIRI: JADWAL TERKINI */}
                <Card className="border shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <h4 className="font-semibold text-sm">Jadwal Terkini</h4>
                    </div>
                    <div className="pt-1">
                      {renderScheduleSummary(selectedStudent.schedulesSummary)}
                    </div>
                  </CardContent>
                </Card>

                {/* KANAN: JADWAL KUSTOM */}
                <Card className="border shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <RotateCw className="w-4 h-4 text-teal-500" />
                      <h4 className="font-semibold text-sm">Jadwal Kustom</h4>
                    </div>
                    <div className="pt-1">
                      {selectedStudent.schedulesCustom ? (
                        renderScheduleSummary(selectedStudent.schedulesCustom)
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Belum ada jadwal kustom.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ===== KONTRAK ===== */}
              <Card className="border shadow-sm bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 pb-2 border-b mb-3">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    <h4 className="font-semibold text-sm">Informasi Kontrak</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Mulai Kontrak</p>
                      <p className="font-medium">{formatDate(selectedStudent.acceptedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Berakhir Kontrak</p>
                      <p className="font-medium">{formatDate(selectedStudent.contractEndDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}