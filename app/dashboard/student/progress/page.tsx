'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/auth'
import { BookOpen, TrendingUp, Users, Calendar } from 'lucide-react'

export default function StudentProgressPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profileData } = await supabase
          .from('students')
          .select(`
            id,
            grade_level,
            subjects,
            learning_goals,
            status,
            user_profiles:user_id(name, email)
          `)
          .eq('user_id', user.id)
          .single()

        setProfile(profileData)

        if (profileData?.id) {
          const { data: matchData } = await supabase
            .from('matches')
            .select(`
              id,
              status,
              subject,
              start_date,
              lesson_frequency,
              tutors:tutor_id(
                experience_years,
                rating,
                user_profiles:user_id(name)
              )
            `)
            .eq('student_id', profileData.id)
            .order('start_date', { ascending: false })

          setMatches(matchData || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data')
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

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const activeMatches = matches.filter(m => ['matched', 'active'].includes(m.status))
  const completedMatches = matches.filter(m => m.status === 'completed')
  const pendingMatches = matches.filter(m => m.status === 'pending')
  const totalMatches = matches.length
  const completionRate = totalMatches > 0 ? Math.round((completedMatches.length / totalMatches) * 100) : 0

  const subjects = profile?.subjects || []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Progres Belajar</h1>
        <p className="text-muted-foreground">
          Pantau perkembangan belajar dan histori sesi Anda.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pengajar Aktif</p>
              <p className="text-2xl font-bold text-foreground">{activeMatches.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sesi Selesai</p>
              <p className="text-2xl font-bold text-foreground">{completedMatches.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Menunggu Konfirmasi</p>
              <p className="text-2xl font-bold text-foreground">{pendingMatches.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pencocokan</p>
              <p className="text-2xl font-bold text-foreground">{totalMatches}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Completion Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Tingkat Penyelesaian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sesi selesai vs total</span>
              <span className="font-medium">{completedMatches.length}/{totalMatches}</span>
            </div>
            <Progress value={completionRate} className="h-3" />
            <p className="text-sm text-muted-foreground">{completionRate}% sesi berhasil diselesaikan</p>
          </CardContent>
        </Card>

        {/* Subjects */}
        <Card>
          <CardHeader>
            <CardTitle>Mata Pelajaran</CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada mata pelajaran terdaftar.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject: string) => (
                  <Badge key={subject} variant="secondary">
                    {subject}
                  </Badge>
                ))}
              </div>
            )}
            {profile?.grade_level && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Tingkat Kelas</p>
                <p className="text-sm font-medium mt-1">{profile.grade_level}</p>
              </div>
            )}
            {profile?.learning_goals && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Tujuan Belajar</p>
                <p className="text-sm mt-1">{profile.learning_goals}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Match History */}
      <Card>
        <CardHeader>
          <CardTitle>Histori Pencocokan</CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada histori pencocokan. Mulai cari pengajar sekarang!
            </p>
          ) : (
            <div className="space-y-3">
              {matches.map(match => {
                const statusMap: Record<string, { label: string; color: string }> = {
                  pending: { label: 'Menunggu', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                  matched: { label: 'Dikonfirmasi', color: 'bg-green-50 text-green-700 border-green-200' },
                  active: { label: 'Aktif', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  completed: { label: 'Selesai', color: 'bg-gray-50 text-gray-700 border-gray-200' },
                  cancelled: { label: 'Dibatalkan', color: 'bg-red-50 text-red-700 border-red-200' },
                }
                const status = statusMap[match.status] || { label: match.status, color: '' }

                return (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">{match.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        Pengajar: {match.tutors?.user_profiles?.name || '-'}
                      </p>
                      {match.start_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Mulai: {new Date(match.start_date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={`${status.color} border text-xs`}>
                      {status.label}
                    </Badge>
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
