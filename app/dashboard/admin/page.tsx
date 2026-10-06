'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader, StatCard, SectionCard } from '@/components/dashboard/ui'
import { createClient } from '@/lib/auth'
import {
  Users,
  GraduationCap,
  BookOpen,
  Handshake,
  ArrowRight,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  CreditCard,
} from 'lucide-react'
import Link from 'next/link'

interface Stats {
  totalUsers: number
  totalStudents: number
  totalTutors: number
  pendingTutors: number
  approvedTutors: number
  rejectedTutors: number
  totalMatches: number
  activeMatches: number
  completedMatches: number
  totalPrograms: number
}

interface RecentTutor {
  id: string
  name: string
  email: string
  status: string
  created_at: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentTutors, setRecentTutors] = useState<RecentTutor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()

        const [
          { count: totalUsers },
          { count: totalStudents },
          { count: totalTutors },
          { count: pendingTutors },
          { count: approvedTutors },
          { count: rejectedTutors },
          { count: totalMatches },
          { count: activeMatches },
          { count: completedMatches },
          { count: totalPrograms },
          { data: recentTutorData },
        ] = await Promise.all([
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('tutors').select('*', { count: 'exact', head: true }),
          supabase.from('tutors').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
          supabase.from('tutors').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
          supabase.from('tutors').select('*', { count: 'exact', head: true }).eq('approval_status', 'rejected'),
          supabase.from('matches').select('*', { count: 'exact', head: true }),
          supabase.from('matches').select('*', { count: 'exact', head: true }).in('status', ['matched', 'active']),
          supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
          supabase.from('programs').select('*', { count: 'exact', head: true }),
          supabase
            .from('tutors')
            .select('id, approval_status, created_at, user_profiles:user_id(name, email)')
            .order('created_at', { ascending: false })
            .limit(5),
        ])

        setStats({
          totalUsers: totalUsers || 0,
          totalStudents: totalStudents || 0,
          totalTutors: totalTutors || 0,
          pendingTutors: pendingTutors || 0,
          approvedTutors: approvedTutors || 0,
          rejectedTutors: rejectedTutors || 0,
          totalMatches: totalMatches || 0,
          activeMatches: activeMatches || 0,
          completedMatches: completedMatches || 0,
          totalPrograms: totalPrograms || 0,
        })

        const mapped = (recentTutorData || []).map((t: any) => ({
          id: t.id,
          name: t.user_profiles?.name || 'Unknown',
          email: t.user_profiles?.email || '',
          // approval_status is set by the curation flow; fall back to status for legacy rows
          status: t.approval_status || t.status || 'pending',
          created_at: t.created_at,
        }))
        setRecentTutors(mapped)
      } catch (error) {
        console.error('Failed to fetch admin dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const statCards = [
    { label: 'Total Pengguna', value: stats?.totalUsers ?? 0, icon: Users, tone: 'primary' },
    { label: 'Total Siswa', value: stats?.totalStudents ?? 0, icon: GraduationCap, tone: 'secondary' },
    { label: 'Total Tutor', value: stats?.totalTutors ?? 0, icon: BookOpen, tone: 'accent' },
    { label: 'Total Pencocokan', value: stats?.totalMatches ?? 0, icon: Handshake, tone: 'muted' },
  ] as const

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="rounded-full bg-warning/10 text-warning border-warning/20 hover:bg-warning/15">
            <Clock className="w-3 h-3 mr-1" /> Menunggu
          </Badge>
        )
      case 'approved':
        return (
          <Badge className="rounded-full bg-success/10 text-success border-success/20 hover:bg-success/15">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Disetujui
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="rounded-full bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15">
            <XCircle className="w-3 h-3 mr-1" /> Ditolak
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Admin"
        title="Dashboard Admin"
        description="Kelola platform EduStory — tutor, siswa, program, dan analitik."
      />

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, tone }) => (
          <StatCard key={label} label={label} value={value} icon={Icon} tone={tone} />
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tutor Status */}
        <SectionCard title="Status Tutor" bodyClassName="space-y-3">
          <div className="flex items-center justify-between py-2.5 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-sm text-muted-foreground">Menunggu Verifikasi</span>
            </div>
            <span className="text-sm font-bold text-warning">{stats?.pendingTutors}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-sm text-muted-foreground">Disetujui</span>
            </div>
            <span className="text-sm font-bold text-success">{stats?.approvedTutors}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-sm text-muted-foreground">Ditolak</span>
            </div>
            <span className="text-sm font-bold text-destructive">{stats?.rejectedTutors}</span>
          </div>
          <Link href="/dashboard/admin/tutors">
            <Button variant="outline" size="sm" className="w-full mt-2">
              Kelola Tutor <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </SectionCard>

        {/* Match Status */}
        <SectionCard title="Status Pencocokan" bodyClassName="space-y-3">
          <div className="flex items-center justify-between py-2.5 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">Aktif</span>
            </div>
            <span className="text-sm font-bold text-primary">{stats?.activeMatches}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-sm text-muted-foreground">Selesai</span>
            </div>
            <span className="text-sm font-bold text-success">{stats?.completedMatches}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <span className="text-sm font-bold text-foreground">{stats?.totalMatches}</span>
          </div>
          <Link href="/dashboard/admin/analytics">
            <Button variant="outline" size="sm" className="w-full mt-2">
              Lihat Analitik <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </SectionCard>
      </div>

      {/* Quick Actions */}
      <SectionCard
        title="Aksi Cepat"
        bodyClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
          <Link
            href="/dashboard/admin/tutors"
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">Daftar Tutor</p>
              <p className="text-xs text-muted-foreground">Verifikasi &amp; kelola</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>

          <Link
            href="/dashboard/admin/students"
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">Daftar Siswa</p>
              <p className="text-xs text-muted-foreground">Kelola siswa aktif</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>

          <Link
            href="/dashboard/admin/programs"
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">Program & Harga</p>
              <p className="text-xs text-muted-foreground">{stats?.totalPrograms} program aktif</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>

          <Link
            href="/dashboard/admin/analytics"
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">Analitik</p>
              <p className="text-xs text-muted-foreground">Statistik platform</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>

          <Link
            href="/dashboard/admin/payments"
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">Laporan Pembayaran</p>
              <p className="text-xs text-muted-foreground">QRIS, E-Money, Bank</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>

          <Link
            href="/dashboard/admin/settings"
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">Pengaturan Pembayaran</p>
              <p className="text-xs text-muted-foreground">QRIS, E-Money, API Key</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>
      </SectionCard>

      {/* Recent Tutors */}
      {recentTutors.length > 0 && (
        <SectionCard
          title="Tutor Terbaru"
          actions={
            <Link href="/dashboard/admin/tutors">
              <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80">
                Lihat semua
              </Button>
            </Link>
          }
          bodyClassName="space-y-2"
        >
            {recentTutors.map(tutor => (
              <div
                key={tutor.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {tutor.name[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{tutor.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{tutor.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  {getStatusBadge(tutor.status)}
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {new Date(tutor.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
        </SectionCard>
      )}
    </div>
  )
}
