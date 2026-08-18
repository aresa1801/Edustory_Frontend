'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/auth'
import {
  QrCode,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  Wallet,
} from 'lucide-react'

// Types
interface PaymentConfig {
  [key: string]: string
}

interface TopUpHistory {
  id: string
  amount: number
  payment_method: string
  payment_status: string
  created_at: string
  transaction_ref: string | null
}

const EMONEY_METHODS = [
  { id: 'gopay', label: 'GoPay', emoji: '💚' },
  { id: 'ovo', label: 'OVO', emoji: '💜' },
  { id: 'dana', label: 'DANA', emoji: '💙' },
  { id: 'shopeepay', label: 'ShopeePay', emoji: '🧡' },
  { id: 'linkaja', label: 'LinkAja', emoji: '❤️' },
]

const BANK_METHODS = [
  { id: 'bca', label: 'BCA' },
  { id: 'bni', label: 'BNI' },
  { id: 'bri', label: 'BRI' },
  { id: 'mandiri', label: 'Mandiri' },
  { id: 'permata', label: 'Permata' },
  { id: 'cimb', label: 'CIMB Niaga' },
]

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Menunggu Konfirmasi', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  paid: { label: 'Berhasil', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  expired: { label: 'Kedaluwarsa', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
  refunded: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: RefreshCw },
}

