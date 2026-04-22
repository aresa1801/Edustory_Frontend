'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/auth'
import {
  Users,
  CheckCircle,
  Clock,
  Star,
  TrendingUp,
  BookOpen,
  Award,
  BarChart3,
  Smile,
  Meh,
  Frown,
} from 'lucide-react'

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
  satisfactionScore: number
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

function SatisfactionIcon({ score }: { score: number }) {
  if (score >= 4) return <Smile className="w-8 h-8 text-green-500" />
  if (score >= 2.5) return <Meh className="w-8 h-8 text-amber-500" />
  return <Frown className="w-8 h-8 text-red-400" />
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

        // satisfaction score = rating (1-5 scale)
        const satisfactionScore = tutorData.rating || 0

        setData({
          totalStudents: (matches || []).length,
          activeStudents: (matches || []).filter((m: any) => ['matched', 'active'].includes(m.status)).length,
          completedSessions: (matches || []).filter((m: any) => m.status === 'completed').length,
          pendingRequests: (matches || []).filter((m: any) => m.status === 'pending').length,
          rating: tutorData.rating || 0,
          totalReviews: tutorData.total_reviews || 0,
          subjects: subjectCounts,
          approvalStatus: tutorData.approval_status || 'pending',
          verified: tutorData.verified || false,
          experienceYears: tutorData.experience_years || 0,
          satisfactionScore,
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
      <div className="flex items-center justify-center min-h-[400px]">
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
    { label: 'Total Siswa', value: data.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Siswa Aktif', value: data.activeStudents, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Sesi Selesai', value: data.completedSessions, icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Menunggu Konfirmasi', value: data.pendingRequests, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  const topSubjects = Object.entries(data.subjects)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6)

  const completionRate =
    data.totalStudents > 0
      ? Math.round((data.completedSessions / data.totalStudents) * 100)
      : 0

  const satisfactionLabel =
    data.satisfactionScore >= 4.5
      ? 'Sangat Baik'
      : data.satisfactionScore >= 3.5
      ? 'Baik'
      : data.satisfactionScore >= 2.5
      ? 'Cukup'
      : data.satisfactionScore > 0
      ? 'Perlu Ditingkatkan'
      : 'Belum Ada Data'

  const satisfactionColor =
    data.satisfactionScore >= 4.5
      ? 'text-green-600'
      : data.satisfactionScore >= 3.5
      ? 'text-green-500'
      : data.satisfactionScore >= 2.5
      ? 'text-amber-500'
      : data.satisfactionScore > 0
      ? 'text-red-500'
      : 'text-slate-400'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analitik Performa</h1>
        <p className="text-slate-500 text-sm mt-1">
          Pantau statistik dan skor kepuasan siswa terhadap pengajaran Anda
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Satisfaction Score Card */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Skor Kepuasan Siswa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.rating > 0 ? (
              <div className="space-y-4">
                {/* Big score display */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <SatisfactionIcon score={data.satisfactionScore} />
                  <div>
                    <p className={`text-4xl font-bold ${satisfactionColor}`}>
                      {data.satisfactionScore.toFixed(1)}
                      <span className="text-lg text-slate-400">/5</span>
                    </p>
                    <p className={`text-sm font-semibold ${satisfactionColor}`}>{satisfactionLabel}</p>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-3">
                  <StarRating value={data.rating} />
                  <span className="text-sm text-slate-500">
                    dari {data.totalReviews} ulasan siswa
                  </span>
                </div>

                {/* Score breakdown bars */}
                {[5, 4, 3, 2, 1].map(star => (
                  <div key={star} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-slate-500 w-12">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {star}
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{
                          width: `${star === Math.round(data.rating) ? Math.min(data.totalReviews * 10, 100) : Math.max(0, 30 - Math.abs(star - data.rating) * 15)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}

                <p className="text-xs text-slate-400">
                  * Skor ini merupakan rata-rata penilaian kepuasan dari seluruh siswa yang pernah Anda ajar.
                </p>
              </div>
            ) : (
              <div className="py-8 text-center">
                <Star className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">Belum Ada Penilaian</p>
                <p className="text-xs text-slate-400 mt-1">
                  Skor kepuasan akan muncul setelah siswa memberikan ulasan kepada Anda.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Ringkasan Performa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Status Aplikasi</span>
              <Badge
                variant="outline"
                className={
                  data.approvalStatus === 'approved'
                    ? 'bg-green-50 text-green-700 border-green-200 text-xs'
                    : data.approvalStatus === 'rejected'
                    ? 'bg-red-50 text-red-700 border-red-200 text-xs'
                    : 'bg-amber-50 text-amber-700 border-amber-200 text-xs'
                }
              >
                {data.approvalStatus === 'approved'
                  ? '✓ Disetujui'
                  : data.approvalStatus === 'rejected'
                  ? '✗ Ditolak'
                  : '⏳ Menunggu'}
              </Badge>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Verifikasi</span>
              {data.verified ? (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">✓ Terverifikasi</Badge>
              ) : (
                <Badge variant="outline" className="text-slate-400 text-xs">Belum</Badge>
              )}
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Pengalaman Mengajar</span>
              <span className="text-sm font-semibold text-slate-800">{data.experienceYears} tahun</span>
            </div>

            {data.totalStudents > 0 && (
              <div className="py-2 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Tingkat Penyelesaian Sesi</span>
                  <span className="text-sm font-semibold text-slate-800">{completionRate}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-600">Skor Kurasi</span>
              <span className="text-sm font-semibold text-blue-600">Lihat di halaman Kurasi</span>
            </div>
          </CardContent>
        </Card>

        {/* Subjects */}
        <Card className="border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Distribusi Mata Pelajaran yang Diajarkan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSubjects.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Belum ada data mata pelajaran. Data akan muncul setelah ada sesi mengajar.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topSubjects.map(([subject, count]) => {
                  const maxCount = Math.max(...Object.values(data.subjects))
                  const percent = Math.round((count / maxCount) * 100)
                  return (
                    <div key={subject} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{subject}</span>
                        <span className="text-slate-500">{count} sesi</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
