'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Shield,
  Star,
  Users,
  CheckCircle,
  CheckCircle2,
  TrendingUp,
  Wallet,
  AlertTriangle,
  ThumbsUp,
  Sparkles,
  Info,
  LogIn,
  XCircle,
  History,
} from 'lucide-react'

// ============================================================
// DUMMY — semua kecuali credit, rating, ulasan
// ============================================================
const DUMMY_STATS = {
  totalStudents: 12,
  activeStudents: 3,
  completedContracts: 9,
  sessionsCompleted: 47,
  sessionsMissed: 3,
  totalEarnings: 18400000,
  monthlyEarnings: 2400000,
  avgPerContract: 2044444,
}

// ============================================================
// CREDIT TIERS
// ============================================================
const CREDIT_TIERS = [
  { range: '81-100', label: 'Aman', color: 'bg-green-500', textColor: 'text-green-400', borderColor: 'border-green-500/40', bgColor: 'bg-green-500/10', description: 'Bisa mengakses segala fitur tanpa hambatan.' },
  { range: '66-80', label: 'Pembatasan', color: 'bg-lime-500', textColor: 'text-lime-400', borderColor: 'border-lime-500/40', bgColor: 'bg-lime-500/10', description: 'Menerima siswa maksimal 5× kemudian refresh katalog siswa dibatasi setiap 10 detik sekali.' },
  { range: '51-65', label: 'Waspada', color: 'bg-yellow-500', textColor: 'text-yellow-400', borderColor: 'border-yellow-500/40', bgColor: 'bg-yellow-500/10', description: 'Mengubah profil akan mengalami jeda 2 hari sekali dan maksimal memasang pendapatan hanya Rp 150.000 per sesi.' },
  { range: '26-50', label: 'Hati-hati', color: 'bg-orange-500', textColor: 'text-orange-400', borderColor: 'border-orange-500/40', bgColor: 'bg-orange-500/10', description: 'Katalog siswa dibekukan (tidak bisa mencari siswa sama sekali), biaya admin naik menjadi 20% (dari 10%), dan withdrawal wallet memakan waktu 3 hari sebelum dikirim ke rekening.' },
  { range: '6-25', label: 'Bahaya', color: 'bg-red-500', textColor: 'text-red-400', borderColor: 'border-red-500/40', bgColor: 'bg-red-500/10', description: 'Akun akan otomatis ditahan oleh admin. Tidak bisa menerima siswa baru sama sekali, tidak bisa mengganti profil. Kontrak yang sedang berjalan tetap dilanjutkan sampai selesai.' },
  { range: '0-5', label: 'Blacklist', color: 'bg-black', textColor: 'text-gray-300', borderColor: 'border-gray-500/40', bgColor: 'bg-gray-900/60', description: 'Akun akan di-banned.' },
]

