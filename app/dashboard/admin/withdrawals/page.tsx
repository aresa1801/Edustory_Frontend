'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Banknote, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react'

type Row = {
  id: string
  user_name: string
  user_email: string | null
  role: string
  amount: number
  status: string
  created_at: string
  available_at: string
  processed_at: string | null
  rejection_reason: string | null
  bank_accounts: { bank_code: string; account_number: string; account_name: string } | null
}

const STATUS: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: 'Menunggu', className: 'bg-amber-100 text-amber-700', icon: Clock },
  completed: { label: 'Ditransfer', className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', className: 'bg-red-100 text-red-700', icon: XCircle },
}

function remainingLabel(availableAt: string) {
  const diff = new Date(availableAt).getTime() - Date.now()
  if (diff <= 0) return null
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.ceil((diff % 3600000) / 60000)
  return hours > 0 ? `${hours} jam ${minutes} menit` : `${minutes} menit`
}

export default function AdminWithdrawalsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/withdrawals', { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setRows(data.withdrawals ?? [])
    else setError(data.error || 'Gagal memuat data')
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function act(row: Row, action: 'approve' | 'reject') {
    setBusy(row.id); setError(''); setMessage('')
    const reason = action === 'reject' ? window.prompt('Alasan penolakan:', 'Saldo tidak valid') ?? '' : ''
    if (action === 'reject' && reason === null) { setBusy(null); return }
    const res = await fetch('/api/admin/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, action, reason }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) setError(data.error || 'Gagal memproses')
    else {
      setMessage(action === 'approve'
        ? `Penarikan ${row.user_name} dicairkan. Saldo wallet dipotong otomatis.`
        : `Penarikan ${row.user_name} ditolak.`)
      void load()
    }
    setBusy(null)
  }

  const visible = useMemo(() => filter === 'pending' ? rows.filter((row) => row.status === 'pending') : rows, [rows, filter])
  const pendingTotal = rows.filter((row) => row.status === 'pending').reduce((sum, row) => sum + Number(row.amount), 0)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Penarikan Saldo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Setujui permintaan tutor & siswa. Dana baru bisa dicairkan setelah 1 hari.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} className="gap-2"><RefreshCw className="size-4" /> Muat ulang</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Menunggu</p><p className="mt-1 text-2xl font-bold">{rows.filter((row) => row.status === 'pending').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total diajukan</p><p className="mt-1 text-2xl font-bold">Rp {pendingTotal.toLocaleString('id-ID')}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sudah ditransfer</p><p className="mt-1 text-2xl font-bold">{rows.filter((row) => row.status === 'completed').length}</p></CardContent></Card>
      </div>

      {message && <Alert className="border-green-200 bg-green-50 text-green-800"><CheckCircle2 className="size-4" /><AlertDescription>{message}</AlertDescription></Alert>}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="flex gap-2">
        <Button size="sm" variant={filter === 'pending' ? 'default' : 'outline'} onClick={() => setFilter('pending')}>Menunggu</Button>
        <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Semua</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-10"><Spinner /></div>
          ) : visible.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground"><Banknote className="mx-auto mb-3 size-10 opacity-40" /> Belum ada permintaan penarikan.</div>
          ) : (
            <div className="divide-y">
              {visible.map((row) => {
                const meta = STATUS[row.status] ?? { label: row.status, className: 'bg-muted text-muted-foreground', icon: Clock }
                const wait = row.status === 'pending' ? remainingLabel(row.available_at) : null
                return (
                  <div key={row.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{row.user_name} <span className="text-xs font-normal text-muted-foreground">({row.role === 'tutor' ? 'Tutor' : row.role === 'student' ? 'Siswa' : row.role})</span></p>
                      <p className="truncate text-xs text-muted-foreground">{row.bank_accounts ? `${row.bank_accounts.bank_code.toUpperCase()} · ${row.bank_accounts.account_number} · ${row.bank_accounts.account_name}` : 'Rekening tidak tersedia'}</p>
                      <p className="text-[11px] text-muted-foreground">Diajukan {new Date(row.created_at).toLocaleString('id-ID')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">Rp {Number(row.amount).toLocaleString('id-ID')}</p>
                      <Badge className={meta.className}>{meta.label}</Badge>
                    </div>
                    {row.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" disabled={Boolean(wait) || busy === row.id} onClick={() => act(row, 'approve')} title={wait ? `Tunggu ${wait}` : 'Cairkan'}>
                          {busy === row.id ? <Spinner className="size-3" /> : <>Cairkan{wait ? ` (${wait})` : ''}</>}
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => act(row, 'reject')}>Tolak</Button>
                      </div>
                    )}
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
