'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/auth'
import {
  Users,
  GraduationCap,
  BookOpen,
  Handshake,
  ArrowRight,
  BarChart3,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
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
    {
      label: 'Total Pengguna',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Siswa',
      value: stats?.totalStudents ?? 0,
      icon: GraduationCap,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Total Tutor',
      value: stats?.totalTutors ?? 0,
      icon: BookOpen,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Total Pencocokan',
      value: stats?.totalMatches ?? 0,
      icon: Handshake,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50">
            <Clock className="w-3 h-3 mr-1" /> Menunggu
          </Badge>
        )
      case 'approved':
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Disetujui
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
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
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Dashboard Admin</h1>
        <p className="text-slate-500 text-sm">
          Kelola platform EduStory — tutor, siswa, program, dan analitik.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-5 border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tutor Status */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-800">Status Tutor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-sm text-slate-600">Menunggu Verifikasi</span>
              </div>
              <span className="text-sm font-bold text-yellow-600">{stats?.pendingTutors}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-slate-600">Disetujui</span>
              </div>
              <span className="text-sm font-bold text-green-600">{stats?.approvedTutors}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-sm text-slate-600">Ditolak</span>
              </div>
              <span className="text-sm font-bold text-red-600">{stats?.rejectedTutors}</span>
            </div>
            <Link href="/dashboard/admin/tutors">
              <Button variant="outline" size="sm" className="w-full mt-2 text-purple-600 border-purple-200 hover:bg-purple-50">
                Kelola Tutor <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Match Status */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-800">Status Pencocokan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-slate-600">Aktif</span>
              </div>
              <span className="text-sm font-bold text-blue-600">{stats?.activeMatches}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-slate-600">Selesai</span>
              </div>
              <span className="text-sm font-bold text-green-600">{stats?.completedMatches}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-sm text-slate-600">Total</span>
              </div>
              <span className="text-sm font-bold text-slate-700">{stats?.totalMatches}</span>
            </div>
            <Link href="/dashboard/admin/analytics">
              <Button variant="outline" size="sm" className="w-full mt-2 text-purple-600 border-purple-200 hover:bg-purple-50">
                Lihat Analitik <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/dashboard/admin/tutors"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-800">Daftar Tutor</p>
              <p className="text-xs text-slate-500">Verifikasi &amp; kelola</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>

          <Link
            href="/dashboard/admin/students"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-800">Daftar Siswa</p>
              <p className="text-xs text-slate-500">Kelola siswa aktif</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>

          <Link
            href="/dashboard/admin/programs"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-800">Program & Harga</p>
              <p className="text-xs text-slate-500">{stats?.totalPrograms} program aktif</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>

          <Link
            href="/dashboard/admin/analytics"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-800">Analitik</p>
              <p className="text-xs text-slate-500">Statistik platform</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
        </CardContent>
      </Card>

      {/* Recent Tutors */}
      {recentTutors.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base text-slate-800">Tutor Terbaru</CardTitle>
            <Link href="/dashboard/admin/tutors">
              <Button variant="ghost" size="sm" className="text-xs text-purple-600 hover:text-purple-700">
                Lihat semua
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTutors.map(tutor => (
              <div
                key={tutor.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-purple-700">
                      {tutor.name[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">{tutor.name}</p>
                    <p className="text-xs text-slate-500 truncate">{tutor.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  {getStatusBadge(tutor.status)}
                  <span className="text-xs text-slate-400 hidden sm:block">
                    {new Date(tutor.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