// ============================================================
// CREDIT LOG META
// ============================================================
const REASON_META: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  daily_login: { label: 'Login harian', Icon: LogIn, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  both_ready: { label: 'Sesi dimulai (kedua pihak siap)', Icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/15' },
  session_expired: { label: 'Sesi hangus — tidak klik Siap', Icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15' },
  unilateral_terminate: { label: 'Hentikan kontrak sepihak', Icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/15' },
  admin_adjustment: { label: 'Penyesuaian admin', Icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/15' },
}

// ============================================================
// KOMPONEN
// ============================================================
export default function TutorAnalyticsPage() {
  const { user, userRole } = useAuth()

  const [showSuspendPreview, setShowSuspendPreview] = useState(false)
  const [showCreditInfo, setShowCreditInfo] = useState(false)

  const [data, setData] = useState<{
    creditScore: number
    suspendedUntil: string | null
    isSuspended: boolean
    rating: number
    totalReviews: number
    reviews: Array<{
      id: string
      studentName: string
      rating: number
      comment: string | null
      createdAt: string
    }>
    creditLog: Array<{
      id: string
      delta: number
      balanceAfter: number
      reason: string
      createdAt: string
    }>
  } | null>(null)

  // ===== Fetch semua data analytics =====
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch(
          `/api/tutors/analytics?user_id=${user.id}`,
          { cache: 'no-store' }
        )
        if (!res.ok) {
          console.warn('[analytics] fetch failed:', res.status)
          return
        }
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e) {
        console.error('[analytics] fetch error:', e)
      }
    })()

    return () => { cancelled = true }
  }, [user?.id])

  // ===== GABUNG =====
  const stats = {
    ...DUMMY_STATS,
    creditScore: data?.creditScore ?? 99,
    isSuspended: showSuspendPreview || (data?.isSuspended ?? false),
    suspendedUntil: showSuspendPreview
      ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      : data?.suspendedUntil ?? null,
    rating: data?.rating ?? 0,
    totalReviews: data?.totalReviews ?? 0,
  }

  const reviews = data?.reviews ?? []
  const creditLog = data?.creditLog ?? []

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
      {/* ===== BANNER ===== */}
      <div className="p-3 rounded-md bg-blue-500/5 border border-blue-500/20 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <p className="text-sm text-muted-foreground">
            <strong>Preview Mode</strong> — Credit Score, Log, Rating & Ulasan
            real-time dari database, sisanya dummy.
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
            <div className={`w-10 h-10 rounded-lg ${creditBg} flex items-center justify-center shrink-0`}>
              <Shield className={`w-5 h-5 ${creditColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm text-muted-foreground">Credit Score</p>
                <button
                  type="button"
                  onClick={() => setShowCreditInfo(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Info tingkatan credit score"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className={`text-2xl font-bold ${creditColor}`}>
                {stats.creditScore}
                <span className="text-sm text-muted-foreground font-normal">/100</span>
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
                <span className="text-sm text-muted-foreground font-normal"> / 5</span>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-500" />
              Pendapatan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
              <p className="text-sm text-muted-foreground mb-1">Total Pendapatan</p>
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
                <p className="text-xs text-muted-foreground mb-1">Rata-rata/Kontrak</p>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Aktivitas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Kontrak Selesai</span>
              <span className="text-sm font-bold text-green-300">{stats.completedContracts}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Kontrak Aktif</span>
              <span className="text-sm font-bold text-blue-300">{stats.activeStudents}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Sesi Berhasil</span>
              <span className="text-sm font-bold text-green-300">{stats.sessionsCompleted}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Sesi Hangus</span>
              <span className="text-sm font-bold text-red-300">{stats.sessionsMissed}</span>
            </div>

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

      {/* ===== CREDIT LOG ===== */}
      <Card>
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
              <p className="text-sm text-muted-foreground">
                Belum ada riwayat perubahan credit.
              </p>
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto pr-2 divide-y divide-border/30">
              {creditLog.map((entry) => {
                const meta = REASON_META[entry.reason] ?? {
                  label: entry.reason,
                  Icon: Shield,
                  color: 'text-muted-foreground',
                  bg: 'bg-muted/20',
                }
                const Icon = meta.Icon
                const positive = entry.delta > 0

                return (
                  <div key={entry.id} className="flex items-center gap-3 py-3">
                    <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {meta.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {entry.createdAt
                          ? new Date(entry.createdAt).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${positive ? 'text-green-400' : 'text-red-400'}`}>
                        {positive ? '+' : ''}{entry.delta}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        → {entry.balanceAfter}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== ULASAN ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-yellow-500" />
            Ulasan dari Murid
            {reviews.length > 0 && (
              <Badge variant="outline" className="ml-2">{reviews.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="py-8 text-center">
              <ThumbsUp className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Belum ada ulasan dari murid.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="p-3 rounded-md border border-border bg-muted/10">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm truncate">
                      {r.studentName}
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
                    {new Date(r.createdAt).toLocaleDateString('id-ID', {
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

      {/* ===== DIALOG INFO CREDIT SCORE ===== */}
      <Dialog open={showCreditInfo} onOpenChange={setShowCreditInfo}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Tingkatan Credit Score
            </DialogTitle>
            <DialogDescription>
              Setiap tingkatan memiliki konsekuensi berbeda. Jaga credit score
              Anda untuk tetap mengakses semua fitur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-2">
            {CREDIT_TIERS.map((tier) => (
              <div
                key={tier.range}
                className={`p-3 rounded-md border ${tier.borderColor} ${tier.bgColor}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                  <span className={`font-bold text-sm ${tier.textColor}`}>{tier.range}</span>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${tier.textColor}`}>
                    — {tier.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                  {tier.description}
                </p>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-md bg-muted/20 border border-border mt-2">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Cara menaikkan credit:</strong> Login harian (+1),
              menyelesaikan sesi belajar (+2).
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ⚠️ <strong>Pengurangan:</strong> Sesi hangus (−7), hentikan
              kontrak sepihak (−40).
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}