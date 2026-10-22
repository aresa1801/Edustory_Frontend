'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BarChart3, CheckCircle2, Clock, MessageSquare, RefreshCw, Star, TrendingUp, Users, Wallet } from 'lucide-react'

type Feedback = { id: string; role: string; user_name: string | null; category: string; message: string; status: string; created_at: string }

type Payload = {
  stats: Record<string, number | null>
  topSubjects: { subject: string; total: number }[]
  growth: { date: string; users: number; matches: number }[]
  recentUsers: { id: string; name: string | null; role: string; created_at: string }[]
  feedback: Feedback[]
  feedbackAvailable: boolean
}

const rupiah = (value: number) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const res = await fetch('/api/admin/analytics', { cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) setError(body.error || 'Gagal memuat analitik')
    else setData(body)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function markRead(id: string, status: 'read' | 'new') {
    await fetch('/api/feedback', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    void load()
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
  if (!data) return null

  const s = data.stats
  const maxGrowth = Math.max(1, ...data.growth.map((day) => Math.max(day.users, day.matches)))

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analitik Platform</h1>
          <p className="mt-1 text-sm text-muted-foreground">Data langsung dari database — pengguna, transaksi, dan masukan mereka.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} className="gap-2"><RefreshCw className="size-4" /> Muat ulang</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Siswa', value: s.students ?? 0, icon: Users },
          { label: 'Tutor disetujui', value: `${s.approvedTutors ?? 0}/${s.tutors ?? 0}`, icon: CheckCircle2 },
          { label: 'Kontrak aktif', value: s.matchesActive ?? 0, icon: TrendingUp },
          { label: 'Sesi bulan ini', value: s.sessionsMonth ?? 0, icon: Clock },
          { label: 'Pendapatan bulan ini', value: rupiah(Number(s.revenueMonth ?? 0)), icon: Wallet },
          { label: 'Pendapatan total', value: rupiah(Number(s.revenueTotal ?? 0)), icon: Wallet },
          { label: 'Saldo wallet pengguna', value: rupiah(Number(s.walletTotal ?? 0)), icon: Wallet },
          { label: 'Rating rata-rata', value: s.avgRating ? `${s.avgRating}/5` : '—', icon: Star },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid size-9 place-items-center rounded-lg bg-purple-50 text-purple-600"><Icon className="size-4" /></span>
              <div><p className="text-[11px] text-muted-foreground">{label}</p><p className="text-lg font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Pertumbuhan 7 hari</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-2">
              {data.growth.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end justify-center gap-1" style={{ height: 120 }}>
                    <div className="w-2 rounded-t bg-purple-500" style={{ height: `${(day.users / maxGrowth) * 100}%` }} title={`${day.users} pengguna baru`} />
                    <div className="w-2 rounded-t bg-slate-300" style={{ height: `${(day.matches / maxGrowth) * 100}%` }} title={`${day.matches} penawaran`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{day.date.slice(5)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="size-2 rounded bg-purple-500" /> Pengguna baru</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded bg-slate-300" /> Penawaran</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Mata pelajaran terpopuler</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.topSubjects.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada data.</p> : data.topSubjects.map((row) => (
              <div key={row.subject} className="flex items-center gap-2 text-sm">
                <span className="w-28 truncate">{row.subject}</span>
                <div className="h-2 flex-1 rounded bg-muted"><div className="h-2 rounded bg-purple-500" style={{ width: `${(row.total / data.topSubjects[0].total) * 100}%` }} /></div>
                <span className="w-8 text-right text-xs text-muted-foreground">{row.total}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Masukan pengguna</CardTitle>
            <Badge variant="outline">{data.feedback.filter((row) => row.status === 'new').length} baru</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data.feedbackAvailable && <p className="text-xs text-amber-600">Tabel masukan belum tersedia di database.</p>}
            {data.feedback.length === 0 && data.feedbackAvailable && <p className="text-sm text-muted-foreground">Belum ada masukan dari siswa atau tutor.</p>}
            {data.feedback.map((row) => (
              <div key={row.id} className={`rounded-xl border p-3 ${row.status === 'new' ? 'border-purple-200 bg-purple-50/50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold">{row.user_name ?? 'Pengguna'} <span className="font-normal text-muted-foreground">· {row.role === 'tutor' ? 'Tutor' : 'Siswa'} · {row.category}</span></p>
                    <p className="mt-1 text-sm">{row.message}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(row.created_at).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  {row.status === 'new'
                    ? <Button size="sm" variant="outline" onClick={() => markRead(row.id, 'read')}><CheckCircle2 className="mr-1 size-3" /> Tandai dibaca</Button>
                    : <Button size="sm" variant="ghost" onClick={() => markRead(row.id, 'new')}>Tandai baru</Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Penarikan menunggu</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.pendingWithdrawals ?? 0}</p>
              <p className="text-xs text-muted-foreground">{rupiah(Number(s.pendingWithdrawalAmount ?? 0))} perlu ditinjau</p>
              <a href="/dashboard/admin/withdrawals" className="mt-3 inline-flex text-xs font-semibold text-purple-600">Buka halaman penarikan →</a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Pengguna terbaru</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.recentUsers.map((row) => (
                <div key={row.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{row.name ?? 'Tanpa nama'}</span>
                  <span className="text-[11px] text-muted-foreground">{row.role}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="size-4" /> Ringkas</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total kontrak</span><b>{s.matchesTotal ?? 0}</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Kontrak selesai</span><b>{s.matchesCompleted ?? 0}</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tutor menunggu review</span><b>{s.pendingTutors ?? 0}</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Masukan baru</span><b className="flex items-center gap-1"><MessageSquare className="size-3" /> {s.newFeedback ?? 0}</b></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
