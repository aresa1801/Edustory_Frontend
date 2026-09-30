'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/auth'
import {
  Wallet,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Receipt,
  History,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
interface TopUpHistory {
  id: string
  amount: number
  payment_method: string
  payment_status: string
  created_at: string
  transaction_ref: string | null
}

interface WalletTransaction {
  id: string
  amount: number
  type?: string
  transaction_type?: string
  status?: string
  description?: string
  notes?: string
  reference?: string
  reference_id?: string
  match_id?: string
  balance_after?: number
  created_at: string
}

// ============================================================
// KONSTANTA
// ============================================================
const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Menunggu Pembayaran', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  paid: { label: 'Berhasil', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  expired: { label: 'Kedaluwarsa', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
  refunded: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: RefreshCw },
}

const QUICK_AMOUNTS = [20000, 50000, 100000, 250000, 500000]

// ============================================================
// HELPER — Display config per transaksi
// ============================================================
type TxDisplay = {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  amountColor: string
  sign: '+' | '−' | ''
}

function getTxDisplay(tx: WalletTransaction): TxDisplay {
  const status = (tx.status || '').toLowerCase()
  const type = (tx.type || tx.transaction_type || '').toLowerCase()
  const amt = Number(tx.amount) || 0

  // PENDING — jam kuning
  if (status === 'pending') {
    return {
      icon: Clock,
      iconBg: 'bg-yellow-500/15',
      iconColor: 'text-yellow-600',
      amountColor: 'text-yellow-600',
      sign: '',
    }
  }

  // MOVED — jam ungu
  if (status === 'moved') {
    return {
      icon: Clock,
      iconBg: 'bg-purple-500/15',
      iconColor: 'text-purple-600',
      amountColor: 'text-purple-600',
      sign: '',
    }
  }

  // ACTIVE — check hijau (dana masih beku)
  if (status === 'active') {
    return {
      icon: CheckCircle2,
      iconBg: 'bg-green-500/15',
      iconColor: 'text-green-600',
      amountColor: 'text-yellow-600',
      sign: '',
    }
  }

  // CANCELLED / FAILED / REJECTED
  if (['cancelled', 'failed', 'rejected'].includes(status)) {
    return {
      icon: XCircle,
      iconBg: 'bg-red-500/15',
      iconColor: 'text-red-600',
      amountColor: 'text-red-600 line-through opacity-60',
      sign: '',
    }
  }

  // COMPLETED
  // Top-up → panah hijau
  if (['topup', 'top_up', 'deposit', 'credit'].includes(type)) {
    return {
      icon: ArrowUp,
      iconBg: 'bg-green-500/15',
      iconColor: 'text-green-600',
      amountColor: 'text-green-600',
      sign: '+',
    }
  }

  // Earning / refund → panah hijau
  if (['session_earning', 'session_release', 'refund'].includes(type)) {
    return {
      icon: ArrowUp,
      iconBg: 'bg-green-500/15',
      iconColor: 'text-green-600',
      amountColor: 'text-green-600',
      sign: '+',
    }
  }

  // Session payment → check hijau
  // Session payment → panah merah (uang keluar)
  if (type === 'session_payment') {
    return {
      icon: ArrowDown,
      iconBg: 'bg-red-500/15',
      iconColor: 'text-red-600',
      amountColor: 'text-red-600',
      sign: '−',
    }
  }

  // Session hold (jarang muncul karena grouping) → tetap check hijau
  if (type === 'session_hold') {
    return {
      icon: CheckCircle2,
      iconBg: 'bg-green-500/15',
      iconColor: 'text-green-600',
      amountColor: 'text-red-600',
      sign: '−',
    }
  }

  // Withdrawal → panah merah
  if (type.startsWith('withdrawal')) {
    return {
      icon: ArrowDown,
      iconBg: 'bg-red-500/15',
      iconColor: 'text-red-600',
      amountColor: 'text-red-600',
      sign: '−',
    }
  }

  if (amt < 0) {
    return {
      icon: ArrowDown,
      iconBg: 'bg-red-500/15',
      iconColor: 'text-red-600',
      amountColor: 'text-red-600',
      sign: '−',
    }
  }
  return {
    icon: ArrowUp,
    iconBg: 'bg-green-500/15',
    iconColor: 'text-green-600',
    amountColor: 'text-green-600',
    sign: '+',
  }
}

