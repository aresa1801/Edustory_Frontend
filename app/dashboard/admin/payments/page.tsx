'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PageHeader, StatCard } from '@/components/dashboard/ui'
import { createClient } from '@/lib/auth'
import {
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  QrCode,
  Smartphone,
  Building2,
  TrendingUp,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_status: string
  created_at: string
  paid_at: string | null
  notes: string | null
  transaction_ref: string | null
  students: { user_profiles: { name: string; email: string } | null } | null
  tutors: { user_profiles: { name: string } | null } | null
  matches: { subject: string } | null
}

interface Stats {
  total: number
  totalAmount: number
  pending: number
  paid: number
  rejected: number
  byMethod: Record<string, number>
  revenueByMethod: Record<string, number>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Menunggu', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  paid: { label: 'Lunas', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  expired: { label: 'Kedaluwarsa', color: 'bg-muted text-muted-foreground border-border', icon: Clock },
  refunded: { label: 'Dikembalikan', color: 'bg-primary/10 text-primary border-primary/20', icon: RefreshCw },
}

const METHOD_ICON: Record<string, React.ElementType> = {
  qris: QrCode,
  gopay: Smartphone,
  ovo: Smartphone,
  dana: Smartphone,
  shopeepay: Smartphone,
  linkaja: Smartphone,
  bca: Building2,
  bni: Building2,
  bri: Building2,
  mandiri: Building2,
  permata: Building2,
  cimb: Building2,
}

