'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { createClient } from '@/lib/auth'
import { BookOpen, GraduationCap, Wallet, Calendar, Users, Search, Send, CheckCircle } from 'lucide-react'

interface StudentOffer {
  id: string
  gradeLevel: string
  subjects: string[]
  budget: number
  sessionsPerMonth: number
  preferredSchedule: string
  learningGoals: string
  studentName: string
  studentCity?: string
  alreadyApplied: boolean
  matchId?: string
}

const SUBJECTS_ALL = [
  'Matematika', 'Bahasa Inggris', 'Bahasa Indonesia', 'Fisika', 'Kimia', 'Biologi',
  'Sejarah', 'Geografi', 'IPA', 'IPS', 'Ekonomi', 'Akuntansi',
  'Pemrograman', 'Desain Grafis', 'Musik', 'Seni Rupa',
]

export default function StudentOffersPage() {
  const [offers, setOffers] = useState<StudentOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tutorData, setTutorData] = useState<any>(null)
  const [selectedOffer, setSelectedOffer] = useState<StudentOffer | null>(null)
  const [showApplyDialog, setShowApplyDialog] = useState(false)
  const [applySubject, setApplySubject] = useState('')
  const [applying, setApplying] = useState<string | null>(null)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)

  // Filters
  const [filterSubject, setFilterSubject] = useState('')
  const [filterGrade, setFilterGrade] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get tutor info
      const { data: tutor } = await supabase
        .from('tutors')
        .select('id, specializations, verified, verified_grade_levels, approval_status')
        .eq('user_id', user.id)
        .single()

      setTutorData(tutor)

      if (!tutor?.verified) {
        setError('Anda perlu terverifikasi terlebih dahulu untuk melihat penawaran siswa.')
        setLoading(false)
        return
      }

      // Get existing applications by this tutor
      const { data: myApplications } = await supabase
        .from('matches')
        .select('student_id, id')
        .eq('tutor_id', tutor.id)
        .eq('initiated_by', 'tutor')

      const appliedStudentIds = new Set((myApplications || []).map((a: any) => a.student_id))
      const applicationMap = new Map((myApplications || []).map((a: any) => [a.student_id, a.id]))

      // Get students who have completed onboarding and have budget set
      const { data: students, error: studentsErr } = await supabase
        .from('students')
        .select(`
          id,
          grade_level,
          subjects,
          budget_per_month,
          sessions_per_month,
          preferred_schedule,
          learning_goals,
          school_city,
          onboarding_complete,
          status,
          user_profiles:user_id(name)
        `)
        .eq('status', 'active')
        .eq('onboarding_complete', true)
        .not('budget_per_month', 'is', null)
        .order('created_at', { ascending: false })

      if (studentsErr) throw studentsErr

      // Filter by tutor's verified grade levels
      const verifiedLevels: string[] = tutor.verified_grade_levels || []
      const filtered = (students || []).filter((s: any) => {
        if (verifiedLevels.length === 0) return true
        return verifiedLevels.includes(s.grade_level)
      })

      const formatted: StudentOffer[] = filtered.map((s: any) => ({
        id: s.id,
        gradeLevel: s.grade_level || '-',
        subjects: s.subjects || [],
        budget: s.budget_per_month || 0,
        sessionsPerMonth: s.sessions_per_month || 0,
        preferredSchedule: s.preferred_schedule || '',
        learningGoals: s.learning_goals || '',
        studentName: s.user_profiles?.name || 'Siswa',
        studentCity: s.school_city || '',
        alreadyApplied: appliedStudentIds.has(s.id),
        matchId: applicationMap.get(s.id),
      }))

      setOffers(formatted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat penawaran siswa')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = async () => {
    if (!selectedOffer || !applySubject || !tutorData) return
    setApplying(selectedOffer.id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: insertErr } = await supabase.from('matches').insert({
        tutor_id: tutorData.id,
        student_id: selectedOffer.id,
        subject: applySubject,
        status: 'pending',
        initiated_by: 'tutor',
        lesson_frequency: 'flexible',
        start_date: new Date().toISOString().split('T')[0],
      })

      if (insertErr) throw insertErr

      setApplySuccess(selectedOffer.id)
      setShowApplyDialog(false)
      setSelectedOffer(null)
      setApplySubject('')
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengirim penawaran')
    } finally {
      setApplying(null)
    }
  }

  const filteredOffers = offers.filter(o => {
    if (filterSubject && !o.subjects.includes(filterSubject)) return false
    if (filterGrade && o.gradeLevel !== filterGrade) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Penawaran Siswa</h1>
        <p className="text-muted-foreground">
          Daftar siswa yang sedang mencari tutor sesuai kebutuhan belajar mereka. Apply untuk mengajar!
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {tutorData && !tutorData.verified && !error && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertDescription className="text-amber-800">
            ⚠️ Akun Anda belum terverifikasi. Selesaikan proses kurasi untuk mendapatkan akses ke penawaran siswa.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Penawaran</p>
          <p className="text-2xl font-bold text-foreground">{offers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Sudah Apply</p>
          <p className="text-2xl font-bold text-primary">{offers.filter(o => o.alreadyApplied).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Tersedia</p>
          <p className="text-2xl font-bold text-green-600">{offers.filter(o => !o.alreadyApplied).length}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filter Penawaran</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block">Mata Pelajaran</Label>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Semua mata pelajaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua mata pelajaran</SelectItem>
                {SUBJECTS_ALL.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Tingkat Kelas</Label>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Semua kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua kelas</SelectItem>
                {['SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
                  'SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9',
                  'SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12', 'Mahasiswa', 'Umum'].map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {(filterSubject || filterGrade) && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-muted-foreground"
            onClick={() => { setFilterSubject(''); setFilterGrade('') }}
          >
            Reset Filter
          </Button>
        )}
      </Card>

      {/* Offers List */}
      {filteredOffers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Tidak Ada Penawaran Ditemukan</h3>
            <p className="text-muted-foreground text-sm">
              {offers.length === 0
                ? 'Belum ada siswa yang mencari tutor saat ini. Cek lagi nanti!'
                : 'Tidak ada penawaran yang sesuai dengan filter Anda.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOffers.map(offer => (
            <Card
              key={offer.id}
              className={`hover:shadow-md transition-shadow ${offer.alreadyApplied ? 'border-green-200 bg-green-50/30' : ''}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                        {offer.studentName[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{offer.studentName}</h3>
                        {offer.studentCity && (
                          <p className="text-xs text-muted-foreground">{offer.studentCity}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <GraduationCap className="w-4 h-4 flex-shrink-0" />
                        <span>{offer.gradeLevel}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Wallet className="w-4 h-4 flex-shrink-0" />
                        <span>Rp {offer.budget.toLocaleString('id-ID')}/bln</span>
                      </div>
                      {offer.sessionsPerMonth > 0 && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>{offer.sessionsPerMonth}× /bulan</span>
                        </div>
                      )}
                      {offer.preferredSchedule && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{offer.preferredSchedule}</span>
                        </div>
                      )}
                    </div>

                    {offer.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {offer.subjects.map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}

                    {offer.learningGoals && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        <span className="font-medium">Tujuan:</span> {offer.learningGoals}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {offer.alreadyApplied ? (
                      <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> Sudah Apply
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedOffer(offer)
                          setApplySubject(offer.subjects[0] || '')
                          setShowApplyDialog(true)
                        }}
                        disabled={applying === offer.id}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Send className="w-3 h-3 mr-1" /> Apply
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim Penawaran Mengajar</DialogTitle>
            <DialogDescription>
              Anda akan mengirimkan penawaran untuk mengajar {selectedOffer?.studentName}
            </DialogDescription>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Siswa</span>
                  <span className="font-medium">{selectedOffer.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kelas</span>
                  <span className="font-medium">{selectedOffer.gradeLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium">Rp {selectedOffer.budget.toLocaleString('id-ID')}/bulan</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Mata Pelajaran yang Ditawarkan <span className="text-red-500">*</span></Label>
                <Select value={applySubject} onValueChange={setApplySubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih mata pelajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedOffer.subjects.map((s: string) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Pilih mata pelajaran yang sesuai kebutuhan siswa</p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  💡 Setelah Anda mengirimkan penawaran, siswa akan menerima notifikasi dan dapat meninjau profil Anda sebelum membuat keputusan.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowApplyDialog(false)}>
                  Batal
                </Button>
                <Button
                  className="flex-1"
                  disabled={!applySubject || applying === selectedOffer.id}
                  onClick={handleApply}
                >
                  {applying === selectedOffer.id ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Kirim Penawaran
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
