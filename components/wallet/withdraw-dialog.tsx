'use client'

import { useState } from 'react'
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
import { Loader2, Wallet } from 'lucide-react'

const BANKS = ['BCA', 'BNI', 'BRI', 'Mandiri', 'BSI', 'CIMB Niaga', 'Permata']

export function WithdrawDialog({ available }: { available: number }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ amount: '', bank_name: 'BCA', account_number: '', account_name: '' })

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/withdrawals/dummy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Gagal mengajukan penarikan')
      setOpen(false)
      setForm({ amount: '', bank_name: 'BCA', account_number: '', account_name: '' })
      alert(data.message || 'Permintaan penarikan dicatat (dummy).')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengajukan penarikan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="w-full gap-2" onClick={() => setOpen(true)}>
        <Wallet className="h-4 w-4" /> Tarik Dana
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tarik Dana</DialogTitle>
            <DialogDescription>
              Saldo tersedia: <strong>Rp {available.toLocaleString('id-ID')}</strong>. Mode dummy — belum ada
              transfer nyata. Integrasi Flip disiapkan untuk tahap berikutnya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Jumlah penarikan</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="100000"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground">Minimal Rp 10.000</p>
            </div>
            <div className="space-y-1.5">
              <Label>Bank</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.bank_name}
                onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
              >
                {BANKS.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Nomor rekening</Label>
              <Input
                inputMode="numeric"
                placeholder="1234567890"
                value={form.account_number}
                onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nama pemilik rekening</Label>
              <Input
                placeholder="Sesuai buku tabungan"
                value={form.account_name}
                onChange={(e) => setForm((p) => ({ ...p, account_name: e.target.value }))}
              />
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button onClick={submit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ajukan Penarikan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
