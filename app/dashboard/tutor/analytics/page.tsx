'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/auth'
import { Users, CheckCircle, Clock, Star, TrendingUp, BookOpen } from 'lucide-react'

interface AnalyticsData {
  totalStudents: number
  activeStudents: number
  completedSessions: number
  pendingRequests: number
  rating: number
  totalReviews: number
  subjects: Record<string, number>
  approvalStatus: string
  verified: boolean
  experienceYears: number
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: tutorData, error: tutorError } = await supabase
          .from('tutors')
          .select(`
            id,
            rating,
            total_reviews,
            approval_status,
            verified,
            experience_years,
            specializations
          `)
          .eq('user_id', user.id)
          .single()

        if (tutorError || !tutorData) {
          setError('Data pengajar tidak ditemukan.')
          return
        }

        const { data: matches } = await supabase
          .from('matches')
          .select('id, status, subject')
          .eq('tutor_id', tutorData.id)

        const subjectCounts: Record<string, number> = {}
        ;(matches || []).forEach((m: any) => {
          if (m.subject) {
            subjectCounts[m.subject] = (subjectCounts[m.subject] || 0) + 1
          }
        })

        setData({
          totalStudents: (matches || []).length,
          activeStudents: (matches || []).filter(m => ['matched', 'active'].includes(m.status)).length,
          completedSessions: (matches || []).filter(m => m.status === 'completed').length,
          pendingRequests: (matches || []).filter(m => m.status === 'pending').length,
          rating: tutorData.rating || 0,
          totalReviews: tutorData.total_reviews || 0,
          subjects: subjectCounts,
          approvalStatus: tutorData.approval_status || 'pending',
          verified: tutorData.verified || false,
          experienceYears: tutorData.experience_years || 0,
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
      label: 'Total Siswa',
      value: data.totalStudents,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Siswa Aktif',
      value: data.activeStudents,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Sesi Selesai',
      value: data.completedSessions,
      icon: CheckCircle,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      label: 'Menunggu Konfirmasi',
      value: data.pendingRequests,
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
    },
  ]

  const topSubjects = Object.entries(data.subjects)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Analitik</h1>
        <p className="text-muted-foreground">
          Ringkasan performa dan statistik aktivitas mengajar Anda.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Performa Pengajar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rating Rata-rata</span>
              {data.rating > 0 ? (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500 font-bold">★ {data.rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({data.totalReviews} ulasan)</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Belum ada rating</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pengalaman Mengajar</span>
              <span className="text-sm font-medium">{data.experienceYears} tahun</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status Verifikasi</span>
              {data.verified ? (
                <Badge className="bg-green-500 hover:bg-green-600 text-xs">✓ Terverifikasi</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-xs">Belum Terverifikasi</Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status Aplikasi</span>
              <Badge
                variant="outline"
                className={
                  data.approvalStatus === 'approved'
                    ? 'bg-green-50 text-green-700 border-green-200 text-xs'
                    : data.approvalStatus === 'rejected'
                    ? 'bg-red-50 text-red-700 border-red-200 text-xs'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200 text-xs'
                }
              >
                {data.approvalStatus === 'approved'
                  ? 'Disetujui'
                  : data.approvalStatus === 'rejected'
                  ? 'Ditolak'
                  : 'Menunggu'}
              </Badge>
            </div>

            {data.totalStudents > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tingkat Penyelesaian</span>
                <span className="text-sm font-medium">
                  {data.totalStudents > 0
                    ? Math.round((data.completedSessions / data.totalStudents) * 100)
                    : 0}
                  %
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subjects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Mata Pelajaran yang Diajarkan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada data mata pelajaran.
              </p>
            ) : (
              <div className="space-y-3">
                {topSubjects.map(([subject, count]) => (
                  <div key={subject} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{subject}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${Math.round(
                              (count / Math.max(...Object.values(data.subjects))) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
