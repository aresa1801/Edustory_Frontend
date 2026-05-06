'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  pending: { label: 'Menunggu', color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800', icon: Clock },
  paid: { label: 'Lunas', color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800', icon: XCircle },
  expired: { label: 'Kedaluwarsa', color: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700', icon: Clock },
  refunded: { label: 'Dikembalikan', color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: RefreshCw },
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
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-foreground mb-1">Laporan Pembayaran</h1>
        <p className="text-slate-500 dark:text-muted-foreground text-sm">
          Kelola dan verifikasi pembayaran siswa — QRIS, E-Money, dan Transfer Bank.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-gray-400">Total Lunas</p>
              <p className="text-lg font-bold text-slate-800 dark:text-foreground">Rp {stats.totalAmount.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-slate-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-gray-400">Menunggu</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-slate-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-gray-400">Lunas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.paid}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 border-slate-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-gray-400">Total Transaksi</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-foreground">{stats.total}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue by method */}
      {Object.keys(stats.revenueByMethod).length > 0 && (
        <Card className="border-slate-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-800 dark:text-gray-100">Pendapatan per Metode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.revenueByMethod)
                .sort(([, a], [, b]) => b - a)
                .map(([method, amount]) => {
                  const Icon = METHOD_ICON[method] || DollarSign
                  return (
                    <div key={method} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-gray-800 last:border-0">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-400 dark:text-gray-500" />
                        <span className="text-sm text-slate-700 dark:text-gray-200 capitalize">{method.toUpperCase()}</span>
                        <span className="text-xs text-slate-400 dark:text-gray-500">({stats.byMethod[method]} transaksi)</span>
                      </div>
                      <span className="text-sm font-semibold text-green-700 dark:text-green-400">
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
      <Card className="border-slate-200 dark:border-gray-700">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 dark:text-gray-400 font-medium">Status:</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-xs border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-200"
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
              <label className="text-xs text-slate-500 dark:text-gray-400 font-medium">Metode:</label>
              <select
                value={filterMethod}
                onChange={e => setFilterMethod(e.target.value)}
                className="text-xs border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-200"
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
      <Card className="border-slate-200 dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800 dark:text-gray-100">
            Daftar Pembayaran ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-8">Tidak ada data pembayaran.</p>
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
                    className="p-4 rounded-xl border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800 dark:text-foreground">
                            Rp {Number(p.amount).toLocaleString('id-ID')}
                          </p>
                          <Badge className={`${cfg.color} text-xs flex items-center gap-1`}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-gray-400">
                            <MethodIcon className="w-3.5 h-3.5" />
                            <span className="uppercase">{p.payment_method}</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-muted-foreground">
                          Siswa: <span className="font-medium">{studentName}</span>
                          {studentEmail && <span className="text-slate-400 dark:text-gray-500"> · {studentEmail}</span>}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-muted-foreground">
                          Tutor: <span className="font-medium">{tutorName}</span>
                          {subject !== '—' && <span> · {subject}</span>}
                        </p>
                        {p.transaction_ref && (
                          <p className="text-xs text-slate-400 dark:text-gray-500 font-mono">{p.transaction_ref}</p>
                        )}
                        <p className="text-xs text-slate-400 dark:text-gray-500">
                          {new Date(p.created_at).toLocaleString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                          {p.paid_at && (
                            <span className="ml-2 text-green-600 dark:text-green-400">
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
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {confirmingId === p.id ? <Spinner className="w-3 h-3" /> : <XCircle className="w-4 h-4" />}
                            <span className="ml-1 hidden sm:inline">Tolak</span>
                          </Button>
                          <Button
                            size="sm"
                            disabled={confirmingId === p.id}
                            onClick={() => handleAction(p.id, 'paid')}
                            className="bg-green-600 hover:bg-green-700 text-white"
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
