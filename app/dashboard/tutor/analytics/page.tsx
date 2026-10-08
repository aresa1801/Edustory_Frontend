'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PageHeader, StatCard, EmptyState, SectionCard } from '@/components/dashboard/ui'
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
// DUMMY — hanya Pendapatan + Kontrak Aktif yang masih dummy
// ============================================================
const DUMMY_STATS = {
  // dummy
  dummyActiveContracts: 3,
  totalEarnings: 18400000,
  monthlyEarnings: 2400000,
  avgPerContract: 2044444,

  // fallback kalau fetch gagal
  totalStudents: 12,
  completedContracts: 9,
  sessionsCompleted: 47,
  sessionsMissed: 3,
}

// ============================================================
// CREDIT TIERS
// ============================================================
const CREDIT_TIERS = [
  { range: '81-100', label: 'Aman', color: 'bg-secondary', textColor: 'text-secondary', borderColor: 'border-secondary/20', bgColor: 'bg-secondary/10', description: 'Bisa mengakses segala fitur tanpa hambatan.' },
  { range: '66-80', label: 'Pembatasan', color: 'bg-primary', textColor: 'text-primary', borderColor: 'border-primary/25', bgColor: 'bg-primary/10', description: 'Menerima siswa maksimal 5× kemudian refresh katalog siswa dibatasi setiap 10 detik sekali.' },
  { range: '51-65', label: 'Waspada', color: 'bg-accent', textColor: 'text-accent', borderColor: 'border-accent/40', bgColor: 'bg-accent/10', description: 'Mengubah profil akan mengalami jeda 2 hari sekali dan maksimal memasang pendapatan hanya Rp 150.000 per sesi.' },
  { range: '26-50', label: 'Hati-hati', color: 'bg-warning', textColor: 'text-warning', borderColor: 'border-warning/40', bgColor: 'bg-warning/10', description: 'Katalog siswa dibekukan (tidak bisa mencari siswa sama sekali), biaya admin naik menjadi 20% (dari 10%), dan withdrawal wallet memakan waktu 3 hari sebelum dikirim ke rekening.' },
  { range: '6-25', label: 'Bahaya', color: 'bg-destructive', textColor: 'text-destructive', borderColor: 'border-destructive/25', bgColor: 'bg-destructive/10', description: 'Akun akan otomatis ditahan oleh admin. Tidak bisa menerima siswa baru sama sekali, tidak bisa mengganti profil. Kontrak yang sedang berjalan tetap dilanjutkan sampai selesai.' },
  { range: '0-5', label: 'Blacklist', color: 'bg-foreground', textColor: 'text-muted-foreground', borderColor: 'border-border', bgColor: 'bg-muted/40', description: 'Akun akan di-banned.' },
]