function getTxLabel(tx: WalletTransaction): string {
  if (tx.description) return tx.description
  if (tx.notes) return tx.notes
  const t = (tx.type || tx.transaction_type || '').toLowerCase()
  const LABELS: Record<string, string> = {
    topup: 'Top Up Saldo',
    top_up: 'Top Up Saldo',
    deposit: 'Top Up Saldo',
    session_payment: 'Pembayaran Sesi',
    session_hold: 'Penahanan Dana Sesi',
    session_earning: 'Pendapatan Sesi',
    refund: 'Pengembalian Dana',
  }
  return LABELS[t] || 'Transaksi'
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function WalletClient({
  initialToken,
  initialBalance,
  initialFrozen = 0,
  customerName,
  customerEmail,
  defaultAmount = 0,
  studentId,
}: {
  initialToken: string
  initialBalance: number
  initialFrozen?: number
  customerName: string
  customerEmail: string
  defaultAmount?: number
  studentId: string
}) {
  const [token] = useState(initialToken)
  const [balance, setBalance] = useState(initialBalance)
  const [frozen, setFrozen] = useState(initialFrozen)
  const [history, setHistory] = useState<TopUpHistory[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [txLoading, setTxLoading] = useState(true)
  const [amount, setAmount] = useState(defaultAmount > 0 ? String(defaultAmount) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Bersihin query param ?amount=...
  useEffect(() => {
    if (defaultAmount > 0 && typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.has('amount')) {
        url.searchParams.delete('amount')
        window.history.replaceState({}, '', url.pathname + url.search)
      }
    }
  }, [defaultAmount])

  // ============================================================
  // FETCH
  // ============================================================
  const refreshHistory = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('payment_deposits')
        .select('id, amount, payment_method, payment_status, created_at, transaction_ref')
        .eq('payment_type', 'topup')
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setHistory(data as TopUpHistory[])
    } catch (err) {
      console.warn('History refresh error:', err)
    }
  }

  const refreshTransactions = async () => {
    if (!studentId) {
      setTxLoading(false)
      return
    }
    setTxLoading(true)
    try {
      const res = await fetch(
        `/api/students/wallet-transactions?student_id=${studentId}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch (err) {
      console.error('[Wallet] Transactions error:', err)
      setTransactions([])
    } finally {
      setTxLoading(false)
    }
  }

  const refreshBalance = async () => {
    if (!studentId) return
    try {
      const res = await fetch(
        `/api/students/wallet-balance?student_id=${studentId}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (res.ok) {
        setBalance(Number(data.balance) || 0)
        setFrozen(Number(data.frozen) || 0)
      }
    } catch (err) {
      console.warn('Balance refresh error:', err)
    }
  }

  useEffect(() => {
    refreshHistory()
    refreshTransactions()
    refreshBalance()
  }, [])

  // ============================================================
  // 🔥 VISIBLE TRANSACTIONS — Group session_hold per match_id
  // ============================================================
  const visibleTransactions = useMemo(() => {
    const groups = new Map<string, any>()
    const result: any[] = []

    // Sort desc
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    sorted.forEach((tx) => {
      const type = (tx.type || '').toLowerCase()
      const status = (tx.status || '').toLowerCase()

      // Skip cancelled/failed/rejected session_hold
      if (type === 'session_hold' && ['cancelled', 'failed', 'rejected'].includes(status)) {
        return
      }

      // Group session_hold (pending/active/moved) by match_id
      if (type === 'session_hold' && tx.match_id) {
        const key = `match-${tx.match_id}`
        if (!groups.has(key)) {
          const g = {
            ...tx,
            _isGroup: true,
            _count: 0,
            _total: 0,
            _statuses: [] as string[],
          }
          groups.set(key, g)
          result.push(g)
        }
        const g = groups.get(key)!
        g._count += 1
        g._total += Math.abs(Number(tx.amount) || 0)
        g._statuses.push(status)
      } else {
        result.push(tx)
      }
    })

    return result
  }, [transactions])

  // ============================================================
  // HANDLE TOP-UP
  // ============================================================
  const handleTopUp = async () => {
    setError(null)
    const parsed = Math.round(parseFloat(amount))

    if (!parsed || parsed < 1000) {
      setError('Minimal top-up Rp 1.000')
      return
    }
    if (parsed > 10_000_000) {
      setError('Maksimal top-up Rp 10.000.000')
      return
    }
    if (typeof window.snap === 'undefined') {
      setError('Snap.js belum siap. Coba refresh halaman sebentar lagi.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/midtrans/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: parsed, customerName, customerEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membuat transaksi')

      window.snap.pay(data.snapToken, {
        onSuccess: () => {
          setSubmitting(false)
          setTimeout(async () => {
            await refreshBalance()
            await refreshHistory()
            await refreshTransactions()
            setAmount('')
          }, 2000)
        },
        onPending: () => {
          setSubmitting(false)
          window.location.href = '/dashboard/student/payment/pending'
        },
        onError: () => {
          setSubmitting(false)
          window.location.href = '/dashboard/student/payment/error'
        },
        onClose: () => {
          setSubmitting(false)
          setError('Kamu menutup popup sebelum menyelesaikan pembayaran.')
        },
      })
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan')
      setSubmitting(false)
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  const available = Math.max(0, balance - frozen)

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="h-6 w-6" /> Dompet Saya
        </h1>
        <p className="text-muted-foreground text-sm">
          Isi saldo untuk membayar setiap sesi belajar. Pembayaran aman via Midtrans.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Deposit dan Penarikan</h2>
          </div>

          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Saat Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">
                Rp {balance.toLocaleString('id-ID')}
              </p>
              {frozen > 0 && (
                <div className="mt-3 pt-3 border-t border-border/40 space-y-1">
                  <p className="text-xs text-yellow-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium">
                      Saldo dibekukan: Rp {frozen.toLocaleString('id-ID')}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tersedia untuk digunakan: Rp {available.toLocaleString('id-ID')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Isi Saldo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nominal (Rp)</label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Contoh: 100000"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(String(amt))}
                      className="text-xs px-3 py-1 rounded-full border border-border hover:bg-muted/40 transition-colors"
                    >
                      Rp {amt.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleTopUp}
                disabled={submitting || !amount || parseFloat(amount) < 1000}
                className="w-full"
              >
                {submitting ? <Spinner className="w-4 h-4 mr-2" /> : null}
                {submitting ? 'Memproses...' : 'Bayar Sekarang'}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Metode: QRIS, Virtual Account, E-Wallet, Kartu Kredit (via Midtrans)
              </p>
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Riwayat Isi Saldo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.map((item) => {
                  const cfg = STATUS_MAP[item.payment_status] || STATUS_MAP.pending
                  const Icon = cfg.icon
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          Rp {Number(item.amount).toLocaleString('id-ID')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.payment_method.toUpperCase()} · {item.transaction_ref || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <Badge className={`${cfg.color} text-xs flex items-center gap-1`}>
                        <Icon className="w-3 h-3" /> {cfg.label}
                      </Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT — Log Transaksi */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Log Transaksi</h2>
          </div>

          <Card className="flex-1 flex flex-col">
            <CardContent className="pt-6 flex-1 flex flex-col">
              {txLoading ? (
                <div className="flex flex-col items-center py-10">
                  <Spinner className="h-6 w-6" />
                  <p className="mt-2 text-xs text-muted-foreground">Memuat log...</p>
                </div>
              ) : visibleTransactions.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-3">
                    <History className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Transaksi akan muncul di sini setelah Anda melakukan top-up atau pembayaran sesi.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                  {visibleTransactions.map((tx: any) => {
                    const isGroup = tx._isGroup
                    const display = getTxDisplay(tx)
                    const Icon = display.icon
                    const absAmount = isGroup
                      ? tx._total
                      : Math.abs(Number(tx.amount) || 0)
                    const label = isGroup
                      ? `Penahanan Dana Sesi - ${tx.description?.replace('Penahanan Dana Sesi - ', '') || 'Tutor'} (${tx._count} sesi)`
                      : getTxLabel(tx)
                    const date = new Date(tx.created_at)

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${display.iconBg} ${display.iconColor}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{label}</p>
                            <p className="text-xs text-muted-foreground">
                              {date.toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              ·{' '}
                              {date.toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`text-sm font-semibold flex-shrink-0 ml-2 ${display.amountColor}`}
                        >
                          {display.sign}Rp {absAmount.toLocaleString('id-ID')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}