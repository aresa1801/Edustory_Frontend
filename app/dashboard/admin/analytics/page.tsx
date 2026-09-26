'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/auth'
import {
  Shield,
  Star,
  Users,
  CheckCircle,
  TrendingUp,
  Wallet,
  AlertTriangle,
  ThumbsUp,
  Calendar,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
interface TutorStats {
  creditScore: number
  isSuspended: boolean
  suspendedUntil: string | null
  rating: number
  totalReviews: number
  totalStudents: number
  activeStudents: number
  completedContracts: number
  sessionsCompleted: number
  sessionsMissed: number
  totalEarnings: number
  monthlyEarnings: number
  avgPerContract: number
}

interface ReviewItem {
  id: string
  student_name: string
  rating: number
  comment: string | null
  created_at: string
}

// ============================================================
// KOMPONEN
// ============================================================
export default function TutorAnalyticsPage() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<TutorStats | null>(null)
  const [reviews, setReviews] = useState<ReviewItem[]>([])

  useEffect(() => {
    const fetchAll = async () => {
      if (!authUser) return
      try {
        const supabase = createClient()

        // ===== 1. Profil tutor =====
        const { data: tutor, error: tutorErr } = await supabase
          .from('tutors')
          .select('*')
          .eq('user_id', authUser.id)
          .single()

        if (tutorErr || !tutor) {
          throw new Error('Profil tutor tidak ditemukan')
        }

        // ===== 2. Semua match tutor =====
        const { data: matches } = await supabase
          .from('matches')
          .select(
            'id, status, student_budget_per_month, accepted_at, contract_end_date, ended_at, student_id'
          )
          .eq('tutor_id', tutor.id)

        const allMatches = matches || []
        const completed = allMatches.filter((m) => m.status === 'completed')
        const active = allMatches.filter(
          (m) => m.status === 'active' || m.status === 'matched'
        )

        const matchIds = allMatches.map((m) => m.id)
        const studentIds = new Set(allMatches.map((m) => m.student_id))

        // ===== 3. Sessions =====
        const { data: sessions } = matchIds.length > 0
          ? await supabase
              .from('sessions')
              .select('id, match_id, started_at, cancelled_at, scheduled_at')
              .in('match_id', matchIds)
          : { data: [] as any[] }

        const allSessions = sessions || []
        const sessionsCompleted = allSessions.filter((s: any) => s.started_at).length
        const sessionsMissed = allSessions.filter(
          (s: any) => s.cancelled_at && !s.started_at
        ).length

        // ===== 4. Reviews =====
        const { data: reviewData } = matchIds.length > 0
          ? await supabase
              .from('reviews')
              .select(
                `
                id,
                rating,
                comment,
                created_at,
                students!inner(name)
              `
              )
              .in('match_id', matchIds)
              .order('created_at', { ascending: false })
              .limit(30)
          : { data: [] as any[] }

        const mappedReviews: ReviewItem[] = (reviewData || []).map((r: any) => ({
          id: r.id,
          student_name: r.students?.name || 'Siswa',
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
        }))

        // ===== 5. Pendapatan =====
        // Estimasi kasar: nilai kontrak per bulan × kontrak selesai
        const totalEarnings = completed.reduce(
          (sum, m) => sum + (m.student_budget_per_month || 0),
          0
        )

        const now = new Date()
        const monthlyEarnings = completed
          .filter((m) => {
            const end = m.ended_at
              ? new Date(m.ended_at)
              : m.contract_end_date
              ? new Date(m.contract_end_date)
              : null
            return (
              end &&
              end.getMonth() === now.getMonth() &&
              end.getFullYear() === now.getFullYear()
            )
          })
          .reduce((sum, m) => sum + (m.student_budget_per_month || 0), 0)

        const avgPerContract =
          completed.length > 0 ? Math.round(totalEarnings / completed.length) : 0

        // ===== 6. Credit + Suspend =====
        const creditScore = tutor.credit_score ?? 100
        const suspendedUntil = tutor.suspended_until || null
        const isSuspended = suspendedUntil
          ? new Date(suspendedUntil) > new Date()
          : false

        setStats({
          creditScore,
          isSuspended,
          suspendedUntil,
          rating: tutor.rating || 0,
          totalReviews: tutor.total_reviews || 0,
          totalStudents: studentIds.size,
          activeStudents: active.length,
          completedContracts: completed.length,
          sessionsCompleted,
          sessionsMissed,
          totalEarnings,
          monthlyEarnings,
          avgPerContract,
        })

        setReviews(mappedReviews)
      } catch (err: any) {
        console.error('[TutorAnalytics] Error:', err)
        setError(err.message || 'Gagal memuat analitik')
      } finally {
        setLoading(false)
      }
    }

    if (authLoading) return
    if (!authUser) {
      setLoading(false)
      return
    }
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, authLoading])

  // ===== Loading =====
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
        <span className="ml-3 text-muted-foreground">Memuat analitik...</span>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || 'Data tidak ditemukan'}</AlertDescription>
      </Alert>
    )
  }

  // ===== Credit color =====
  const creditColor =
    stats.creditScore >= 80
      ? 'text-green-400'
      : stats.creditScore >= 50
      ? 'text-yellow-400'
      : 'text-red-400'
  const creditBg =
    stats.creditScore >= 80
      ? 'bg-green-500/20'
      : stats.creditScore >= 50
      ? 'bg-yellow-500/20'
      : 'bg-red-500/20'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Analitik Saya</h1>
        <p className="text-muted-foreground">
          Ringkasan performa mengajar Anda di EduStory.
        </p>
      </div>

      {/* Banner Suspend */}
      {stats.isSuspended && stats.suspendedUntil && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Akun Anda sedang <strong>tersuspend</strong> sampai{' '}
            <strong>
              {new Date(stats.suspendedUntil).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </strong>
            . Anda tidak bisa menerima siswa baru selama periode ini, tapi
            kontrak yang sedang berjalan tetap bisa dijalankan.
          </AlertDescription>
        </Alert>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Credit Score */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg ${creditBg} flex items-center justify-center`}
            >
              <Shield className={`w-5 h-5 ${creditColor}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Credit Score</p>
              <p className={`text-2xl font-bold ${creditColor}`}>
                {stats.creditScore}
                <span className="text-sm text-muted-foreground font-normal">
                  /100
                </span>
              </p>
            </div>
          </div>
        </Card>

        {/* Rating */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rating</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.rating.toFixed(1)}
                <span className="text-sm text-muted-foreground font-normal">
                  {' '}
                  / 5
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.totalReviews} ulasan
              </p>
            </div>
          </div>
        </Card>

        {/* Total Murid */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Murid</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.totalStudents}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.activeStudents} aktif
              </p>
            </div>
          </div>
        </Card>

        {/* Sesi Selesai */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-300" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sesi Selesai</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.sessionsCompleted}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.sessionsMissed} hangus
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Row: Pendapatan + Aktivitas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pendapatan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-500" />
              Pendapatan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
              <p className="text-sm text-muted-foreground mb-1">
                Total Pendapatan
              </p>
              <p className="text-3xl font-bold text-emerald-300">
                Rp {stats.totalEarnings.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-muted/20 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Bulan Ini</p>
                <p className="text-lg font-semibold text-foreground">
                  Rp {stats.monthlyEarnings.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-3 rounded-md bg-muted/20 border border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  Rata-rata/Kontrak
                </p>
                <p className="text-lg font-semibold text-foreground">
                  Rp {stats.avgPerContract.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              *Estimasi dari nilai kontrak yang sudah selesai
            </p>
          </CardContent>
        </Card>

        {/* Aktivitas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Aktivitas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">
                Kontrak Selesai
              </span>
              <span className="text-sm font-bold text-green-300">
                {stats.completedContracts}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">
                Kontrak Aktif
              </span>
              <span className="text-sm font-bold text-blue-300">
                {stats.activeStudents}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Sesi Berhasil</span>
              <span className="text-sm font-bold text-green-300">
                {stats.sessionsCompleted}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Sesi Hangus</span>
              <span className="text-sm font-bold text-red-300">
                {stats.sessionsMissed}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ulasan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-yellow-500" />
            Ulasan dari Murid
            {reviews.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {reviews.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <ThumbsUp className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground italic">
                Belum ada ulasan dari murid.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-md border border-border bg-muted/10"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm truncate">
                      {r.student_name}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i <= r.rating
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-500'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {r.comment ? (
                    <p className="text-sm text-muted-foreground italic">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">
                      (tanpa komentar)
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground/60 mt-2">
                    {new Date(r.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}