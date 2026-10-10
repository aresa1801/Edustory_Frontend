'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { createClient } from '@/lib/auth'
import {
  Star, TrendingUp, BookOpen, Users, Award, MessageCircle, Shield, Info,
  AlertTriangle, History, LogIn, CheckCircle2, XCircle, CheckCircle
} from 'lucide-react'

interface TutorRating {
  matchId: string
  tutorName: string
  subject: string
  completedSessions: number
  existingRating: number | null
  existingReview: string | null
}

const CREDIT_TIERS = [
  { range: '81-100', label: 'Aman', color: 'bg-green-500', textColor: 'text-green-400', borderColor: 'border-green-500/40', bgColor: 'bg-green-500/10', description: 'Bisa mengakses segala fitur tanpa hambatan.' },
  { range: '66-80', label: 'Pembatasan', color: 'bg-lime-500', textColor: 'text-lime-400', borderColor: 'border-lime-500/40', bgColor: 'bg-lime-500/10', description: 'Akses katalog tutor dibatasi refresh setiap 10 detik.' },
  { range: '51-65', label: 'Waspada', color: 'bg-yellow-500', textColor: 'text-yellow-400', borderColor: 'border-yellow-500/40', bgColor: 'bg-yellow-500/10', description: 'Mengubah profil akan mengalami jeda 2 hari sekali.' },
  { range: '26-50', label: 'Hati-hati', color: 'bg-orange-500', textColor: 'text-orange-400', borderColor: 'border-orange-500/40', bgColor: 'bg-orange-500/10', description: 'Katalog tutor dibekukan (tidak bisa mencari tutor baru sama sekali).' },
  { range: '6-25', label: 'Bahaya', color: 'bg-red-500', textColor: 'text-red-400', borderColor: 'border-red-500/40', bgColor: 'bg-red-500/10', description: 'Akun otomatis ditahan admin. Tidak bisa mencari tutor baru. Kontrak berjalan tetap dilanjutkan.' },
  { range: '0-5', label: 'Blacklist', color: 'bg-black', textColor: 'text-gray-300', borderColor: 'border-gray-500/40', bgColor: 'bg-gray-900/60', description: 'Akun akan di-banned.' },
]

