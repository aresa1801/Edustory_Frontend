'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/auth'
import {
  User,
  BookOpen,
  GraduationCap,
  Clock,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Lock,
  Handshake,
  Send,
  Wallet,
  Users,
  ArrowRight,
  DollarSign,
  MapPin,
  School,
  BookMarked,
  UserCircle,
} from 'lucide-react'
import Link from 'next/link'

const FREQUENCY_LABELS: Record<string, string> = {
  'once-a-week': '1× per minggu',
  'twice-a-week': '2× per minggu',
  'three-times-a-week': '3× per minggu',
  daily: 'Setiap hari',
  flexible: 'Fleksibel',
}

interface StudentOffer {
  id: string
  subject: string
  status: string
  lesson_frequency: string
  start_date: string
  student: {
    id: string
    grade_level: string
    learning_goals: string
    name: string
    email: string
  }
  alreadyApplied: boolean
}

interface BrowseStudent {
  id: string
  name: string
  gradeLevel: string
  subjects: string[]
  budgetPerMonth: number
  sessionsPerMonth: number
  preferredSchedule: string
  learningGoals: string
  address: string
  avatarUrl: string | null
  onboardingComplete: boolean
  status: string
  alreadyApplied: boolean
  matchId?: string
}

const SUBJECTS_ALL = [
  'Matematika', 'Bahasa Inggris', 'Bahasa Indonesia', 'Fisika', 'Kimia', 'Biologi',
  'Sejarah', 'Geografi', 'IPA', 'IPS', 'Ekonomi', 'Akuntansi',
  'Pemrograman', 'Desain Grafis', 'Musik', 'Seni Rupa',
]

const GRADE_LEVELS = [
  'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
  'SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9',
  'SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12',
  'Mahasiswa', 'Umum',
]