function computeStats(payments: Payment[]): Stats {
  const stats: Stats = {
    total: payments.length,
    totalAmount: 0,
    pending: 0,
    paid: 0,
    rejected: 0,
    byMethod: {},
    revenueByMethod: {},
  }
  for (const p of payments) {
    if (p.payment_status === 'pending') stats.pending++
    if (p.payment_status === 'paid') { stats.paid++; stats.totalAmount += p.amount }
    if (p.payment_status === 'rejected') stats.rejected++
    stats.byMethod[p.payment_method] = (stats.byMethod[p.payment_method] || 0) + 1
    if (p.payment_status === 'paid') {
      stats.revenueByMethod[p.payment_method] =
        (stats.revenueByMethod[p.payment_method] || 0) + p.amount
    }
  }
  return stats
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterMethod, setFilterMethod] = useState<string>('all')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error: err } = await supabase
        .from('payment_deposits')
        .select(`
          id,
          amount,
          payment_method,
          payment_status,
          created_at,
          paid_at,
          notes,
          transaction_ref,
          students:student_id(user_profiles:user_id(name, email)),
          tutors:tutor_id(user_profiles:user_id(name)),
          matches:match_id(subject)
        `)
        .order('created_at', { ascending: false })

      if (err) throw err
      setPayments((data || []) as any[])
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data pembayaran')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const handleAction = async (paymentId: string, status: 'paid' | 'rejected') => {
    setConfirmingId(paymentId)
    setActionError(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/payments/confirm', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ paymentId, status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal update status')
      // Update local state
      setPayments(prev =>
        prev.map(p => p.id === paymentId ? { ...p, payment_status: status, paid_at: status === 'paid' ? new Date().toISOString() : p.paid_at } : p)
      )
    } catch (e: any) {
      setActionError(e.message)
    } finally {
      setConfirmingId(null)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>

  const stats = computeStats(payments)

  const filtered = payments.filter(p => {
    if (filterStatus !== 'all' && p.payment_status !== filterStatus) return false
    if (filterMethod !== 'all' && p.payment_method !== filterMethod) return false
    return true
  })

  const uniqueMethods = Array.from(new Set(payments.map(p => p.payment_method)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Admin"
        title="Laporan Pembayaran"
        description="Kelola dan verifikasi pembayaran siswa — QRIS, E-Money, dan Transfer Bank."
      />

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Lunas"
          value={`Rp ${stats.totalAmount.toLocaleString('id-ID')}`}
          tone="secondary"
          icon={DollarSign}
        />
        <StatCard label="Menunggu" value={stats.pending} tone="accent" icon={Clock} />
        <StatCard label="Lunas" value={stats.paid} tone="secondary" icon={CheckCircle2} />
        <StatCard label="Total Transaksi" value={stats.total} tone="primary" icon={TrendingUp} />
      </div>

      {/* Revenue by method */}
      {Object.keys(stats.revenueByMethod).length > 0 && (
        <Card className="rounded-2xl border-border shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Pendapatan per Metode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.revenueByMethod)
                .sort(([, a], [, b]) => b - a)
                .map(([method, amount]) => {
                  const Icon = METHOD_ICON[method] || DollarSign
                  return (
                    <div key={method} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground capitalize">{method.toUpperCase()}</span>
                        <span className="text-xs text-muted-foreground">({stats.byMethod[method]} transaksi)</span>
                      </div>
                      <span className="text-sm font-semibold text-success">
                        Rp {amount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="rounded-2xl border-border shadow-soft">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground font-medium">Status:</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-xs border border-border rounded-xl px-2.5 py-1.5 bg-card text-foreground"
              >
                <option value="all">Semua</option>
                <option value="pending">Menunggu</option>
                <option value="paid">Lunas</option>
                <option value="rejected">Ditolak</option>
                <option value="expired">Kedaluwarsa</option>
                <option value="refunded">Dikembalikan</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground font-medium">Metode:</label>
              <select
                value={filterMethod}
                onChange={e => setFilterMethod(e.target.value)}
                className="text-xs border border-border rounded-xl px-2.5 py-1.5 bg-card text-foreground"
              >
                <option value="all">Semua</option>
                {uniqueMethods.map(m => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {actionError && (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Payment list */}
      <Card className="rounded-2xl border-border shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground">
            Daftar Pembayaran ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Tidak ada data pembayaran.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => {
                const cfg = STATUS_MAP[p.payment_status] || STATUS_MAP.pending
                const Icon = cfg.icon
                const MethodIcon = METHOD_ICON[p.payment_method] || DollarSign
                const studentName = (p.students as any)?.user_profiles?.name || '—'
                const studentEmail = (p.students as any)?.user_profiles?.email || ''
                const tutorName = (p.tutors as any)?.user_profiles?.name || '—'
                const subject = p.matches?.subject || '—'
                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl border border-border hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">
                            Rp {Number(p.amount).toLocaleString('id-ID')}
                          </p>
                          <Badge className={`${cfg.color} rounded-full text-xs flex items-center gap-1`}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MethodIcon className="w-3.5 h-3.5" />
                            <span className="uppercase">{p.payment_method}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Siswa: <span className="font-medium text-foreground">{studentName}</span>
                          {studentEmail && <span className="text-muted-foreground/70"> · {studentEmail}</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Tutor: <span className="font-medium text-foreground">{tutorName}</span>
                          {subject !== '—' && <span> · {subject}</span>}
                        </p>
                        {p.transaction_ref && (
                          <p className="text-xs text-muted-foreground/70 font-mono">{p.transaction_ref}</p>
                        )}
                        <p className="text-xs text-muted-foreground/70">
                          {new Date(p.created_at).toLocaleString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                          {p.paid_at && (
                            <span className="ml-2 text-success">
                              · Lunas: {new Date(p.paid_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Action buttons — only for pending payments */}
                      {p.payment_status === 'pending' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={confirmingId === p.id}
                            onClick={() => handleAction(p.id, 'rejected')}
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            {confirmingId === p.id ? <Spinner className="w-3 h-3" /> : <XCircle className="w-4 h-4" />}
                            <span className="ml-1 hidden sm:inline">Tolak</span>
                          </Button>
                          <Button
                            size="sm"
                            disabled={confirmingId === p.id}
                            onClick={() => handleAction(p.id, 'paid')}
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                          >
                            {confirmingId === p.id ? <Spinner className="w-3 h-3" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span className="ml-1 hidden sm:inline">Konfirmasi</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