const REASON_META: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  daily_login: { label: 'Login harian', Icon: LogIn, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  both_ready: { label: 'Sesi dimulai (kedua pihak siap)', Icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/15' },
  session_expired: { label: 'Sesi hangus — tidak klik Siap', Icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15' },
  unilateral_terminate: { label: 'Hentikan kontrak sepihak', Icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/15' },
  admin_adjustment: { label: 'Penyesuaian admin', Icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/15' },
}

export default function StudentAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    activeTutors: 0,
    completionRate: 0,
    averageRating: 0,
  })
  const [tutorRatings, setTutorRatings] = useState<TutorRating[]>([])
  const [subjects, setSubjects] = useState<string[]>([])

  const [credit, setCredit] = useState({
    creditScore: 99,
    suspendedUntil: null as string | null,
    isSuspended: false,
  })
  const [creditLog, setCreditLog] = useState<Array<{
    id: string
    delta: number
    balanceAfter: number
    reason: string
    refId: string | null
    createdAt: string
  }>>([])
  const [showCreditInfo, setShowCreditInfo] = useState(false)

  const [showRatingDialog, setShowRatingDialog] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<TutorRating | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  const isMounted = useRef(true)
  const fetchDone = useRef(false)
  const timeoutId = useRef<NodeJS.Timeout | null>(null)

  const fetchData = async () => {
    if (fetchDone.current) return
    fetchDone.current = true

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // ✅ Fetch credit + log PARALEL
      Promise.all([
        fetch(`/api/credit/me?user_id=${user.id}&role=student&_t=${Date.now()}`, { cache: 'no-store' })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null),
        fetch(`/api/credit/log?user_id=${user.id}&role=student&limit=50&_t=${Date.now()}`, { cache: 'no-store' })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null),
      ]).then(([creditJson, logJson]) => {
        if (!isMounted.current) return
        if (creditJson) {
          setCredit({
            creditScore: Number(creditJson.creditScore ?? 99),
            suspendedUntil: creditJson.suspendedUntil ?? null,
            isSuspended: Boolean(creditJson.isSuspended),
          })
        }
        if (logJson && Array.isArray(logJson.logs)) {
          setCreditLog(logJson.logs)
        }
      })

      const { data: studentData, error: studentErr } = await supabase
        .from('students')
        .select('id, subjects')
        .eq('user_id', user.id)
        .maybeSingle()

      if (studentErr && studentErr.code !== 'PGRST116') throw studentErr
      if (!studentData) {
        setLoading(false)
        return
      }

      setSubjects(studentData.subjects || [])

      const { data: matches, error: matchErr } = await supabase
        .from('matches')
        .select(`
          id, status, subject, student_rating, student_review,
          tutors:tutor_id(user_profiles:user_id(name))
        `)
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false })

      if (matchErr && matchErr.code !== 'PGRST116') throw matchErr

      const allMatches = matches || []
      const completed = allMatches.filter((m: any) => m.status === 'completed')
      const active = allMatches.filter((m: any) => ['matched', 'active'].includes(m.status))
      const rated = completed.filter((m: any) => m.student_rating)
      const avgRating = rated.length > 0
        ? rated.reduce((sum: number, m: any) => sum + (m.student_rating || 0), 0) / rated.length
        : 0

      setStats({
        totalSessions: allMatches.length,
        completedSessions: completed.length,
        activeTutors: active.length,
        completionRate: allMatches.length > 0 ? Math.round((completed.length / allMatches.length) * 100) : 0,
        averageRating: avgRating,
      })

      setTutorRatings(completed.map((m: any) => ({
        matchId: m.id,
        tutorName: m.tutors?.user_profiles?.name || 'Tutor',
        subject: m.subject || '-',
        completedSessions: 1,
        existingRating: m.student_rating || null,
        existingReview: m.student_review || null,
      })))
      setError(null)
    } catch (err) {
      setError('Gagal memuat data analitik.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    timeoutId.current = setTimeout(() => {
      if (isMounted.current && loading) setLoading(false)
    }, 3000)
    fetchData()
    return () => {
      isMounted.current = false
      if (timeoutId.current) clearTimeout(timeoutId.current)
    }
  }, []) // eslint-disable-line

  const handleSubmitRating = async () => {
    if (!selectedMatch || ratingValue === 0) return
    setSubmittingRating(true)
    try {
      const supabase = createClient()
      const { error: updateErr } = await supabase
        .from('matches')
        .update({ student_rating: ratingValue, student_review: reviewText.trim() || null })
        .eq('id', selectedMatch.matchId)
      if (updateErr) throw updateErr

      const { data: matchData } = await supabase
        .from('matches').select('tutor_id').eq('id', selectedMatch.matchId).maybeSingle()

      if (matchData?.tutor_id) {
        const { data: allRatings } = await supabase
          .from('matches').select('student_rating')
          .eq('tutor_id', matchData.tutor_id).not('student_rating', 'is', null)
        if (allRatings && allRatings.length > 0) {
          const avg = allRatings.reduce((s, r) => s + (r.student_rating || 0), 0) / allRatings.length
          await supabase.from('tutors')
            .update({ rating: Math.round(avg * 10) / 10, total_reviews: allRatings.length })
            .eq('id', matchData.tutor_id)
        }
      }
      setShowRatingDialog(false)
      setSelectedMatch(null)
      setRatingValue(0)
      setReviewText('')
      fetchDone.current = false
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan penilaian')
    } finally {
      setSubmittingRating(false)
    }
  }

  const creditColor = credit.creditScore >= 80 ? 'text-green-400'
    : credit.creditScore >= 50 ? 'text-yellow-400' : 'text-red-400'
  const creditBg = credit.creditScore >= 80 ? 'bg-green-500/20'
    : credit.creditScore >= 50 ? 'bg-yellow-500/20' : 'bg-red-500/20'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner className="h-10 w-10 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat data analitik...</p>
      </div>
    )
  }

  const unratedMatches = tutorRatings.filter(r => r.existingRating === null)
  const ratedMatches = tutorRatings.filter(r => r.existingRating !== null)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Analitik & Performa</h1>
        <p className="text-muted-foreground">Pantau progres belajar dan berikan penilaian kepada tutor Anda.</p>
      </div>

      {credit.isSuspended && credit.suspendedUntil && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Akun Anda sedang <strong>tersuspend</strong> sampai{' '}
            <strong>{new Date(credit.suspendedUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertDescription className="text-amber-700 text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* ⬇️ ROW 1: Credit + 3 Stats (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Credit Score */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${creditBg} flex items-center justify-center shrink-0`}>
              <Shield className={`w-5 h-5 ${creditColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-muted-foreground">Credit Score</p>
                <button type="button" onClick={() => setShowCreditInfo(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors" title="Info tier">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className={`text-2xl font-bold ${creditColor}`}>
                {credit.creditScore}<span className="text-sm text-muted-foreground font-normal">/100</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Total Sesi */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Sesi</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalSessions}</p>
            </div>
          </div>
        </Card>

        {/* Sesi Selesai */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-green-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sesi Selesai</p>
              <p className="text-2xl font-bold text-foreground">{stats.completedSessions}</p>
            </div>
          </div>
        </Card>

        {/* Tutor Aktif */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tutor Aktif</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeTutors}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ⬇️ ROW 2: Penyelesaian + Rating */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Tingkat Penyelesaian Sesi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sesi selesai vs total</span>
              <span className="font-medium">{stats.completedSessions}/{stats.totalSessions}</span>
            </div>
            <Progress value={stats.completionRate} className="h-3" />
            <p className="text-sm text-muted-foreground">{stats.completionRate}% sesi berhasil diselesaikan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4" />
              Rating Rata-rata yang Anda Berikan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.averageRating > 0 ? (
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-foreground">{stats.averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm mb-1">/ 5.0</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} className={`w-6 h-6 ${star <= Math.round(stats.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">Berdasarkan {ratedMatches.length} penilaian</p>
              </div>
            ) : (
              <div className="py-4 text-center">
                <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Belum ada penilaian yang diberikan</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ⬇️ ROW 3: Riwayat Credit Score */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            Riwayat Credit Score
            {creditLog.length > 0 && (
              <Badge variant="outline" className="ml-2">{creditLog.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {creditLog.length === 0 ? (
            <div className="py-8 text-center">
              <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada riwayat perubahan credit.</p>
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto pr-2 divide-y divide-border/30">
              {creditLog.map((entry) => {
                const meta = REASON_META[entry.reason] ?? {
                  label: entry.reason, Icon: Shield, color: 'text-muted-foreground', bg: 'bg-muted/20',
                }
                const Icon = meta.Icon
                const positive = entry.delta > 0
                return (
                  <div key={entry.id} className="flex items-center gap-3 py-3">
                    <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{meta.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {entry.createdAt
                          ? new Date(entry.createdAt).toLocaleString('id-ID', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : '-'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${positive ? 'text-green-400' : entry.delta === 0 ? 'text-muted-foreground' : 'text-red-400'}`}>
                        {positive ? '+' : ''}{entry.delta}
                      </p>
                      <p className="text-[11px] text-muted-foreground">→ {entry.balanceAfter}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {subjects.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Mata Pelajaran yang Dipelajari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
            </div>
          </CardContent>
        </Card>
      )}

      {unratedMatches.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Berikan Penilaian ({unratedMatches.length} tutor menunggu)
          </h2>
          <div className="space-y-3">
            {unratedMatches.map(item => (
              <Card key={item.matchId} className="border-l-4 border-l-primary/40">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{item.tutorName}</p>
                      <p className="text-sm text-muted-foreground">{item.subject}</p>
                    </div>
                    <Button size="sm" onClick={() => {
                      setSelectedMatch(item); setRatingValue(0); setReviewText(''); setShowRatingDialog(true)
                    }}>
                      <Star className="w-3 h-3 mr-1" /> Beri Nilai
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {ratedMatches.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Riwayat Penilaian</h2>
          <div className="space-y-3">
            {ratedMatches.map(item => (
              <Card key={item.matchId}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{item.tutorName}</p>
                      <p className="text-sm text-muted-foreground mb-2">{item.subject}</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} className={`w-4 h-4 ${star <= (item.existingRating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                        ))}
                        <span className="text-sm font-medium text-foreground ml-1">{item.existingRating}/5</span>
                      </div>
                      {item.existingReview && (
                        <p className="text-sm text-muted-foreground mt-1 italic">&ldquo;{item.existingReview}&rdquo;</p>
                      )}
                    </div>
                    <Badge className="bg-green-500/20 text-green-700 border border-green-200 text-xs">
                      Sudah Dinilai
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* DIALOG RATING */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Penilaian Kepuasan Belajar</DialogTitle>
            <DialogDescription>Beri nilai untuk {selectedMatch?.tutorName} — {selectedMatch?.subject}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Skor Kepuasan (1–5 bintang)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setRatingValue(star)} className="p-1 transition-transform hover:scale-110">
                    <Star className={`w-8 h-8 ${star <= ratingValue ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ulasan (opsional)</Label>
              <Textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
                placeholder="Ceritakan pengalaman belajar Anda..." rows={3} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowRatingDialog(false)}>Batal</Button>
              <Button className="flex-1" disabled={ratingValue === 0 || submittingRating} onClick={handleSubmitRating}>
                {submittingRating ? 'Menyimpan...' : 'Kirim Penilaian'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG INFO CREDIT */}
      <Dialog open={showCreditInfo} onOpenChange={setShowCreditInfo}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Tingkatan Credit Score
            </DialogTitle>
            <DialogDescription>
              Setiap tingkatan memiliki konsekuensi berbeda. Jaga credit score Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 py-2">
            {CREDIT_TIERS.map((tier) => (
              <div key={tier.range} className={`p-3 rounded-md border ${tier.borderColor} ${tier.bgColor}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                  <span className={`font-bold text-sm ${tier.textColor}`}>{tier.range}</span>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${tier.textColor}`}>— {tier.label}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-5">{tier.description}</p>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-md bg-muted/20 border border-border mt-2">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Cara menaikkan credit:</strong> Login harian (+1), menyelesaikan sesi belajar (+2).
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}