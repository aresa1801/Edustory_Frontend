'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader, StatCard, SectionCard, EmptyState, TonePill } from '@/components/dashboard/ui'
import { bankName } from '@/lib/banks'
import {
  Banknote,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Inbox,
  Landmark,
  Info,
  AlertCircle,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type WithdrawalStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'rejected'
  | 'failed'
  | 'cancelled'

interface BankAccount {
  id: string
  bank_code: string
  account_number: string
  account_name: string
}

interface Withdrawal {
  id: string
  user_id: string
  amount: number
  status: WithdrawalStatus
  midtrans_reference_no: string | null
  rejection_reason: string | null
  processed_at: string | null
  created_at: string
  bank_accounts: BankAccount | null
  requester: { name: string | null; email: string | null } | null
}

interface Summary {
  pending: number
  processing: number
  completed: number
  pendingAmount: number
}

type FilterKey = 'all' | 'pending' | 'processing' | 'completed'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_MAP: Record<
  WithdrawalStatus,
  { label: string; tone: 'primary' | 'secondary' | 'accent' | 'danger' | 'muted' }
> = {
  pending: { label: 'Menunggu', tone: 'accent' },
  processing: { label: 'Diproses', tone: 'primary' },
  completed: { label: 'Selesai', tone: 'secondary' },
  rejected: { label: 'Ditolak', tone: 'danger' },
  failed: { label: 'Gagal', tone: 'danger' },
  cancelled: { label: 'Dibatalkan', tone: 'muted' },
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'processing', label: 'Diproses' },
  { key: 'completed', label: 'Selesai' },
]

