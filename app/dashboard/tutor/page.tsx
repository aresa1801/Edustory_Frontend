'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/auth'
import Link from 'next/link'
import { Users, Calendar, BarChart3, FileText, BookOpen, ArrowRight, GraduationCap } from 'lucide-react'

// Grade level hierarchy from lowest to highest
const GRADE_LEVEL_ORDER = [
  'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
  'SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9',
  'SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12',
]

export default function TutorDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [verifiedLevels, setVerifiedLevels] = useState<string[]>([])
  const [targetLevel, setTargetLevel] = useState<string | null>(null)
  const [stats, setStats] = useState({
    activeStudents: 0,
    pendingRequests: 0,
    completedSessions: 0,
    curationProgress: 0,
    curationDone: 0,
    curationTotal: 5,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { data: tutorData } = await supabase
          .from('tutors')
          .select(`
            id,
            approval_status,
            verified,
            target_grade_level,
            verified_grade_levels,
            user_profiles:user_id(name, email)
          `)
          .eq('user_id', user.id)
          .single()

        setProfile(tutorData)
        setVerifiedLevels(tutorData?.verified_grade_levels || [])
        setTargetLevel(tutorData?.target_grade_level || null)

        if (tutorData?.id) {
          const progressRes = await fetch('/api/assessments/progress')
          if (progressRes.ok) {
            const progressData = await progressRes.json()
            const completedSteps: string[] = progressData.progress?.completed_steps || []
            setStats(prev => ({
              ...prev,
              curationDone: completedSteps.length,
              curationTotal: 5,
              curationProgress: Math.round((completedSteps.length / 5) * 100),
            }))
          }

          const { data: matchData } = await supabase
            .from('matches')
            .select('id, status')
            .eq('tutor_id', tutorData.id)

          if (matchData) {
            setStats(prev => ({
              ...prev,
              activeStudents: matchData.filter(m => ['accepted', 'active'].includes(m.status)).length,
              pendingRequests: matchData.filter(m => m.status === 'pending').length,
              completedSessions: matchData.filter(m => m.status === 'completed').length,
            }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
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

  const assessmentComplete = stats.curationDone >= 5
  const isVerified = verifiedLevels.length > 0

  // Build a lookup map once for O(1) index access inside the reduce
  const gradeLevelIndex = new Map(GRADE_LEVEL_ORDER.map((lvl, i) => [lvl, i]))
  const highestIdx = verifiedLevels.reduce((best, lvl) => {
    const idx = gradeLevelIndex.get(lvl) ?? -1
    return idx > best ? idx : best
  }, -1)
  const nextUpgradeLevel =
    highestIdx >= 0 && highestIdx < GRADE_LEVEL_ORDER.length - 1
      ? GRADE_LEVEL_ORDER[highestIdx + 1]
      : null

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Dashboard Pengajar
        </h1>
        <p className="text-muted-foreground">
          Selamat datang, {profile?.user_profiles?.name || 'Pengajar'}! Kelola permintaan siswa dan pencocokan pembelajaran Anda.
        </p>
      </div>

      {!assessmentComplete && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertDescription className="text-amber-800">
            ⚠️ Harap selesaikan semua tahapan kurasi agar bisa menerima permintaan dari siswa.{' '}
            <Link href="/curation/progress" className="font-medium underline">
              Lihat status kurasi →
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Siswa Aktif</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeStudents}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Permintaan Masuk</p>
              <p className="text-2xl font-bold text-foreground">{stats.pendingRequests}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sesi Selesai</p>
              <p className="text-2xl font-bold text-foreground">{stats.completedSessions}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status Kurasi</p>
              <p className="text-2xl font-bold text-foreground">{stats.curationDone}/{stats.curationTotal}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Curation Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Progress Kurasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tahapan selesai</span>
                <span className="font-medium">{stats.curationDone} dari {stats.curationTotal}</span>
              </div>
              <Progress value={stats.curationProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">{stats.curationProgress}% selesai</p>
              {assessmentComplete ? (
                <Badge className="bg-green-500 hover:bg-green-600">✓ Kurasi Selesai</Badge>
              ) : (
                <Link href="/curation/progress">
                  <Button size="sm" variant="outline" className="mt-2">
                    Lanjutkan Kurasi <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Grade Level Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Kelas yang Diverifikasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isVerified ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Anda terverifikasi mengajar kelas-kelas berikut:
                </p>
                <div className="flex flex-wrap gap-2">
                  {GRADE_LEVEL_ORDER.filter(lvl => verifiedLevels.includes(lvl)).map(lvl => (
                    <Badge key={lvl} className="bg-green-100 text-green-700 border-green-300">
                      ✓ {lvl}
                    </Badge>
                  ))}
                </div>
                {nextUpgradeLevel && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium mb-1">
                      Ingin mengajar hingga {nextUpgradeLevel}?
                    </p>
                    <p className="text-xs text-blue-700 mb-3">
                      Selesaikan kurasi baru dengan target kelas {nextUpgradeLevel} untuk
                      mendapatkan verifikasi kelas yang lebih tinggi.
                    </p>
                    <Link href="/curation/progress">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        Mulai Kurasi Upgrade
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : assessmentComplete ? (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-yellow-800 text-sm">
                  Kurasi Anda sedang dalam peninjauan admin. Verifikasi kelas akan diberikan
                  setelah admin menyetujui hasil kurasi Anda (3–5 hari kerja).
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Selesaikan semua 5 tahap kurasi untuk mendapatkan verifikasi mengajar.
                </p>
                <p className="text-xs text-muted-foreground">
                  Kelas yang Anda targetkan:{' '}
                  <span className="font-semibold text-foreground">
                    {targetLevel ?? '(pilih pada tes kemampuan akademik)'}
                  </span>
                </p>
                <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                  💡 Setelah terverifikasi untuk kelas tertentu, Anda otomatis bisa mengajar
                  semua kelas di bawahnya.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Akses Cepat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href="/dashboard/tutor/applications">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Lihat Aplikasi Saya</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
          <Link href="/dashboard/tutor/my-students">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Kelola Siswa Saya</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
          <Link href="/dashboard/tutor/schedule">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Jadwal Mengajar</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
          <Link href="/dashboard/tutor/analytics">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Lihat Analitik</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
