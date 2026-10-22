'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Clock, Loader2, Wallet, CheckCircle2 } from 'lucide-react'

const BANKS = ['BCA', 'BNI', 'BRI', 'Mandiri', 'BSI', 'CIMB Niaga', 'Permata', 'BTN', 'Danamon']

type Request = {
  id: string
  amount: number
  status: string
  created_at: string
  rejection_reason: string | null
  bank_accounts: { bank_code: string; account_number: string; account_name: string } | null
}

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Menunggu admin', className: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Ditransfer', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Ditolak', className: 'bg-red-100 text-red-700' },
}

export function WithdrawDialog({ available }: { available: number }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<Request[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({ amount: '', bank_name: 'BCA', account_number: '', account_name: '' })

  const load = useCallback(async () => {
    const res = await fetch('/api/withdrawals', { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setRequests(data.withdrawals ?? [])
  }, [])

  useEffect(() => { if (open) void load() }, [open, load])

  const pendingTotal = requests.filter((row) => row.status === 'pending').reduce((sum, row) => sum + Number(row.amount), 0)
  const withdrawable = Math.max(0, available - pendingTotal)

  const submit = async () => {
    setLoading(true); setError(null); setSuccess(null)
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Gagal mengajukan penarikan')
      setSuccess(data.message || 'Permintaan penarikan dikirim ke admin.')
      setForm({ amount: '', bank_name: form.bank_name, account_number: '', account_name: '' })
      void load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengajukan penarikan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => { setOpen(true); setSuccess(null); setError(null) }} className="gap-2">
        <Wallet className="size-4" /> Tarik Saldo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tarik saldo</DialogTitle>
            <DialogDescription>
              Permintaan dikirim ke dashboard admin. Dana ditransfer setelah <b>minimal 1 hari</b> dan disetujui admin.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="rounded-xl border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Saldo tersedia</span><b>Rp {available.toLocaleString('id-ID')}</b></div>
              {pendingTotal > 0 && (
                <div className="mt-1 flex justify-between text-xs text-amber-600"><span>Sedang diproses</span><span>-Rp {pendingTotal.toLocaleString('id-ID')}</span></div>
              )}
              <div className="mt-2 flex justify-between border-t pt-2"><span className="text-muted-foreground">Bisa ditarik</span><b>Rp {withdrawable.toLocaleString('id-ID')}</b></div>
            </div>

            <div>
              <Label htmlFor="amount">Jumlah (min. Rp 10.000)</Label>
              <Input id="amount" inputMode="numeric" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value.replace(/[^\d]/g, '') })} placeholder="100000" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bank">Bank</Label>
                <select id="bank" value={form.bank_name} onChange={(event) => setForm({ ...form, bank_name: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="account_number">Nomor rekening</Label>
                <Input id="account_number" inputMode="numeric" value={form.account_number} onChange={(event) => setForm({ ...form, account_number: event.target.value.replace(/[^\d]/g, '') })} placeholder="1234567890" />
              </div>
            </div>

            <div>
              <Label htmlFor="account_name">Nama pemilik rekening</Label>
              <Input id="account_name" value={form.account_name} onChange={(event) => setForm({ ...form, account_name: event.target.value })} placeholder="Sesuai buku tabungan" />
            </div>

            <p className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
              <Clock className="mt-0.5 size-4 shrink-0" />
              Setelah disetujui, saldo wallet otomatis berkurang sebesar jumlah penarikan dan tercatat di riwayat transaksi.
            </p>

            {error && <p className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">{error}</p>}
            {success && (
              <p className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-xs font-medium text-green-700">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {success}
              </p>
            )}

            {requests.length > 0 && (
              <div className="rounded-xl border p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Riwayat penarikan</p>
                <div className="space-y-2">
                  {requests.slice(0, 5).map((row) => {
                    const meta = STATUS[row.status] ?? { label: row.status, className: 'bg-muted text-muted-foreground' }
                    return (
                      <div key={row.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold">Rp {Number(row.amount).toLocaleString('id-ID')}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {row.bank_accounts ? `${row.bank_accounts.bank_code.toUpperCase()} · ${row.bank_accounts.account_number}` : '-'}
                            {' · '}{new Date(row.created_at).toLocaleDateString('id-ID')}
                          </p>
                          {row.rejection_reason && <p className="text-[11px] text-red-600">{row.rejection_reason}</p>}
                        </div>
                        <Badge className={meta.className}>{meta.label}</Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Tutup</Button>
            <Button onClick={submit} disabled={loading || !form.amount}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />} Ajukan penarikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
