'use client'

import { useState, useEffect } from 'react'
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
  description?: string
  notes?: string
  reference_id?: string
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

// Label untuk tipe transaksi wallet
const TX_TYPE_LABEL: Record<string, string> = {
  topup: 'Top Up Saldo',
  top_up: 'Top Up Saldo',
  deposit: 'Top Up Saldo',
  session_payment: 'Pembayaran Sesi',
  session_hold: 'Penahanan Dana Sesi',
  session_earning: 'Pendapatan Sesi',
  session_release: 'Pendapatan Sesi',
  platform_fee: 'Biaya Platform',
  refund: 'Pengembalian Dana',
  withdrawal: 'Penarikan Saldo',
  withdrawal_pending: 'Penarikan (Menunggu)',
  withdrawal_completed: 'Penarikan Selesai',
  withdrawal_refund: 'Pengembalian Penarikan',
  credit: 'Kredit',
  debit: 'Debit',
}

// ============================================================
// HELPER — Tentukan arah transaksi (in / out)
// ============================================================
function getDirection(tx: WalletTransaction): 'in' | 'out' {
  const amt = Number(tx.amount) || 0
  if (amt < 0) return 'out'
  if (amt > 0) return 'in'

  // Fallback: pakai type kalau amount 0 (edge case)
  const t = (tx.type || tx.transaction_type || '').toLowerCase()
  if (['topup', 'top_up', 'deposit', 'refund', 'credit', 'session_earning', 'session_release'].includes(t)) {
    return 'in'
  }
  return 'out'
}

function getTxLabel(tx: WalletTransaction): string {
  if (tx.description) return tx.description
  if (tx.notes) return tx.notes
  const t = (tx.type || tx.transaction_type || '').toLowerCase()
  return TX_TYPE_LABEL[t] || 'Transaksi'
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function WalletClient({
  initialToken,
  initialBalance,
  customerName,
  customerEmail,
  defaultAmount = 0,
}: {
  initialToken: string
  initialBalance: number
  customerName: string
  customerEmail: string
  defaultAmount?: number
}) {
  const [token] = useState(initialToken)
  const [balance, setBalance] = useState(initialBalance)
  const [history, setHistory] = useState<TopUpHistory[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [txLoading, setTxLoading] = useState(true)
  const [amount, setAmount] = useState(defaultAmount > 0 ? String(defaultAmount) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔥 Bersihin query param ?amount=... setelah dibaca
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
  // FETCH: Top-up history
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

  // ============================================================
  // FETCH: Wallet transactions (log transaksi)
  // ============================================================
  const refreshTransactions = async () => {
    setTxLoading(true)
    try {
      // Ambil user_id dari Supabase session
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTransactions([])
        return
      }

      const res = await fetch(
        `/api/students/wallet-transactions?user_id=${user.id}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch (err) {
      console.warn('Transactions refresh error:', err)
      setTransactions([])
    } finally {
      setTxLoading(false)
    }
  }

  // ============================================================
  // FETCH: Balance
  // ============================================================
  const refreshBalance = async () => {
    try {
      const res = await fetch('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) setBalance(data.balance ?? 0)
    } catch (err) {
      console.warn('Balance refresh error:', err)
    }
  }

  // ============================================================
  // INITIAL LOAD
  // ============================================================
  useEffect(() => {
    refreshHistory()
    refreshTransactions()
  }, [])

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

      {/* ================= TWO COLUMNS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ============ LEFT COLUMN — Deposit dan Penarikan ============ */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Deposit dan Penarikan</h2>
          </div>

          {/* Saldo Card */}
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
            </CardContent>
          </Card>

          {/* Form Top Up */}
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

          {/* Riwayat Top Up — kalau ada */}
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

        {/* ============ RIGHT COLUMN — Log Transaksi ============ */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Log Transaksi</h2>
          </div>

          <Card>
            <CardContent className="pt-6">
              {txLoading ? (
                <div className="flex flex-col items-center py-10">
                  <Spinner className="h-6 w-6" />
                  <p className="mt-2 text-xs text-muted-foreground">Memuat log...</p>
                </div>
              ) : transactions.length === 0 ? (
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
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {transactions.map((tx) => {
                    const direction = getDirection(tx)
                    const isIncome = direction === 'in'
                    const absAmount = Math.abs(Number(tx.amount) || 0)
                    const label = getTxLabel(tx)
                    const date = new Date(tx.created_at)

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Arrow icon */}
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isIncome
                                ? 'bg-green-500/15 text-green-600'
                                : 'bg-red-500/15 text-red-600'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUp className="w-4 h-4" />
                            ) : (
                              <ArrowDown className="w-4 h-4" />
                            )}
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
                          className={`text-sm font-semibold flex-shrink-0 ml-2 ${
                            isIncome ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isIncome ? '+' : '−'}Rp {absAmount.toLocaleString('id-ID')}
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