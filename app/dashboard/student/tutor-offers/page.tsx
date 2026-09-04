'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  MapPin,
  BookMarked,
  Clock,
  Users,
  MessageCircle,
  RefreshCw,
  CalendarDays,
  Map,
  CheckCircle,
  XCircle,
  Trash2,
  Calendar,
  Star,
  Award,
  BookOpen,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Match {
  id: string
  tutor_id: string
  student_id: string
  subject: string
  matched_subjects: string[]
  status: 'pending' | 'matched' | 'active' | 'completed' | 'cancelled' | 'declined'
  initiated_by: 'student' | 'tutor'
  lesson_frequency: string
  start_date: string
  created_at: string
  tutor_full_name: string
  tutor_bio: string
  tutor_experience_years: number
  tutor_hourly_rate: number
  tutor_rating: number
  tutor_total_reviews: number
  tutor_verified_grade_levels: string[]
  tutor_avatar_url?: string | null
  schedules_summary?: any
  accepted_at?: string
  contract_end_date?: string
}

export default function TutorOffersPage() {
  const { user, loading: authLoading } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const isMounted = useRef(true)

  // === Statistik ===
  const [activeCount, setActiveCount] = useState(0)
  const [tutorPendingCount, setTutorPendingCount] = useState(0)
  const [studentPendingCount, setStudentPendingCount] = useState(0)
  const [rejectedCount, setRejectedCount] = useState(0)

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/students/my-matches?user_id=${user.id}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Gagal mengambil data')
      }
      const data = await res.json()
      if (isMounted.current) {
        setMatches(data)
        // Hitung statistik
        const active = data.filter((m: Match) => m.status === 'matched' || m.status === 'active')
        const tutorPending = data.filter((m: Match) => m.status === 'pending' && m.initiated_by === 'tutor')
        const studentPending = data.filter((m: Match) => m.status === 'pending' && m.initiated_by === 'student')
        const rejected = data.filter((m: Match) => m.status === 'declined' || m.status === 'cancelled')
        setActiveCount(active.length)
        setTutorPendingCount(tutorPending.length)
        setStudentPendingCount(studentPending.length)
        setRejectedCount(rejected.length)
        setError(null)
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message || 'Terjadi kesalahan')
        setMatches([])
      }
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    fetchData()
    return () => { isMounted.current = false }
  }, [user?.id, authLoading])

  const handleRefresh = () => {
    if (!isMounted.current) return
    fetchData()
  }

  const handleSchedule = (matchId: string) => {
    window.location.href = `/dashboard/student/set_schedule?matchId=${matchId}`
  }

  const handleReject = async (matchId: string) => {
    setProcessingId(matchId)
    try {
      const res = await fetch(`/api/matches/${matchId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menolak')
      }
      await fetchData()
      alert('✅ Penawaran ditolak.')
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setProcessingId(null)
      setShowRejectDialog(false)
      setSelectedMatchId(null)
    }
  }

  const openRejectDialog = (matchId: string) => {
    setSelectedMatchId(matchId)
    setShowRejectDialog(true)
  }

  const handleHide = (id: string) => {
    if (confirm('Sembunyikan data ini dari tampilan?')) {
      setHiddenIds(prev => new Set(prev).add(id))
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID')
  }

  const renderScheduleSummary = (summary: any) => {
    if (!summary) return null
    if (typeof summary === 'string') {
      return <span className="text-muted-foreground">{summary}</span>
    }
    if (Array.isArray(summary)) {
      return (
        <div className="text-muted-foreground">
          {summary.map((item, idx) => (
            <div key={idx} className="flex items-start gap-1 text-sm">
              <span className="font-medium">{item.subject}:</span>
              <span>{item.day}, {item.time} ({item.count} sesi)</span>
            </div>
          ))}
        </div>
      )
    }
    return <span className="text-muted-foreground">{JSON.stringify(summary)}</span>
  }

  // === Filter data (dengan hidden) ===
  const visibleMatches = matches.filter(m => !hiddenIds.has(m.id))
  const activeMatches = visibleMatches.filter(m => m.status === 'matched' || m.status === 'active')
  const tutorPendingMatches = visibleMatches.filter(m => m.status === 'pending' && m.initiated_by === 'tutor')
  const studentPendingMatches = visibleMatches.filter(m => m.status === 'pending' && m.initiated_by === 'student')
  const rejectedMatches = visibleMatches.filter(m => m.status === 'declined' || m.status === 'cancelled')

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="mt-3 text-sm text-muted-foreground">Memuat data...</p>
      </div>
    )
  }

  if (error && visibleMatches.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>❌ {error}</AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} className="mt-4">Refresh</Button>
      </div>
    )
  }

  // ===== RENDER KARTU UNTUK SETIAP TAB =====

  // 1. Pencocokan Aktif
  const renderActiveCards = () => {
    if (activeMatches.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada pencocokan yang dikonfirmasi.
          </CardContent>
        </Card>
      )
    }
    const statusMap: Record<string, { label: string; color: string }> = {
      matched: { label: 'Dikonfirmasi', color: 'bg-green-500/20 text-green-700 border-green-500/30' },
      active: { label: 'Aktif', color: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {activeMatches.map((match) => {
          const fullName = match.tutor_full_name || 'Tutor'
          const grade = match.tutor_verified_grade_levels?.join(', ') || ''
          const rate = match.tutor_hourly_rate || 0
          const subjects = match.matched_subjects?.join(', ') || match.subject || 'Tidak ada'
          const startDate = match.start_date
          const status = match.status
          const avatar = match.tutor_avatar_url
          const statusConfig = statusMap[status] || { label: status, color: 'bg-gray-200' }

          // Hitung sisa hari
          let daysLeft = null
          if (match.contract_end_date) {
            const end = new Date(match.contract_end_date).getTime()
            const nowTime = Date.now()
            daysLeft = Math.ceil((end - nowTime) / (1000 * 60 * 60 * 24))
          }

          return (
            <Card key={match.id} className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
                      {avatar ? (
                        <img src={avatar} alt={fullName} className="w-full h-full object-cover" />
                      ) : (
                        fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{fullName}</h3>
                      {grade && (
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                          {grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={`${statusConfig.color} text-xs`}>{statusConfig.label}</Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1.5 text-green-500" />
                    <span className="text-muted-foreground">Rp {rate.toLocaleString('id-ID')}/jam</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1.5 text-yellow-500" />
                    <span className="text-muted-foreground">
                      {match.tutor_rating || 0} ({match.tutor_total_reviews || 0} ulasan)
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Award className="w-4 h-4 mr-1.5 text-blue-500" />
                    <span className="text-muted-foreground">{match.tutor_experience_years || 0} tahun pengalaman</span>
                  </div>
                  {match.tutor_bio && (
                    <div className="flex items-start">
                      <BookOpen className="w-4 h-4 mr-1.5 mt-0.5 text-purple-400" />
                      <span className="text-muted-foreground line-clamp-2">{match.tutor_bio}</span>
                    </div>
                  )}
                  <div className="flex items-start">
                    <BookMarked className="w-4 h-4 mr-1.5 mt-0.5 text-indigo-400" />
                    <span className="text-muted-foreground">
                      <span className="font-medium">Mapel:</span> {subjects}
                    </span>
                  </div>
                  {match.schedules_summary && (
                    <div className="flex items-start">
                      <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400" />
                      <div>
                        <span className="font-medium">Jadwal:</span>
                        {renderScheduleSummary(match.schedules_summary)}
                      </div>
                    </div>
                  )}
                  {startDate && (
                    <div className="flex items-start">
                      <Calendar className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Mulai:</span> {formatDate(startDate)}
                      </span>
                    </div>
                  )}
                  {/* ===== INFORMASI KONTRAK ===== */}
                  {match.accepted_at && (
                    <div className="flex items-start">
                      <Calendar className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Kontrak mulai:</span> {formatDate(match.accepted_at)}
                      </span>
                    </div>
                  )}
                  {match.contract_end_date && (
                    <div className="flex items-start">
                      <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Berakhir:</span> {formatDate(match.contract_end_date)}
                        {daysLeft !== null && daysLeft >= 0 ? (
                          <span className="text-xs text-gray-400 ml-2">(sisa {daysLeft} hari)</span>
                        ) : daysLeft !== null && daysLeft < 0 ? (
                          <span className="text-xs text-red-500 ml-2">(lewat {Math.abs(daysLeft)} hari)</span>
                        ) : null}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tombol (disabled untuk saat ini) */}
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" disabled>
                    <Calendar className="w-4 h-4 mr-1.5" />
                    Lihat Jadwal
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-red-500 border-red-200 hover:bg-red-50" disabled>
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Hentikan Kontrak
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // 2. Permintaan Masuk (dari tutor)
  const renderTutorPendingCards = () => {
    if (tutorPendingMatches.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada permintaan masuk dari tutor.
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {tutorPendingMatches.map((match) => {
          const fullName = match.tutor_full_name || 'Tutor'
          const grade = match.tutor_verified_grade_levels?.join(', ') || ''
          const rate = match.tutor_hourly_rate || 0
          const subjects = match.matched_subjects?.join(', ') || match.subject || 'Tidak ada'
          const startDate = match.start_date
          const avatar = match.tutor_avatar_url

          return (
            <Card key={match.id} className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
                    {avatar ? (
                      <img src={avatar} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{fullName}</h3>
                    {grade && (
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                        {grade}
                      </Badge>
                    )}
                  </div>
                  <Badge className="ml-auto bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-xs">
                    Menunggu
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1.5 text-green-500" />
                    <span className="text-muted-foreground">Rp {rate.toLocaleString('id-ID')}/jam</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1.5 text-yellow-500" />
                    <span className="text-muted-foreground">
                      {match.tutor_rating || 0} ({match.tutor_total_reviews || 0} ulasan)
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Award className="w-4 h-4 mr-1.5 text-blue-500" />
                    <span className="text-muted-foreground">{match.tutor_experience_years || 0} tahun pengalaman</span>
                  </div>
                  {match.tutor_bio && (
                    <div className="flex items-start">
                      <BookOpen className="w-4 h-4 mr-1.5 mt-0.5 text-purple-400" />
                      <span className="text-muted-foreground line-clamp-2">{match.tutor_bio}</span>
                    </div>
                  )}
                  <div className="flex items-start">
                    <BookMarked className="w-4 h-4 mr-1.5 mt-0.5 text-indigo-400" />
                    <span className="text-muted-foreground">
                      <span className="font-medium">Mapel:</span> {subjects}
                    </span>
                  </div>
                  {startDate && (
                    <div className="flex items-start">
                      <Calendar className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Mulai:</span> {formatDate(startDate)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                    onClick={() => handleSchedule(match.id)}
                    disabled={processingId === match.id}
                  >
                    <Calendar className="w-4 h-4" />
                    Setuju & Atur Jadwal
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-1.5"
                    onClick={() => openRejectDialog(match.id)}
                    disabled={processingId === match.id}
                  >
                    <XCircle className="w-4 h-4" />
                    Tolak
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // 3. Permintaan Saya (dari student, sudah kirim jadwal)
  const renderStudentPendingCards = () => {
    if (studentPendingMatches.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada permintaan jadwal yang Anda kirim.
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {studentPendingMatches.map((match) => {
          const fullName = match.tutor_full_name || 'Tutor'
          const grade = match.tutor_verified_grade_levels?.join(', ') || ''
          const rate = match.tutor_hourly_rate || 0
          const subjects = match.matched_subjects?.join(', ') || match.subject || 'Tidak ada'
          const startDate = match.start_date
          const avatar = match.tutor_avatar_url

          const scheduleDisplay = match.schedules_summary
            ? renderScheduleSummary(match.schedules_summary)
            : 'Belum ditentukan'

          return (
            <Card key={match.id} className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
                    {avatar ? (
                      <img src={avatar} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{fullName}</h3>
                    {grade && (
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                        {grade}
                      </Badge>
                    )}
                  </div>
                  <Badge className="ml-auto bg-indigo-500/20 text-indigo-700 border-indigo-500/30 text-xs">
                    Menunggu
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1.5 text-green-500" />
                    <span className="text-muted-foreground">Rp {rate.toLocaleString('id-ID')}/jam</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1.5 text-yellow-500" />
                    <span className="text-muted-foreground">
                      {match.tutor_rating || 0} ({match.tutor_total_reviews || 0} ulasan)
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Award className="w-4 h-4 mr-1.5 text-blue-500" />
                    <span className="text-muted-foreground">{match.tutor_experience_years || 0} tahun pengalaman</span>
                  </div>
                  {match.tutor_bio && (
                    <div className="flex items-start">
                      <BookOpen className="w-4 h-4 mr-1.5 mt-0.5 text-purple-400" />
                      <span className="text-muted-foreground line-clamp-2">{match.tutor_bio}</span>
                    </div>
                  )}
                  <div className="flex items-start">
                    <BookMarked className="w-4 h-4 mr-1.5 mt-0.5 text-indigo-400" />
                    <span className="text-muted-foreground">
                      <span className="font-medium">Mapel:</span> {subjects}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400" />
                    <div className="text-muted-foreground">
                      <span className="font-medium">Jadwal:</span> {scheduleDisplay}
                    </div>
                  </div>
                  {startDate && (
                    <div className="flex items-start">
                      <Calendar className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Mulai:</span> {formatDate(startDate)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 bg-gray-100 border border-gray-200 rounded p-3 text-center">
                  <p className="text-sm font-medium text-gray-600">⏳ Menunggu konfirmasi tutor</p>
                  <p className="text-xs text-gray-500 mt-1">Jadwal sudah dikirim, tunggu tanggapan guru.</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // 4. Penolakan
  const renderRejectedCards = () => {
    if (rejectedMatches.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada penolakan.
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rejectedMatches.map((match) => {
          const fullName = match.tutor_full_name || 'Tutor'
          const grade = match.tutor_verified_grade_levels?.join(', ') || ''
          const rate = match.tutor_hourly_rate || 0
          const subjects = match.matched_subjects?.join(', ') || match.subject || 'Tidak ada'
          const startDate = match.start_date
          const avatar = match.tutor_avatar_url
          const status = match.status
          const initiatedBy = match.initiated_by

          const scheduleDisplay = match.schedules_summary
            ? renderScheduleSummary(match.schedules_summary)
            : 'Belum ditentukan'

          return (
            <Card key={match.id} className="border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
                      {avatar ? (
                        <img src={avatar} alt={fullName} className="w-full h-full object-cover" />
                      ) : (
                        fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{fullName}</h3>
                      {grade && (
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                          {grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500/20 text-red-700 border-red-500/30 text-xs">Ditolak</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-red-500"
                      onClick={() => handleHide(match.id)}
                      title="Sembunyikan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1.5 text-green-500" />
                    <span className="text-muted-foreground">Rp {rate.toLocaleString('id-ID')}/jam</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1.5 text-yellow-500" />
                    <span className="text-muted-foreground">
                      {match.tutor_rating || 0} ({match.tutor_total_reviews || 0} ulasan)
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Award className="w-4 h-4 mr-1.5 text-blue-500" />
                    <span className="text-muted-foreground">{match.tutor_experience_years || 0} tahun pengalaman</span>
                  </div>
                  {match.tutor_bio && (
                    <div className="flex items-start">
                      <BookOpen className="w-4 h-4 mr-1.5 mt-0.5 text-purple-400" />
                      <span className="text-muted-foreground line-clamp-2">{match.tutor_bio}</span>
                    </div>
                  )}
                  <div className="flex items-start">
                    <BookMarked className="w-4 h-4 mr-1.5 mt-0.5 text-indigo-400" />
                    <span className="text-muted-foreground">
                      <span className="font-medium">Mapel:</span> {subjects}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400" />
                    <div className="text-muted-foreground">
                      <span className="font-medium">Jadwal:</span> {scheduleDisplay}
                    </div>
                  </div>
                  {startDate && (
                    <div className="flex items-start">
                      <Calendar className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Mulai:</span> {formatDate(startDate)}
                      </span>
                    </div>
                  )}
                </div>

                {status === 'declined' && initiatedBy === 'tutor' && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-xs font-medium text-red-700">✗ Penawaran ditolak oleh Anda</p>
                  </div>
                )}
                {status === 'declined' && initiatedBy === 'student' && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-xs font-medium text-red-700">✗ Penawaran ditolak oleh tutor</p>
                  </div>
                )}
                {status === 'cancelled' && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-xs font-medium text-red-700">✗ Penawaran dibatalkan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // ===== MAIN RENDER =====
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Penawaran Tutor</h1>
          <p className="text-muted-foreground">Kelola penawaran dari tutor dan permintaan jadwal.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </Button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pencocokan Aktif</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Permintaan Masuk</p>
              <p className="text-2xl font-bold">{tutorPendingCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Permintaan Saya</p>
              <p className="text-2xl font-bold">{studentPendingCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Penolakan</p>
              <p className="text-2xl font-bold">{rejectedCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="active">
            Pencocokan Aktif
            {activeCount > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">{activeCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tutor-pending">
            Permintaan Masuk
            {tutorPendingCount > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5">{tutorPendingCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="student-pending">
            Permintaan Saya
            {studentPendingCount > 0 && (
              <span className="ml-2 bg-indigo-500 text-white text-xs rounded-full px-1.5 py-0.5">{studentPendingCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Penolakan
            {rejectedCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{rejectedCount}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">{renderActiveCards()}</TabsContent>
        <TabsContent value="tutor-pending">{renderTutorPendingCards()}</TabsContent>
        <TabsContent value="student-pending">{renderStudentPendingCards()}</TabsContent>
        <TabsContent value="rejected">{renderRejectedCards()}</TabsContent>
      </Tabs>

      {/* Dialog Konfirmasi Tolak */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Penawaran</DialogTitle>
            <DialogDescription>
              Anda akan menolak penawaran dari tutor ini.
              <br /><br />
              Apakah Anda yakin?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedMatchId) handleReject(selectedMatchId)
              }}
              disabled={processingId !== null}
            >
              {processingId ? <Spinner className="h-4 w-4" /> : 'Ya, Tolak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}