// ============================================================
// CREDIT LOG META
// ============================================================
const REASON_META: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  daily_login: { label: 'Login harian', Icon: LogIn, color: 'text-primary', bg: 'bg-primary/15' },
  both_ready: { label: 'Sesi dimulai (kedua pihak siap)', Icon: CheckCircle2, color: 'text-secondary', bg: 'bg-secondary/15' },
  session_expired: { label: 'Sesi hangus — tidak klik Siap', Icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/15' },
  unilateral_terminate: { label: 'Hentikan kontrak sepihak', Icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/15' },
  admin_adjustment: { label: 'Penyesuaian admin', Icon: Shield, color: 'text-primary', bg: 'bg-primary/15' },
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
    stats?: {
      totalStudents: number
      activeContracts: number
      sessionsCompleted: number
      sessionsMissed: number
      completedContracts: number
    }
  } | null>(null)

      // ===== Fetch semua data analytics =====
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    const fetchAnalytics = async () => {
      console.log('[analytics] FETCH — start')
      try {
        const res = await fetch(
          `/api/tutors/analytics-v2?user_id=${user.id}&_t=${Date.now()}`,
          {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
          }
        )
        console.log('[analytics] FETCH — status:', res.status)

        if (!res.ok) {
          console.warn('[analytics] FETCH — not ok, skip')
          return
        }

        const json = await res.json()
        console.log('[analytics] FETCH — data:', {
          creditScore: json.creditScore,
          logCount: json.creditLog?.length,
          reviewCount: json.reviews?.length,
        })

        if (cancelled) {
          console.log('[analytics] FETCH — cancelled, gak setData')
          return
        }

        console.log('[analytics] setData dipanggil')
        setData(json)
      } catch (e) {
        console.error('[analytics] FETCH — error:', e)
      }
    }

    fetchAnalytics()

    const handler = () => {
      console.log('[analytics] event credit-updated diterima')
      fetchAnalytics()
    }
    window.addEventListener('credit-updated', handler)

    return () => {
      console.log('[analytics] cleanup')
      cancelled = true
      window.removeEventListener('credit-updated', handler)
    }
  }, [user?.id])

  // ===== GABUNG =====
  const stats = {
    // REAL dari DB
    creditScore: data?.creditScore ?? 99,
    isSuspended: showSuspendPreview || (data?.isSuspended ?? false),
    suspendedUntil: showSuspendPreview
      ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      : data?.suspendedUntil ?? null,
    rating: data?.rating ?? 0,
    totalReviews: data?.totalReviews ?? 0,
    totalStudents: data?.stats?.totalStudents ?? DUMMY_STATS.totalStudents,
    activeContracts: data?.stats?.activeContracts ?? 0,
    completedContracts: data?.stats?.completedContracts ?? DUMMY_STATS.completedContracts,
    sessionsCompleted: data?.stats?.sessionsCompleted ?? DUMMY_STATS.sessionsCompleted,
    sessionsMissed: data?.stats?.sessionsMissed ?? DUMMY_STATS.sessionsMissed,

    // DUMMY murni
    dummyActiveContracts: DUMMY_STATS.dummyActiveContracts,
    totalEarnings: DUMMY_STATS.totalEarnings,
    monthlyEarnings: DUMMY_STATS.monthlyEarnings,
    avgPerContract: DUMMY_STATS.avgPerContract,
  }

  const reviews = data?.reviews ?? []
  const creditLog = data?.creditLog ?? []

  const successRate =
    stats.sessionsCompleted + stats.sessionsMissed > 0
      ? Math.round(
          (stats.sessionsCompleted /
            (stats.sessionsCompleted + stats.sessionsMissed)) *
            100
        )
      : 0

  // ===== Credit color =====
  const creditColor =
    stats.creditScore >= 80
      ? 'text-secondary'
      : stats.creditScore >= 50
      ? 'text-accent'
      : 'text-destructive'
  const creditBg =
    stats.creditScore >= 80
      ? 'bg-secondary/10'
      : stats.creditScore >= 50
      ? 'bg-accent/15'
      : 'bg-destructive/10'

  return (
    <div className="space-y-6">
      {/* ===== BANNER ===== */}
      <div className="p-3 rounded-md bg-primary/5 border border-primary/20 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            <strong>Preview Mode</strong> — Credit, Log, Rating, Ulasan, Total Murid, Sesi, & Kontrak Selesai real dari database; Pendapatan & Kontrak Aktif dummy.
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
      <PageHeader
        eyebrow="Area Pengajar"
        title="Analitik Saya"
        description="Ringkasan performa mengajar Anda di EduStory."
      />

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Credit Score */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${creditBg} flex items-center justify-center shrink-0`}>
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
        <StatCard
          label="Rating"
          value={<>{stats.rating.toFixed(1)}<span className="text-sm text-muted-foreground font-normal"> / 5</span></>}
          hint={`${stats.totalReviews} ulasan`}
          icon={Star}
          tone="accent"
        />

        {/* Total Murid — REAL */}
        <StatCard
          label="Total Murid"
          value={stats.totalStudents}
          hint={`${stats.activeContracts} aktif`}
          icon={Users}
          tone="primary"
        />

        {/* Sesi Selesai — REAL */}
        <StatCard
          label="Sesi Selesai"
          value={stats.sessionsCompleted}
          hint={`${stats.sessionsMissed} hangus`}
          icon={CheckCircle}
          tone="secondary"
        />
      </div>

      {/* ===== PENDAPATAN + AKTIVITAS ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pendapatan — MASIH DUMMY */}
        <SectionCard
          title={<span className="flex items-center gap-2"><Wallet className="w-5 h-5 text-secondary" />Pendapatan</span>}
          bodyClassName="space-y-4"
        >
            <div className="p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20">
              <p className="text-sm text-muted-foreground mb-1">Total Pendapatan</p>
              <p className="text-3xl font-bold text-secondary">
                Rp {stats.totalEarnings.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted/20 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Bulan Ini</p>
                <p className="text-lg font-semibold text-foreground">
                  Rp {stats.monthlyEarnings.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/20 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Rata-rata/Kontrak</p>
                <p className="text-lg font-semibold text-foreground">
                  Rp {stats.avgPerContract.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              *Data dummy — angka real akan muncul setelah wallet selesai
            </p>
        </SectionCard>

        {/* Aktivitas — Kontrak Selesai & Sesi REAL, Kontrak Aktif DUMMY */}
        <SectionCard
          title={<span className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Aktivitas</span>}
          bodyClassName="space-y-3"
        >
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Kontrak Selesai</span>
              <span className="text-sm font-bold text-secondary">
                {stats.completedContracts}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Kontrak Aktif</span>
              <span className="text-sm font-bold text-primary">
                {stats.dummyActiveContracts}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Sesi Berhasil</span>
              <span className="text-sm font-bold text-secondary">
                {stats.sessionsCompleted}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Sesi Hangus</span>
              <span className="text-sm font-bold text-destructive">
                {stats.sessionsMissed}
              </span>
            </div>

            <div className="pt-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-semibold">{successRate}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-secondary to-secondary"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>
        </SectionCard>
      </div>

      {/* ===== CREDIT LOG ===== */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Riwayat Credit Score
            {creditLog.length > 0 && (
              <Badge variant="outline" className="ml-2">{creditLog.length}</Badge>
            )}
          </span>
        }
      >
          {creditLog.length === 0 ? (
            <EmptyState
              icon={History}
              title="Belum ada riwayat"
              description="Belum ada riwayat perubahan credit."
            />
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
                      <p className={`text-sm font-bold ${positive ? 'text-secondary' : 'text-destructive'}`}>
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
      </SectionCard>

      {/* ===== ULASAN ===== */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-accent" />
            Ulasan dari Murid
            {reviews.length > 0 && (
              <Badge variant="outline" className="ml-2">{reviews.length}</Badge>
            )}
          </span>
        }
      >
          {reviews.length === 0 ? (
            <EmptyState
              icon={ThumbsUp}
              title="Belum ada ulasan"
              description="Belum ada ulasan dari murid."
            />
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
                              ? 'text-accent fill-current'
                              : 'text-muted-foreground'
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
      </SectionCard>

      {/* ===== DIALOG INFO CREDIT SCORE ===== */}
      <Dialog open={showCreditInfo} onOpenChange={setShowCreditInfo}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-secondary" />
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