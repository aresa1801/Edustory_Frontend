'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Shield,
  Star,
  Users,
  CheckCircle,
  TrendingUp,
  Wallet,
  AlertTriangle,
  ThumbsUp,
  Sparkles,
} from 'lucide-react'

// ============================================================
// DUMMY DATA — untuk preview layout
// ============================================================
const DUMMY_STATS = {
  creditScore: 88,
  isSuspended: false,
  suspendedUntil: null as string | null,
  rating: 4.6,
  totalReviews: 24,
  totalStudents: 12,
  activeStudents: 3,
  completedContracts: 9,
  sessionsCompleted: 47,
  sessionsMissed: 3,
  totalEarnings: 18400000,
  monthlyEarnings: 2400000,
  avgPerContract: 2044444,
}

const DUMMY_REVIEWS = [
  {
    id: '1',
    student_name: 'Anaxa',
    rating: 5,
    comment: 'Gurunya sabar dan cara mengajarnya mudah dipahami!',
    created_at: '2026-09-20T10:00:00Z',
  },
  {
    id: '2',
    student_name: 'Rahma',
    rating: 5,
    comment: 'Materi dijelaskan runtut dan latihan soalnya banyak.',
    created_at: '2026-09-15T10:00:00Z',
  },
  {
    id: '3',
    student_name: 'Bagas',
    rating: 4,
    comment: 'Cukup bagus, tapi kadang agak terlalu cepat.',
    created_at: '2026-09-10T10:00:00Z',
  },
  {
    id: '4',
    student_name: 'Sinta',
    rating: 5,
    comment: 'Very recommended! Saya jadi lebih paham Sejarah.',
    created_at: '2026-09-05T10:00:00Z',
  },
  {
    id: '5',
    student_name: 'Dimas',
    rating: 4,
    comment: null,
    created_at: '2026-08-28T10:00:00Z',
  },
  {
    id: '6',
    student_name: 'Laras',
    rating: 5,
    comment: 'Penjelasan detail, sering kasih tips ngerjain soal cepat.',
    created_at: '2026-08-20T10:00:00Z',
  },
]

// ============================================================
// KOMPONEN
// ============================================================
export default function TutorAnalyticsPage() {
  // Dummy: pakai state biar bisa toggle preview suspend
  const [showSuspendPreview, setShowSuspendPreview] = useState(false)

  const stats = {
    ...DUMMY_STATS,
    isSuspended: showSuspendPreview,
    suspendedUntil: showSuspendPreview
      ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      : null,
  }

  const reviews = DUMMY_REVIEWS

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
      {/* ===== BANNER DUMMY ===== */}
      <div className="p-3 rounded-md bg-blue-500/5 border border-blue-500/20 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <p className="text-sm text-muted-foreground">
            <strong>Preview Mode</strong> — data dummy, tabel belum ada.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowSuspendPreview(!showSuspendPreview)}
          className="h-7 text-xs"
        >
          {showSuspendPreview ? 'Sembunyikan' : 'Tampilkan'} Preview Suspend
        </Button>
      </div>

      {/* ===== HEADER ===== */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Analitik Saya</h1>
        <p className="text-muted-foreground">
          Ringkasan performa mengajar Anda di EduStory.
        </p>
      </div>

      {/* ===== BANNER SUSPEND ===== */}
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

      {/* ===== STAT CARDS ===== */}
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

      {/* ===== PENDAPATAN + AKTIVITAS ===== */}
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
              *Data dummy — angka real akan muncul setelah wallet selesai
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

            {/* Progress bar sesi */}
            <div className="pt-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-semibold">
                  {Math.round(
                    (stats.sessionsCompleted /
                      (stats.sessionsCompleted + stats.sessionsMissed)) *
                      100
                  )}
                  %
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                  style={{
                    width: `${Math.round(
                      (stats.sessionsCompleted /
                        (stats.sessionsCompleted + stats.sessionsMissed)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== ULASAN ===== */}
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
        </CardContent>
      </Card>
    </div>
  )
}