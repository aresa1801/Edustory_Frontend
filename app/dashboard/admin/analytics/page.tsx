'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/auth'
import { Users, BookOpen, BarChart3, TrendingUp } from 'lucide-react'

interface AdminAnalytics {
  totalUsers: number
  totalStudents: number
  totalTutors: number
  activeTutors: number
  pendingTutors: number
  totalMatches: number
  activeMatches: number
  completedMatches: number
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AdminAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const supabase = createClient()

        const [
          { count: totalUsers },
          { count: totalStudents },
          { count: totalTutors },
          { count: activeTutors },
          { count: pendingTutors },
          { count: totalMatches },
          { count: activeMatches },
          { count: completedMatches },
        ] = await Promise.all([
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('tutors').select('*', { count: 'exact', head: true }),
          supabase.from('tutors').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
          supabase.from('tutors').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
          supabase.from('matches').select('*', { count: 'exact', head: true }),
          supabase.from('matches').select('*', { count: 'exact', head: true }).in('status', ['matched', 'active']),
          supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        ])

        setData({
          totalUsers: totalUsers || 0,
          totalStudents: totalStudents || 0,
          totalTutors: totalTutors || 0,
          activeTutors: activeTutors || 0,
          pendingTutors: pendingTutors || 0,
          totalMatches: totalMatches || 0,
          activeMatches: activeMatches || 0,
          completedMatches: completedMatches || 0,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat analitik')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || 'Gagal memuat data analitik'}</AlertDescription>
      </Alert>
    )
  }

  const statCards = [
    {
      label: 'Total Pengguna',
      value: data.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Total Siswa',
      value: data.totalStudents,
      icon: BookOpen,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Total Tutor',
      value: data.totalTutors,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      label: 'Total Pencocokan',
      value: data.totalMatches,
      icon: BarChart3,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Analitik Platform</h1>
        <p className="text-muted-foreground">Ringkasan statistik dan performa platform EduStory.</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tutor & Match Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status Tutor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Tutor Disetujui</span>
              <span className="text-sm font-bold text-green-600">{data.activeTutors}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Tutor Menunggu Verifikasi</span>
              <span className="text-sm font-bold text-yellow-600">{data.pendingTutors}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">Total Tutor</span>
              <span className="text-sm font-bold text-foreground">{data.totalTutors}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Pencocokan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Pencocokan Aktif</span>
              <span className="text-sm font-bold text-blue-600">{data.activeMatches}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Pencocokan Selesai</span>
              <span className="text-sm font-bold text-green-600">{data.completedMatches}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">Total Pencocokan</span>
              <span className="text-sm font-bold text-foreground">{data.totalMatches}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