function rupiah(amount: number): string {
  return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AdminWithdrawalsClient({
  initialToken,
}: {
  initialToken?: string | null
}) {
  const tokenRef = useRef<string | null>(initialToken || null)

  // Pakai token dari server (cookie sesi) bila ada; fallback ke klien Supabase.
  const withToken = async (): Promise<string | null> => {
    if (tokenRef.current) return tokenRef.current
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const sessionPromise = supabase.auth.getSession().then((r) => r?.data?.session ?? null)
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000))
      const session = await Promise.race([sessionPromise, timeout])
      tokenRef.current = session?.access_token || null
      return tokenRef.current
    } catch {
      return null
    }
  }

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [summary, setSummary] = useState<Summary>({
    pending: 0,
    processing: 0,
    completed: 0,
    pendingAmount: 0,
  })
  const [irisEnabled, setIrisEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionInfo, setActionInfo] = useState<string | null>(null)

  const load = useCallback(async (status: FilterKey) => {
    setLoading(true)
    setError(null)
    try {
      const token = await withToken()
      const headers = { Authorization: `Bearer ${token}` }

      const listRes = await fetch(`/api/admin/withdrawals?status=${status}`, { headers })
      const listJson = await listRes.json().catch(() => ({}))
      if (!listRes.ok) throw new Error(listJson.error || 'Gagal memuat data penarikan')

      setWithdrawals((listJson.withdrawals || []) as Withdrawal[])
      if (typeof listJson.irisEnabled === 'boolean') setIrisEnabled(listJson.irisEnabled)

      // Ringkasan selalu diambil dari seluruh data (tanpa filter) agar angka tetap akurat.
      if (status === 'all') {
        if (listJson.summary) setSummary(listJson.summary as Summary)
      } else {
        const sumRes = await fetch('/api/admin/withdrawals', { headers })
        const sumJson = await sumRes.json().catch(() => ({}))
        if (sumRes.ok && sumJson.summary) setSummary(sumJson.summary as Summary)
        else if (listJson.summary) setSummary(listJson.summary as Summary)
      }
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat data penarikan')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(filter)
  }, [filter, load])

  const handleAction = async (
    id: string,
    action: 'approve' | 'reject' | 'complete',
    reason?: string
  ) => {
    setBusyId(id)
    setActionError(null)
    setActionInfo(null)
    try {
      const token = await withToken()
      const res = await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, action, ...(reason ? { reason } : {}) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json.needsManualTransfer) {
          setActionInfo(json.error || 'Midtrans Payouts belum aktif. Transfer manual lalu tandai "Selesai".')
        } else {
          setActionError(json.error || 'Gagal memproses aksi')
        }
        return
      }
      await load(filter)
    } catch (e: any) {
      setActionError(e?.message || 'Gagal memproses aksi')
    } finally {
      setBusyId(null)
    }
  }

  const onApprove = (w: Withdrawal) => handleAction(w.id, 'approve')

  const onReject = (w: Withdrawal) => {
    const reason = window.prompt('Alasan penolakan (opsional):', '') ?? null
    if (reason === null) return // dibatalkan
    handleAction(w.id, 'reject', reason.trim() || undefined)
  }

  const onComplete = (w: Withdrawal) => {
    const ok = window.confirm(
      'Tandai penarikan ini sebagai SELESAI?\n\nTindakan ini akan mengurangi saldo pengajar. Pastikan transfer sudah dilakukan.'
    )
    if (!ok) return
    handleAction(w.id, 'complete')
  }

  const count = withdrawals.length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Penarikan Saldo"
        description="Proses permintaan penarikan saldo pengajar dan tandai setelah dana ditransfer."
      />

      {/* Banner: payout otomatis belum aktif */}
      {!irisEnabled && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>
            Midtrans Payouts belum aktif — setelah di-approve, lakukan transfer manual ke rekening
            pengajar lalu klik <span className="font-semibold">"Tandai Selesai"</span>.
          </p>
        </div>
      )}

      {/* Statistik */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Menunggu" value={summary.pending} tone="accent" icon={Clock} />
        <StatCard label="Diproses" value={summary.processing} tone="primary" icon={RefreshCw} />
        <StatCard label="Selesai" value={summary.completed} tone="secondary" icon={CheckCircle2} />
        <StatCard
          label="Total Nominal Tertahan"
          value={rupiah(summary.pendingAmount)}
          hint="Menunggu + diproses"
          tone="muted"
          icon={Banknote}
        />
      </div>

      {/* Pesan aksi */}
      {actionInfo && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>{actionInfo}</p>
        </div>
      )}
      {actionError && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{actionError}</p>
        </div>
      )}

      {/* Daftar permintaan */}
      <SectionCard
        title={`Permintaan Penarikan (${count})`}
        description="Filter berdasarkan status permintaan."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.key
              return (
                <Button
                  key={f.key}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => setFilter(f.key)}
                  disabled={active}
                >
                  {f.label}
                </Button>
              )
            })}
          </div>
        }
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={() => load(filter)}>
              Coba lagi
            </Button>
          </div>
        ) : count === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Belum ada permintaan penarikan"
            description="Permintaan penarikan saldo dari pengajar akan muncul di sini."
          />
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => {
              const cfg = STATUS_MAP[w.status] || STATUS_MAP.pending
              const account = w.bank_accounts
              const requester = w.requester?.name || w.requester?.email || '—'
              const isBusy = busyId === w.id
              const canAct = w.status === 'pending' || w.status === 'processing'
              return (
                <div
                  key={w.id}
                  className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Info */}
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-bold text-foreground">{rupiah(w.amount)}</p>
                        <TonePill tone={cfg.tone}>{cfg.label}</TonePill>
                      </div>
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">Pengaju:</span>{' '}
                        <span className="font-medium">{requester}</span>
                        {w.requester?.name && w.requester?.email && (
                          <span className="text-muted-foreground"> · {w.requester.email}</span>
                        )}
                      </p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Landmark className="h-4 w-4 shrink-0" />
                        {account ? (
                          <span>
                            {bankName(account.bank_code)} · {account.account_number} ·{' '}
                            <span className="text-foreground">{account.account_name}</span>
                          </span>
                        ) : (
                          <span>Rekening tidak tersedia</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Diajukan: {formatDate(w.created_at)}
                        {w.processed_at && (
                          <span> · Diproses: {formatDate(w.processed_at)}</span>
                        )}
                      </p>
                      {w.midtrans_reference_no && (
                        <p className="font-mono text-xs text-muted-foreground">
                          Ref: {w.midtrans_reference_no}
                        </p>
                      )}
                      {w.status === 'rejected' && w.rejection_reason && (
                        <p className="text-xs text-destructive">
                          Alasan ditolak: {w.rejection_reason}
                        </p>
                      )}
                    </div>

                    {/* Aksi */}
                    {canAct && (
                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        {w.status === 'pending' && (
                          <Button size="sm" disabled={isBusy} onClick={() => onApprove(w)}>
                            {isBusy ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            <span className="ml-1">Setujui</span>
                          </Button>
                        )}
                        {w.status === 'processing' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isBusy}
                            onClick={() => onComplete(w)}
                          >
                            {isBusy ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            <span className="ml-1">Tandai Selesai</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isBusy}
                          onClick={() => onReject(w)}
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="ml-1">Tolak</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