function AccountInfo({ config, method }: { config: PaymentConfig; method: string }) {
  const [copied, setCopied] = useState(false)
  const accountNum = config[`${method}_number`] || config[`${method}_name`] || '-'
  const accountName = config[`${method}_name`] || ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(accountNum)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!config[`${method}_number`] && !config[`${method}_name`]) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Akun {method.toUpperCase()} belum dikonfigurasi oleh admin.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      <div className="p-4 bg-slate-50 rounded-xl space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Nomor Akun / Rekening</p>
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold text-slate-800">{accountNum}</p>
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
          </Button>
        </div>
        {accountName && accountNum !== accountName && (
          <p className="text-sm text-slate-600">a.n. {accountName}</p>
        )}
      </div>
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-700 text-sm">
          💡 Transfer tepat sesuai nominal. Setelah transfer, klik "Top Up Sekarang" untuk mengisi saldo.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function WalletContent() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [config, setConfig] = useState<PaymentConfig>({})
  const [history, setHistory] = useState<TopUpHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [amount, setAmount] = useState<string>('')
  const [selectedMethod, setSelectedMethod] = useState<string>('qris')
  const [qrisString, setQrisString] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          if (isMounted) {
            setLoading(false)
            router.push('/auth/login')
          }
          return
        }

        setToken(session.access_token)

        // 1. Ambil saldo
        try {
          const res = await fetch('/api/wallet/balance', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          const data = await res.json()
          if (res.ok && isMounted) {
            setBalance(data.balance ?? 0)
          } else if (isMounted) {
            console.warn('Balance API error:', data.error)
            // tetap pakai balance 0
          }
        } catch (err) {
          console.warn('Balance fetch error:', err)
        }

        // 2. Ambil config (pakai Supabase langsung)
        const { data: cfgRows, error: cfgError } = await supabase
          .from('payment_config')
          .select('config_key, config_value')
        if (!cfgError && cfgRows && isMounted) {
          const cfgMap: PaymentConfig = {}
          for (const row of cfgRows) cfgMap[row.config_key] = row.config_value
          setConfig(cfgMap)
        }

        // 3. Ambil riwayat top-up (pakai Supabase langsung)
        const { data: payRows, error: payError } = await supabase
          .from('payment_deposits')
          .select('id, amount, payment_method, payment_status, created_at, transaction_ref')
          .eq('payment_type', 'topup')
          .order('created_at', { ascending: false })
          .limit(20)

        if (!payError && payRows && isMounted) {
          setHistory(payRows as TopUpHistory[])
        }

        if (isMounted) setLoading(false)
      } catch (err: any) {
        console.error('Init error:', err)
        if (isMounted) {
          setError('Gagal memuat data dompet. Silakan refresh halaman.')
          setLoading(false)
        }
      }
    }

    init()
    return () => { isMounted = false }
  }, [router])

  // Generate QRIS
  useEffect(() => {
    if (selectedMethod !== 'qris' || !token || !amount || parseFloat(amount) <= 0) {
      setQrisString(null)
      return
    }
    let cancelled = false
    const generate = async () => {
      try {
        const res = await fetch('/api/payments/qris', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount: Math.round(parseFloat(amount)) }),
        })
        const json = await res.json()
        if (!cancelled && res.ok) setQrisString(json.dynamicQris)
      } catch {}
    }
    const timer = setTimeout(generate, 600)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [selectedMethod, amount, token])

  const handleTopUp = async () => {
    setSubmitError(null)
    setSuccess(false)
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) {
      setSubmitError('Masukkan nominal yang valid (minimal Rp 1.000)')
      return
    }
    if (!token) {
      setSubmitError('Sesi tidak valid, silakan login ulang')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: Math.round(parsed),
          paymentMethod: selectedMethod,
          qrisDynamicString: selectedMethod === 'qris' ? qrisString : undefined,
          transactionRef: `TOPUP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          isTopup: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal melakukan top-up')

      setSuccess(true)

      // Refresh saldo
      const balanceRes = await fetch('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const balanceData = await balanceRes.json()
      if (balanceRes.ok) setBalance(balanceData.balance ?? 0)

      // Refresh riwayat
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner className="h-10 w-10 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat dompet...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="h-6 w-6" /> Dompet Saya
        </h1>
        <p className="text-muted-foreground text-sm">
          Isi saldo untuk memulai sesi belajar. Saldo akan digunakan untuk membayar setiap sesi.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Metode Pembayaran</label>
            <button
              onClick={() => setSelectedMethod('qris')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                selectedMethod === 'qris'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <QrCode className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">QRIS</p>
                <p className="text-xs text-muted-foreground">GoPay, OVO, DANA, ShopeePay, dll</p>
              </div>
            </button>

            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide pt-1">E-Money / Dompet Digital</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EMONEY_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors ${
                    selectedMethod === m.id
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <span>{m.emoji}</span> {m.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide pt-1">Transfer Bank</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BANK_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors ${
                    selectedMethod === m.id
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <Building2 className="w-4 h-4 flex-shrink-0" /> {m.label}
                </button>
              ))}
            </div>
          </div>

          {parseFloat(amount) > 0 && selectedMethod === 'qris' && qrisString && (
            <div className="border border-border rounded-xl p-4 bg-muted/20">
              <p className="text-sm font-medium mb-3">
                Scan QRIS untuk membayar{' '}
                <span className="text-primary font-bold">
                  Rp {Number(parseFloat(amount)).toLocaleString('id-ID')}
                </span>
              </p>
              <div className="flex flex-col items-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrisString)}`}
                  alt="QRIS"
                  className="w-52 h-52 rounded-lg border"
                />
                <p className="text-xs text-muted-foreground mt-2">Scan dengan aplikasi e-wallet / m-banking</p>
              </div>
            </div>
          )}

          {parseFloat(amount) > 0 && selectedMethod !== 'qris' && (
            <div className="border border-border rounded-xl p-4 bg-muted/20">
              <p className="text-sm font-medium mb-3">
                Transfer ke rekening berikut sebesar{' '}
                <span className="text-primary font-bold">
                  Rp {Number(parseFloat(amount)).toLocaleString('id-ID')}
                </span>
              </p>
              <AccountInfo config={config} method={selectedMethod} />
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
            disabled={submitting || !parseFloat(amount)}
            className="w-full"
          >
            {submitting ? (
              <><Spinner className="w-4 h-4 mr-2" /> Memproses...</>
            ) : (
              'Top Up Sekarang'
            )}
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

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>}>
      <WalletContent />
    </Suspense>
  )
}