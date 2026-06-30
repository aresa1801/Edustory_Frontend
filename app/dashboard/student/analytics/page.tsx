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
import { Star, TrendingUp, BookOpen, Users, Award, MessageCircle } from 'lucide-react'

interface TutorRating {
  matchId: string
  tutorName: string
  subject: string
  completedSessions: number
  existingRating: number | null
  existingReview: string | null
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

  // Rating dialog
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
      console.log('[Analytics] 🔄 Fetching data...')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('[Analytics] ⚠️ User not found, using empty data')
        setLoading(false)
        return
      }

      const { data: studentData, error: studentErr } = await supabase
        .from('students')
        .select('id, subjects')
        .eq('user_id', user.id)
        .maybeSingle() // ✅ maybeSingle() bukan single()

      if (studentErr && studentErr.code !== 'PGRST116') {
        console.error('[Analytics] ❌ Student error:', studentErr)
        throw studentErr
      }

      if (!studentData) {
        console.log('[Analytics] ⚠️ No student profile found')
        setLoading(false)
        return
      }

      setSubjects(studentData.subjects || [])

      const { data: matches, error: matchErr } = await supabase
        .from('matches')
        .select(`
          id,
          status,
          subject,
          student_rating,
          student_review,
          tutors:tutor_id(
            user_profiles:user_id(name)
          )
        `)
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false })

      if (matchErr && matchErr.code !== 'PGRST116') {
        console.error('[Analytics] ❌ Match error:', matchErr)
        throw matchErr
      }

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

      const ratings: TutorRating[] = completed.map((m: any) => ({
        matchId: m.id,
        tutorName: m.tutors?.user_profiles?.name || 'Tutor',
        subject: m.subject || '-',
        completedSessions: 1,
        existingRating: m.student_rating || null,
        existingReview: m.student_review || null,
      }))

      setTutorRatings(ratings)
      setError(null)
      console.log('[Analytics] ✅ Data loaded:', allMatches.length, 'matches')
    } catch (err) {
      console.error('[Analytics] ❌ Fetch error:', err)
      setError('Gagal memuat data analitik. Data mungkin tidak lengkap.')
    } finally {
      if (isMounted.current) {
        setLoading(false)
        console.log('[Analytics] 🏁 Loading selesai')
      }
    }
  }

  useEffect(() => {
    isMounted.current = true

    // ⏱️ TIMEOUT 3 DETIK - PASTIKAN LOADING BERHENTI
    timeoutId.current = setTimeout(() => {
      if (isMounted.current && loading) {
        console.warn('[Analytics] ⏱️ Timeout 3 detik, force loading=false')
        setLoading(false)
        setError('Waktu pengambilan data habis, tampilkan data kosong.')
      }
    }, 3000)

    fetchData()

    return () => {
      isMounted.current = false
      if (timeoutId.current) clearTimeout(timeoutId.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitRating = async () => {
    if (!selectedMatch || ratingValue === 0) return
    setSubmittingRating(true)
    try {
      const supabase = createClient()
      const { error: updateErr } = await supabase
        .from('matches')
        .update({
          student_rating: ratingValue,
          student_review: reviewText.trim() || null,
        })
        .eq('id', selectedMatch.matchId)

      if (updateErr) throw updateErr

      const { data: matchData } = await supabase
        .from('matches')
        .select('tutor_id')
        .eq('id', selectedMatch.matchId)
        .maybeSingle()

      if (matchData?.tutor_id) {
        const { data: allRatings } = await supabase
          .from('matches')
          .select('student_rating')
          .eq('tutor_id', matchData.tutor_id)
          .not('student_rating', 'is', null)

        if (allRatings && allRatings.length > 0) {
          const avg = allRatings.reduce((s, r) => s + (r.student_rating || 0), 0) / allRatings.length
          await supabase
            .from('tutors')
            .update({ rating: Math.round(avg * 10) / 10, total_reviews: allRatings.length })
            .eq('id', matchData.tutor_id)
        }
      }

      setShowRatingDialog(false)
      setSelectedMatch(null)
      setRatingValue(0)
      setReviewText('')
      
      // Reset fetchDone agar bisa fetch ulang
      fetchDone.current = false
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan penilaian')
    } finally {
      setSubmittingRating(false)
    }
  }

  // ✅ TAMPILKAN LOADING
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner className="h-10 w-10 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat data analitik...</p>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Sesi', value: stats.totalSessions, icon: BookOpen, color: 'text-blue-300', bg: 'bg-blue-500/20' },
    { label: 'Sesi Selesai', value: stats.completedSessions, icon: Award, color: 'text-green-300', bg: 'bg-green-500/20' },
    { label: 'Tutor Aktif', value: stats.activeTutors, icon: Users, color: 'text-purple-300', bg: 'bg-purple-500/20' },
    { label: 'Penyelesaian', value: `${stats.completionRate}%`, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-100' },
  ]

  const unratedMatches = tutorRatings.filter(r => r.existingRating === null)
  const ratedMatches = tutorRatings.filter(r => r.existingRating !== null)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Analitik & Performa</h1>
        <p className="text-muted-foreground">
          Pantau progres belajar dan berikan penilaian kepada tutor Anda.
        </p>
      </div>

      {error && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertDescription className="text-amber-700 text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* ✅ STATS TETAP TAMPIL MESKIPUN KOSONG */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

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
                    <Star
                      key={star}
                      className={`w-6 h-6 ${star <= Math.round(stats.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Berdasarkan {ratedMatches.length} penilaian yang telah Anda berikan
                </p>
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
              {subjects.map((s: string) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
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
          <Alert className="mb-4 bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800 text-sm">
              Penilaian Anda membantu siswa lain menemukan tutor terbaik. Berikan penilaian jujur berdasarkan pengalaman belajar Anda.
            </AlertDescription>
          </Alert>
          <div className="space-y-3">
            {unratedMatches.map(item => (
              <Card key={item.matchId} className="border-l-4 border-l-primary/40">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{item.tutorName}</p>
                      <p className="text-sm text-muted-foreground">{item.subject}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedMatch(item)
                        setRatingValue(0)
                        setReviewText('')
                        setShowRatingDialog(true)
                      }}
                    >
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
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= (item.existingRating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                          />
                        ))}
                        <span className="text-sm font-medium text-foreground ml-1">{item.existingRating}/5</span>
                      </div>
                      {item.existingReview && (
                        <p className="text-sm text-muted-foreground mt-1 italic">"{item.existingReview}"</p>
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

      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Penilaian Kepuasan Belajar</DialogTitle>
            <DialogDescription>
              Beri nilai untuk {selectedMatch?.tutorName} — {selectedMatch?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Skor Kepuasan (1–5 bintang)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRatingValue(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= ratingValue ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {ratingValue > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {['', 'Sangat Tidak Puas', 'Tidak Puas', 'Cukup', 'Puas', 'Sangat Puas'][ratingValue]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Ulasan (opsional)</Label>
              <Textarea
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="Ceritakan pengalaman belajar Anda bersama tutor ini..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowRatingDialog(false)}>
                Batal
              </Button>
              <Button
                className="flex-1"
                disabled={ratingValue === 0 || submittingRating}
                onClick={handleSubmitRating}
              >
                {submittingRating ? 'Menyimpan...' : 'Kirim Penilaian'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}