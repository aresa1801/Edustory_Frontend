'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/auth'
import {
  QrCode,
  Smartphone,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PaymentConfig {
  [key: string]: string
}

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_status: string
  created_at: string
  transaction_ref: string | null
  matches: { subject: string; status: string } | null
}

// ---------------------------------------------------------------------------
// Payment method groups
// ---------------------------------------------------------------------------
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
  paid: { label: 'Lunas', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  expired: { label: 'Kedaluwarsa', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock },
  refunded: { label: 'Dikembalikan', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: RefreshCw },
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function QrisDisplay({ amount, token }: { amount: number; token: string }) {
  const [qrisString, setQrisString] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const generate = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/payments/qris', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Gagal membuat QRIS')
        setQrisString(json.dynamicQris)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    generate()
  }, [amount, token])

  const handleCopy = async () => {
    if (!qrisString) return
    await navigator.clipboard.writeText(qrisString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl">
        {/* QR visual using a free QR API */}
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrisString!)}`}
          alt="QRIS Code"
          className="w-52 h-52 rounded-lg"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <p className="text-sm text-slate-500 text-center">
          Scan dengan aplikasi e-wallet / mobile banking manapun
        </p>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 overflow-hidden text-ellipsis whitespace-nowrap">
          {qrisString}
        </div>
        <Button size="sm" variant="outline" onClick={handleCopy} className="flex-shrink-0">
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      <Alert className="bg-amber-50 border-amber-200">
        <AlertDescription className="text-amber-700 text-sm">
          ⚠️ Setelah membayar, simpan bukti transaksi dan klik "Konfirmasi Pembayaran" di bawah.
          Pembayaran akan diverifikasi admin dalam 1×24 jam.
        </AlertDescription>
      </Alert>
    </div>
  )
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
          💡 Transfer tepat sesuai nominal. Setelah transfer, klik "Konfirmasi Pembayaran".
          Admin akan memverifikasi dalam 1×24 jam.
        </AlertDescription>
      </Alert>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function StudentPaymentPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [config, setConfig] = useState<PaymentConfig>({})
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMethod, setSelectedMethod] = useState<string>('qris')
  const [amount, setAmount] = useState<string>('')
  const [matchId, setMatchId] = useState<string>('')
  const [tutorId, setTutorId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [qrisString, setQrisString] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      setToken(session.access_token)

      const [{ data: cfgRows }, { data: payRows }] = await Promise.all([
        supabase.from('payment_config').select('config_key, config_value'),
        supabase
          .from('payment_deposits')
          .select('id, amount, payment_method, payment_status, created_at, transaction_ref, matches:match_id(subject, status)')
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      const cfgMap: PaymentConfig = {}
      for (const row of cfgRows || []) cfgMap[row.config_key] = row.config_value
      setConfig(cfgMap)
      setPayments((payRows || []) as any[])
      setLoading(false)
    }
    init()
  }, [router])

  // Pre-generate QRIS when method=qris and amount is valid
  useEffect(() => {
    if (selectedMethod !== 'qris' || !token) { setQrisString(null); return }
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) { setQrisString(null); return }

    let cancelled = false
    const generate = async () => {
      try {
        const res = await fetch('/api/payments/qris', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ amount: Math.round(parsed) }),
        })
        const json = await res.json()
        if (!cancelled && res.ok) setQrisString(json.dynamicQris)
      } catch { /* ignore */ }
    }
    const timer = setTimeout(generate, 600)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [selectedMethod, amount, token])

  const handleSubmit = async () => {
    setSubmitError(null)
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) { setSubmitError('Masukkan nominal yang valid'); return }
    if (!tutorId.trim()) { setSubmitError('ID tutor wajib diisi'); return }
    if (!token) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tutorId,
          matchId: matchId || undefined,
          amount: Math.round(parsed),
          paymentMethod: selectedMethod,
          qrisDynamicString: selectedMethod === 'qris' ? qrisString : undefined,
          transactionRef: `TRX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal merekam pembayaran')
      setSubmitted(true)
      // Reload history
      const supabase = createClient()
      const { data } = await supabase
        .from('payment_deposits')
        .select('id, amount, payment_method, payment_status, created_at, transaction_ref, matches:match_id(subject, status)')
        .order('created_at', { ascending: false })
        .limit(20)
      setPayments((data || []) as any[])
    } catch (e: any) {
      setSubmitError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Pembayaran</h1>
        <p className="text-muted-foreground text-sm">Bayar sesi belajar via QRIS atau E-Money / Bank.</p>
      </div>

      {/* Payment form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buat Pembayaran Baru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nominal (Rp)</label>
            <input
              type="number"
              min={1000}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Contoh: 150000"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Tutor ID */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">ID Tutor</label>
            <input
              type="text"
              value={tutorId}
              onChange={e => setTutorId(e.target.value)}
              placeholder="UUID tutor"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Match ID (optional) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">ID Pencocokan <span className="text-muted-foreground font-normal">(opsional)</span></label>
            <input
              type="text"
              value={matchId}
              onChange={e => setMatchId(e.target.value)}
              placeholder="UUID match (jika ada)"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Method selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Metode Pembayaran</label>

            {/* QRIS */}
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

            {/* E-Money */}
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

            {/* Bank Transfer */}
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

          {/* Payment detail based on method */}
          {parseFloat(amount) > 0 && (
            <div className="border border-border rounded-xl p-4 bg-muted/20">
              <p className="text-sm font-medium mb-3">
                Detail Pembayaran —{' '}
                <span className="text-primary">
                  Rp {Number(parseFloat(amount) || 0).toLocaleString('id-ID')}
                </span>
              </p>
              {selectedMethod === 'qris' ? (
                qrisString ? (
                  <div className="space-y-3">
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrisString)}`}
                        alt="QRIS"
                        className="w-52 h-52 rounded-lg border"
                      />
                      <p className="text-xs text-muted-foreground">Scan dengan aplikasi e-wallet / m-banking manapun</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center py-4"><Spinner /></div>
                )
              ) : (
                <AccountInfo config={config} method={selectedMethod} />
              )}
            </div>
          )}

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {submitted && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-700">
                ✅ Pembayaran berhasil dicatat! Admin akan memverifikasi dalam 1×24 jam.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || !parseFloat(amount) || !tutorId.trim()}
            className="w-full"
          >
            {submitting ? <><Spinner className="w-4 h-4 mr-2" /> Memproses...</> : 'Konfirmasi Pembayaran'}
          </Button>
        </CardContent>
      </Card>

      {/* Payment history */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riwayat Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payments.map(p => {
              const cfg = STATUS_MAP[p.payment_status] || STATUS_MAP.pending
              const Icon = cfg.icon
              const methodLabel = p.payment_method.toUpperCase()
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Rp {Number(p.amount).toLocaleString('id-ID')}</p>
                    <p className="text-xs text-muted-foreground">{methodLabel} · {p.matches ? p.matches.subject : '—'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
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
