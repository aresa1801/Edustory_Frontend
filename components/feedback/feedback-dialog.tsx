'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, Loader2, MessageSquarePlus } from 'lucide-react'

const CATEGORIES = [
  { value: 'masukan', label: 'Masukan umum' },
  { value: 'kendala', label: 'Kendala teknis' },
  { value: 'fitur', label: 'Usulan fitur' },
  { value: 'lainnya', label: 'Lainnya' },
]

export function FeedbackToAdmin({ role }: { role: 'student' | 'tutor' }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('masukan')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  async function submit() {
    setLoading(true); setError(''); setDone('')
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, message }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Gagal mengirim masukan.'); return }
    setDone(data.message || 'Masukan terkirim ke admin.')
    setMessage('')
  }

  return (
    <>
      <Button variant="outline" onClick={() => { setOpen(true); setDone(''); setError('') }} className="gap-2">
        <MessageSquarePlus className="size-4" /> Kirim masukan ke admin
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Masukan untuk admin</DialogTitle>
            <DialogDescription>
              Sampaikan kendala atau ide Anda sebagai {role === 'tutor' ? 'tutor' : 'siswa'}. Masukan masuk ke dashboard admin bagian analitik.
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <CheckCircle2 className="mx-auto size-7 text-green-600" />
              <p className="mt-2 text-sm font-medium text-green-700">{done}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="fb-category">Jenis</Label>
                <select id="fb-category" value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="fb-message">Masukan</Label>
                <textarea
                  id="fb-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                  maxLength={1500}
                  placeholder="Contoh: fitur jadwal perlu pengingat WhatsApp..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="mt-1 text-right text-[11px] text-muted-foreground">{message.length}/1500</p>
              </div>
              {error && <p className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">{error}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Tutup</Button>
            {!done && (
              <Button onClick={submit} disabled={loading || message.trim().length < 10}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />} Kirim
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
