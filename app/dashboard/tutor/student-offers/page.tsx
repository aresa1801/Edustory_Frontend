'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
} from 'lucide-react'

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

export default function StudentOffersPage() {
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<StudentOffer[]>([])
  const [filteredOffers, setFilteredOffers] = useState<StudentOffer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [curationPassed, setCurationPassed] = useState(false)
  const [curationScore, setCurationScore] = useState(0)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [actingId, setActingId] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<StudentOffer | null>(null)
  const [dialogAction, setDialogAction] = useState<'confirm' | 'reject'>('confirm')

  useEffect(() => {
    fetchData()
  }, [])

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

  const fetchData = async () => {
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

      const { data: tutorData } = await supabase
        .from('tutors')
        .select('id, specializations, verified_grade_levels')
        .eq('user_id', user.id)
        .single()

      if (!tutorData) return

      // Get all matches for this tutor (to detect already-applied)
      const { data: tutorMatches } = await supabase
        .from('matches')
        .select('id, student_id, status')
        .eq('tutor_id', tutorData.id)

      const appliedStudentIds = new Set((tutorMatches || []).map((m: any) => m.student_id))

      // Get pending match requests directed to this tutor (student-initiated)
      const { data: session } = await supabase.auth.getSession()
      const matchRes = await fetch('/api/matches', {
        headers: { Authorization: `Bearer ${session?.session?.access_token}` },
      })
      const allMatches = matchRes.ok ? await matchRes.json() : []
      const pendingOffers = allMatches.filter((m: any) => m.status === 'pending')

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
          name: m.students?.user_profiles?.name || m.students?.users_profile?.full_name || 'Siswa',
          email: m.students?.user_profiles?.email || m.students?.users_profile?.email || '',
        },
        alreadyApplied: appliedStudentIds.has(m.students?.id),
      }))

      setOffers(mappedOffers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat penawaran siswa')
    } finally {
      setLoading(false)
    }
  }

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
        throw new Error(data.error || 'Gagal memproses permintaan')
      }

      setShowDialog(false)
      setSelectedOffer(null)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setActingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  // Unique subjects for filter
  const uniqueSubjects = Array.from(new Set(offers.map(o => o.subject))).sort()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Penawaran Siswa</h1>
        <p className="text-slate-500 text-sm mt-1">
          Siswa yang mencari tutor sesuai bidang Anda — terima atau tolak permintaan
        </p>
      </div>

      {/* Locked state */}
      {!curationPassed && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Fitur Terkunci</h3>
              <p className="text-sm text-amber-800">
                Untuk mengakses Penawaran Siswa, Anda harus menyelesaikan semua 5 tahap kurasi dengan skor minimal 80.
              </p>
              {curationScore > 0 && (
                <p className="text-sm text-amber-700 mt-2">
                  Skor kurasi Anda saat ini: <span className="font-bold">{curationScore}/100</span>
                  {curationScore <= 80 && (
                    <span className="text-amber-600"> (perlu ≥ 80)</span>
                  )}
                </p>
              )}
              <Button
                size="sm"
                className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => (window.location.href = '/curation/progress')}
              >
                Lanjutkan Kurasi →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {curationPassed && (
        <>
          {/* Score badge */}
          <div className="flex items-center gap-3">
            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5 px-3 py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Kurasi Lulus — Skor {curationScore}/100
            </Badge>
            <Badge variant="outline" className="text-slate-600 gap-1.5 px-3 py-1.5">
              <Handshake className="w-3.5 h-3.5" />
              {offers.length} Permintaan Masuk
            </Badge>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Cari siswa, mata pelajaran, atau kelas..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {uniqueSubjects.length > 0 && (
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  className="pl-9 pr-4 py-2 border border-input rounded-md text-sm bg-background text-foreground min-w-[180px]"
                  value={subjectFilter}
                  onChange={e => setSubjectFilter(e.target.value)}
                >
                  <option value="">Semua Mata Pelajaran</option>
                  {uniqueSubjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Offers list */}
          {filteredOffers.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="py-16 text-center">
                <Handshake className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-700 mb-1">
                  {offers.length === 0 ? 'Belum Ada Permintaan' : 'Tidak Ada Hasil'}
                </h3>
                <p className="text-sm text-slate-500">
                  {offers.length === 0
                    ? 'Belum ada siswa yang mengirim permintaan kepada Anda saat ini. Periksa kembali nanti.'
                    : 'Coba ubah filter pencarian Anda.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOffers.map(offer => (
                <Card key={offer.id} className="border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Avatar placeholder */}
                        <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-slate-900">{offer.student.name}</h3>
                            <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-200">
                              ⏳ Menunggu Konfirmasi
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                              <span>{offer.subject}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                              <span>{offer.student.grade_level}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{FREQUENCY_LABELS[offer.lesson_frequency] || offer.lesson_frequency}</span>
                            </div>
                            {offer.start_date && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  Mulai:{' '}
                                  {new Date(offer.start_date).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
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
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
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
        </>
      )}

      {/* Reject Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Permintaan Siswa</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menolak permintaan dari{' '}
              <span className="font-medium text-slate-900">{selectedOffer?.student.name}</span>{' '}
              untuk mata pelajaran{' '}
              <span className="font-medium text-slate-900">{selectedOffer?.subject}</span>?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setShowDialog(false); setSelectedOffer(null) }}
            >
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
              ) : (
                'Ya, Tolak'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