export default function StudentOffersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [curationPassed, setCurationPassed] = useState(false)
  const [curationScore, setCurationScore] = useState(0)

  // Tab 1: Incoming requests (student-initiated)
  const [offers, setOffers] = useState<StudentOffer[]>([])
  const [filteredOffers, setFilteredOffers] = useState<StudentOffer[]>([])
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [actingId, setActingId] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<StudentOffer | null>(null)
  const [dialogAction, setDialogAction] = useState<'confirm' | 'reject'>('confirm')

  // Tab 2: Browse students (tutor-initiated)
  const [browseStudents, setBrowseStudents] = useState<BrowseStudent[]>([])
  const [filteredBrowse, setFilteredBrowse] = useState<BrowseStudent[]>([])
  const [tutorData, setTutorData] = useState<any>(null)
  const [filterSubject, setFilterSubject] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [selectedBrowseStudent, setSelectedBrowseStudent] = useState<BrowseStudent | null>(null)
  const [showApplyDialog, setShowApplyDialog] = useState(false)
  const [applySubject, setApplySubject] = useState('')
  const [applying, setApplying] = useState<string | null>(null)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check curation score
      try {
        const progressRes = await fetch('/api/assessments/progress')
        if (progressRes.ok) {
          const progressData = await progressRes.json()
          const completedSteps: string[] = progressData.progress?.completed_steps || []
          const weights: Record<string, number> = {
            psychology: 20, academic: 30, microteaching: 25, handwriting: 15, interview: 10,
          }
          let total = 0
          let totalWeight = 0
          Object.entries(weights).forEach(([key, weight]) => {
            const score = progressData[key]?.score ?? progressData[key]?.overall_score
            if (score !== undefined) { total += (score * weight) / 100; totalWeight += weight }
          })
          const score = totalWeight > 0 ? Math.round(total) : 0
          setCurationScore(score)
          setCurationPassed(completedSteps.length >= 5 && score > 80)
        }
      } catch {}

      const { data: tutorDataResult } = await supabase
        .from('tutors')
        .select('id, specializations, verified_grade_levels, verified, approval_status')
        .eq('user_id', user.id)
        .single()

      setTutorData(tutorDataResult)
      if (!tutorDataResult) return

      // === Tab 1: Incoming requests from students ===
      const { data: { session } } = await supabase.auth.getSession()
      const matchRes = await fetch('/api/matches', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const allMatches = matchRes.ok ? await matchRes.json() : []
      const pendingOffers = allMatches.filter((m: any) => m.status === 'pending')

      const { data: tutorMatches } = await supabase
        .from('matches')
        .select('id, student_id, status')
        .eq('tutor_id', tutorDataResult.id)

      const appliedStudentIds = new Set((tutorMatches || []).map((m: any) => m.student_id))

      const mappedOffers: StudentOffer[] = pendingOffers.map((m: any) => ({
        id: m.id,
        subject: m.subject || '—',
        status: m.status,
        lesson_frequency: m.lesson_frequency || 'flexible',
        start_date: m.start_date,
        student: {
          id: m.students?.id || '',
          grade_level: m.students?.grade_level || '—',
          learning_goals: m.students?.learning_goals || '',
          name: m.students?.name || 'Siswa', // langsung dari students.name
          email: m.students?.user_profiles?.email || '',
        },
        alreadyApplied: appliedStudentIds.has(m.students?.id),
      }))

      setOffers(mappedOffers)

      // === Tab 2: Browse students ===
      if (tutorDataResult?.verified) {
        const { data: myApplications } = await supabase
          .from('matches')
          .select('student_id, id')
          .eq('tutor_id', tutorDataResult.id)
          .eq('initiated_by', 'tutor')

        const appliedBrowseIds = new Set((myApplications || []).map((a: any) => a.student_id))
        const browseMap = new Map((myApplications || []).map((a: any) => [a.student_id, a.id]))

        // Ambil data siswa lengkap
        const { data: students, error: studentsErr } = await supabase
          .from('students')
          .select(`
            id,
            name,
            grade_level,
            subjects,
            budget_per_month,
            sessions_per_month,
            preferred_schedule,
            learning_goals,
            address,
            avatar_url,
            onboarding_complete,
            status
          `)
          .eq('status', 'active')
          .eq('onboarding_complete', true)
          .not('budget_per_month', 'is', null)
          .order('created_at', { ascending: false })

        if (!studentsErr) {
          const verifiedLevels: string[] = tutorDataResult.verified_grade_levels || []
          const filtered = (students || []).filter((s: any) => {
            if (verifiedLevels.length === 0) return true
            return verifiedLevels.includes(s.grade_level)
          })

          const formatted: BrowseStudent[] = filtered.map((s: any) => ({
            id: s.id,
            name: s.name || 'Siswa',
            gradeLevel: s.grade_level || '-',
            subjects: s.subjects || [],
            budgetPerMonth: s.budget_per_month || 0,
            sessionsPerMonth: s.sessions_per_month || 0,
            preferredSchedule: s.preferred_schedule || '',
            learningGoals: s.learning_goals || '',
            address: s.address || '',
            avatarUrl: s.avatar_url || null,
            onboardingComplete: s.onboarding_complete || false,
            status: s.status || 'active',
            alreadyApplied: appliedBrowseIds.has(s.id),
            matchId: browseMap.get(s.id),
          }))

          setBrowseStudents(formatted)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Filter incoming
  useEffect(() => {
    let result = offers
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        o =>
          o.student.name.toLowerCase().includes(q) ||
          o.subject.toLowerCase().includes(q) ||
          o.student.grade_level?.toLowerCase().includes(q)
      )
    }
    if (subjectFilter) {
      result = result.filter(o => o.subject === subjectFilter)
    }
    setFilteredOffers(result)
  }, [offers, search, subjectFilter])

  // Filter browse
  useEffect(() => {
    let result = browseStudents
    if (filterSubject && filterSubject !== 'all') {
      result = result.filter(o => o.subjects.includes(filterSubject))
    }
    if (filterGrade && filterGrade !== 'all') {
      result = result.filter(o => o.gradeLevel === filterGrade)
    }
    setFilteredBrowse(result)
  }, [browseStudents, filterSubject, filterGrade])

  const handleAction = async (matchId: string, action: 'confirm' | 'reject') => {
    setActingId(matchId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`/api/matches/${matchId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Gagal ${action === 'confirm' ? 'menerima' : 'menolak'} permintaan`)
      }

      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memproses permintaan')
    } finally {
      setActingId(null)
      setShowDialog(false)
      setSelectedOffer(null)
    }
  }

  const handleApply = async () => {
    if (!selectedBrowseStudent || !applySubject || !tutorData) return
    setApplying(selectedBrowseStudent.id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: insertErr } = await supabase.from('matches').insert({
        tutor_id: tutorData.id,
        student_id: selectedBrowseStudent.id,
        subject: applySubject,
        status: 'pending',
        initiated_by: 'tutor',
        lesson_frequency: 'flexible',
        start_date: new Date().toISOString().split('T')[0],
      })

      if (insertErr) throw insertErr

      setApplySuccess(selectedBrowseStudent.id)
      setShowApplyDialog(false)
      setSelectedBrowseStudent(null)
      setApplySubject('')
      setTimeout(() => setApplySuccess(null), 3000)
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengirim penawaran')
    } finally {
      setApplying(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!curationPassed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lock className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Kurasi Belum Lulus</h2>
        <p className="text-slate-500 mb-6 max-w-md">
          Anda perlu menyelesaikan kurasi dengan skor minimal 80 sebelum dapat mengakses penawaran siswa.
          Skor Anda saat ini: <span className="font-semibold">{curationScore}/100</span>
        </p>
        <Button
          onClick={() => router.push('/curation/progress')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Lihat Progress Kurasi
        </Button>
      </div>
    )
  }

  const allSubjects = [...new Set([...offers.map(o => o.subject), ...browseStudents.flatMap(o => o.subjects)])].sort()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Penawaran Siswa</h1>
        <p className="text-slate-500 mt-1">
          Kelola permintaan siswa dan cari siswa yang cocok dengan bidang Anda.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="incoming" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="incoming" className="gap-2">
            <Handshake className="w-4 h-4" />
            Permintaan Masuk
            {offers.length > 0 && (
              <Badge className="ml-1 bg-blue-500/20 text-blue-300 border-blue-500/30">{offers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="browse" className="gap-2">
            <Search className="w-4 h-4" />
            Cari Siswa
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Incoming Requests */}
        <TabsContent value="incoming" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari siswa atau mata pelajaran..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" />
                <SelectValue placeholder="Semua Mapel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mapel</SelectItem>
                {allSubjects.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredOffers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Handshake className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Tidak ada permintaan masuk</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOffers.map(offer => (
                <Card key={offer.id} className="border border-slate-200 hover:border-blue-200 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-300">
                              {offer.student.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-slate-900">{offer.student.name}</span>
                          {offer.student.grade_level && (
                            <Badge variant="secondary" className="text-[11px]">
                              <GraduationCap className="w-3 h-3 mr-1" />
                              {offer.student.grade_level}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-blue-50 text-blue-300 border-blue-200 gap-1">
                            <BookOpen className="w-3 h-3" />
                            {offer.subject}
                          </Badge>
                          {offer.lesson_frequency && (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="w-3 h-3" />
                              {FREQUENCY_LABELS[offer.lesson_frequency] || offer.lesson_frequency}
                            </Badge>
                          )}
                        </div>

                        {offer.student.learning_goals && (
                          <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-xs text-slate-500 mb-0.5">Tujuan Belajar Siswa</p>
                            <p className="text-sm text-slate-700 line-clamp-2">
                              {offer.student.learning_goals}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                          disabled={actingId === offer.id}
                          onClick={() => handleAction(offer.id, 'confirm')}
                        >
                          {actingId === offer.id ? (
                            <Spinner className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Terima
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                          disabled={actingId === offer.id}
                          onClick={() => {
                            setSelectedOffer(offer)
                            setDialogAction('reject')
                            setShowDialog(true)
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Tolak
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Browse Students - Namecard Style */}
        <TabsContent value="browse" className="space-y-4">
          {!tutorData?.verified ? (
            <div className="text-center py-12">
              <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Fitur ini memerlukan verifikasi admin.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter Mapel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Mapel</SelectItem>
                    {SUBJECTS_ALL.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {GRADE_LEVELS.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredBrowse.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Tidak ada siswa yang cocok dengan filter Anda</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredBrowse.map(student => {
                    const costPerSession = student.budgetPerMonth && student.sessionsPerMonth
                      ? Math.round(student.budgetPerMonth / student.sessionsPerMonth)
                      : 0

                    return (
                      <Card
                        key={student.id}
                        className={`border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
                          student.alreadyApplied
                            ? 'border-green-200 bg-green-50/30'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <CardContent className="p-5">
                          {/* Header: Avatar + Nama */}
                          <div className="flex items-center gap-4 mb-3">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-md">
                              {student.avatarUrl ? (
                                <img
                                  src={student.avatarUrl}
                                  alt={student.name}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                student.name?.charAt(0)?.toUpperCase() || '?'
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-foreground truncate">
                                {student.name || 'Nama belum diisi'}
                              </h3>
                              {student.alreadyApplied && (
                                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs mt-0.5">
                                  ✓ Penawaran Dikirim
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Tarif per sesi */}
                          <div className="flex items-center text-sm text-muted-foreground mb-1">
                            <DollarSign className="w-4 h-4 mr-1 text-green-500" />
                            <span className="font-medium text-foreground">
                              {costPerSession > 0
                                ? `Rp ${costPerSession.toLocaleString('id-ID')}/sesi`
                                : 'Belum diatur'}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              (Rp {student.budgetPerMonth.toLocaleString('id-ID')}/bulan)
                            </span>
                          </div>

                          {/* Kelas */}
                          <div className="flex items-center text-sm text-muted-foreground mb-1.5">
                            <School className="w-4 h-4 mr-1 text-green-400 flex-shrink-0" />
                            <span>{student.gradeLevel || 'Kelas belum ditentukan'}</span>
                          </div>

                          {/* Mata Pelajaran */}
                          <div className="flex items-start text-sm text-muted-foreground mb-1.5">
                            <BookMarked className="w-4 h-4 mr-1 mt-0.5 text-purple-400 flex-shrink-0" />
                            <span>
                              {student.subjects?.length > 0 ? (
                                student.subjects.join(', ')
                              ) : (
                                <span className="text-muted-foreground">Belum ada mata pelajaran</span>
                              )}
                            </span>
                          </div>

                          {/* Alamat */}
                          <div className="flex items-start text-sm text-muted-foreground mb-1.5">
                            <MapPin className="w-4 h-4 mr-1 mt-0.5 text-blue-400 flex-shrink-0" />
                            <span>{student.address || 'Alamat belum diisi'}</span>
                          </div>

                          {/* Jadwal */}
                          <div className="flex items-start text-sm text-muted-foreground mb-3">
                            <Clock className="w-4 h-4 mr-1 mt-0.5 text-orange-400 flex-shrink-0" />
                            <span>{student.preferredSchedule || 'Jadwal belum ditentukan'}</span>
                          </div>

                          {/* Tujuan belajar (opsional) */}
                          {student.learningGoals && (
                            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 mb-4">
                              <p className="text-xs text-slate-500 mb-0.5">Tujuan Belajar</p>
                              <p className="text-sm text-slate-700 line-clamp-2">{student.learningGoals}</p>
                            </div>
                          )}

                          {/* Tombol aksi */}
                          {!student.alreadyApplied ? (
                            <Button
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                              disabled={applying === student.id}
                              onClick={() => {
                                setSelectedBrowseStudent(student)
                                setApplySubject('')
                                setShowApplyDialog(true)
                              }}
                            >
                              {applying === student.id ? (
                                <Spinner className="h-3.5 w-3.5" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              Kirim Penawaran
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-green-200 text-green-600 hover:bg-green-50 gap-1.5"
                              disabled
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Penawaran Terkirim
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Permintaan Siswa</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menolak permintaan dari{' '}
              <span className="font-medium text-slate-900">{selectedOffer?.student.name}</span>{' '}
              untuk mata pelajaran{' '}
              <span className="font-medium text-slate-900">{selectedOffer?.subject}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setShowDialog(false); setSelectedOffer(null) }}>
              Batal
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={actingId === selectedOffer?.id}
              onClick={() => selectedOffer && handleAction(selectedOffer.id, 'reject')}
            >
              {actingId === selectedOffer?.id ? (
                <><Spinner className="mr-2 h-4 w-4" />Memproses...</>
              ) : 'Ya, Tolak'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim Penawaran</DialogTitle>
            <DialogDescription>
              Pilih mata pelajaran yang ingin Anda ajarkan kepada{' '}
              <span className="font-semibold text-slate-900">{selectedBrowseStudent?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Mata Pelajaran</Label>
              <Select value={applySubject} onValueChange={setApplySubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mata pelajaran" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedBrowseStudent?.subjects || []).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowApplyDialog(false); setSelectedBrowseStudent(null) }}>
                Batal
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!applySubject || applying === selectedBrowseStudent?.id}
                onClick={handleApply}
              >
                {applying === selectedBrowseStudent?.id ? (
                  <><Spinner className="mr-2 h-4 w-4" />Mengirim...</>
                ) : (
                  <><Send className="w-4 h-4 mr-1.5" />Kirim Penawaran</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}