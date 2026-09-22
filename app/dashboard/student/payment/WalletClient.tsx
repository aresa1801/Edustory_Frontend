'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/auth'
import { Clock, CheckCircle2, XCircle, RefreshCw, Wallet } from 'lucide-react'

interface TopUpHistory {
  id: string
  amount: number
  payment_method: string
  payment_status: string
  created_at: string
  transaction_ref: string | null
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Menunggu Pembayaran', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  paid: { label: 'Berhasil', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  expired: { label: 'Kedaluwarsa', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
  refunded: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: RefreshCw },
}

const QUICK_AMOUNTS = [20000, 50000, 100000, 250000, 500000]

export default function WalletClient({
  initialToken,
  initialBalance,
  customerName,
  customerEmail,
}: {
  initialToken: string
  initialBalance: number
  customerName: string
  customerEmail: string
}) {
  const [token] = useState(initialToken)
  const [balance, setBalance] = useState(initialBalance)
  const [history, setHistory] = useState<TopUpHistory[]>([])
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    refreshHistory()
  }, [])

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
        body: JSON.stringify({
          amount: parsed,
          customerName,
          customerEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membuat transaksi')

      window.snap.pay(data.snapToken, {
        onSuccess: () => {
          setSubmitting(false)
          // kasih waktu webhook masuk
          setTimeout(async () => {
            await refreshBalance()
            await refreshHistory()
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="h-6 w-6" /> Dompet Saya
        </h1>
        <p className="text-muted-foreground text-sm">
          Isi saldo untuk membayar setiap sesi belajar. Pembayaran aman via Midtrans.
        </p>
      </div>

      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Saat Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-primary">
            Rp {balance.toLocaleString('id-ID')}
          </p>
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
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                    <p className="font-medium text-sm">Rp {Number(item.amount).toLocaleString('id-ID')}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.payment_method.toUpperCase()} · {item.transaction_ref || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
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
  )
}