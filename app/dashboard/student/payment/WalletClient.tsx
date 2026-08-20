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
  pending: { label: 'Menunggu Konfirmasi', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  paid: { label: 'Berhasil', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  expired: { label: 'Kedaluwarsa', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
  refunded: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: RefreshCw },
}

export default function WalletClient({
  initialToken,
  initialBalance,
  hasQrisConfig,
}: {
  initialToken: string
  initialBalance: number
  hasQrisConfig: boolean
}) {
  const [token] = useState(initialToken)
  const [balance, setBalance] = useState(initialBalance)
  const [history, setHistory] = useState<TopUpHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [qrisString, setQrisString] = useState<string | null>(null)
  const [qrisLoading, setQrisLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Ambil riwayat top-up
  useEffect(() => {
    const fetchHistory = async () => {
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
        console.warn('History fetch error:', err)
      }
    }
    fetchHistory()
  }, [])

  // Generate QRIS
  useEffect(() => {
    if (!token || !amount || parseFloat(amount) <= 0 || !hasQrisConfig) {
      setQrisString(null)
      setQrisLoading(false)
      return
    }

    let cancelled = false
    setQrisLoading(true)

    const generate = async () => {
      try {
        const res = await fetch('/api/payments/qris', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount: Math.round(parseFloat(amount)) }),
        })
        const json = await res.json()
        if (!cancelled) {
          if (res.ok && json.dynamicQris) {
            setQrisString(json.dynamicQris)
          } else {
            console.error('QRIS failed:', json.error)
            setQrisString(null)
          }
          setQrisLoading(false)
        }
      } catch (err) {
        console.error('QRIS error:', err)
        if (!cancelled) {
          setQrisString(null)
          setQrisLoading(false)
        }
      }
    }

    const timer = setTimeout(generate, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [amount, token, hasQrisConfig])

  // Top-Up QRIS
  const handleTopUp = async () => {
    setSubmitError(null)
    setSuccess(false)
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) {
      setSubmitError('Masukkan nominal yang valid')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: Math.round(parsed),
          paymentMethod: 'qris',
          qrisDynamicString: qrisString,
          transactionRef: `TOPUP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          isTopup: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal top-up')

      setSuccess(true)

      // Refresh balance
      const balanceRes = await fetch('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const balanceData = await balanceRes.json()
      if (balanceRes.ok) setBalance(balanceData.balance ?? 0)

      // Refresh history
      const supabase = createClient()
      const { data: newHistory } = await supabase
        .from('payment_deposits')
        .select('id, amount, payment_method, payment_status, created_at, transaction_ref')
        .eq('payment_type', 'topup')
        .order('created_at', { ascending: false })
        .limit(20)
      if (newHistory) setHistory(newHistory as TopUpHistory[])

      setAmount('')
      setQrisString(null)
    } catch (e: any) {
      setSubmitError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Dummy Top-Up
  const handleDummyTopUp = async () => {
    setSubmitError(null)
    setSuccess(false)
    const parsed = parseFloat(amount) || 10000

    setSubmitting(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: Math.round(parsed),
          paymentMethod: 'dummy',
          transactionRef: `DUMMY-${Date.now()}`,
          isTopup: true,
          isDummy: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal dummy')

      setSuccess(true)

      const balanceRes = await fetch('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const balanceData = await balanceRes.json()
      if (balanceRes.ok) setBalance(balanceData.balance ?? 0)

      const supabase = createClient()
      const { data: newHistory } = await supabase
        .from('payment_deposits')
        .select('id, amount, payment_method, payment_status, created_at, transaction_ref')
        .eq('payment_type', 'topup')
        .order('created_at', { ascending: false })
        .limit(20)
      if (newHistory) setHistory(newHistory as TopUpHistory[])

      setAmount('')
      setQrisString(null)
    } catch (e: any) {
      setSubmitError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!hasQrisConfig) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
        <AlertDescription>QRIS belum dikonfigurasi oleh admin. Silakan hubungi administrator.</AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner className="h-10 w-10 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat dompet...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
        <AlertDescription>
          <strong>Error:</strong> {error}
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="h-6 w-6" /> Dompet Saya
        </h1>
        <p className="text-muted-foreground text-sm">
          Isi saldo dengan QRIS. Saldo akan digunakan untuk membayar setiap sesi belajar.
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
          <CardTitle className="text-base">Isi Saldo dengan QRIS</CardTitle>
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
          </div>

          {parseFloat(amount) > 0 && (
            <div className="border border-border rounded-xl p-4 bg-muted/20">
              <p className="text-sm font-medium mb-3">
                Scan QRIS untuk membayar{' '}
                <span className="text-primary font-bold">
                  Rp {Number(parseFloat(amount)).toLocaleString('id-ID')}
                </span>
              </p>
              <div className="flex flex-col items-center">
                {qrisLoading ? (
                  <div className="flex flex-col items-center py-4">
                    <Spinner className="h-8 w-8" />
                    <p className="text-xs text-muted-foreground mt-2">Menghasilkan QRIS...</p>
                  </div>
                ) : qrisString ? (
                  <>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrisString)}`}
                      alt="QRIS"
                      className="w-52 h-52 rounded-lg border"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">Scan dengan aplikasi e-wallet / m-banking</p>
                  </>
                ) : (
                  <Alert variant="destructive" className="w-full">
                    <AlertDescription>Gagal membuat QRIS. Coba nominal lain atau refresh.</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-700">
                ✅ Top-up berhasil! Saldo Anda telah bertambah.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleTopUp}
            disabled={submitting || !parseFloat(amount) || parseFloat(amount) <= 0}
            className="w-full"
          >
            {submitting ? <Spinner className="w-4 h-4 mr-2" /> : null}
            {submitting ? 'Memproses...' : 'Top Up Sekarang'}
          </Button>

          <Button
            onClick={handleDummyTopUp}
            variant="outline"
            className="w-full mt-2 border-dashed border-green-500 text-green-600"
            disabled={submitting}
          >
            {submitting ? <Spinner className="w-4 h-4 mr-2" /> : '🧪 '}
            Top Up Dummy (Testing)
          </Button>
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
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Rp {Number(item.amount).toLocaleString('id-ID')}</p>
                    <p className="text-xs text-muted-foreground">{item.payment_method.toUpperCase()} · {item.transaction_ref || '—'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
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