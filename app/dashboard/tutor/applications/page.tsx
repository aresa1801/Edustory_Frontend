'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/auth'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Fallback sederhana
function TutorAssessmentStatusFallback() {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-muted-foreground">Status kurasi akan tampil di sini setelah Anda menyelesaikan profil.</p>
        <Link href="/dashboard/tutor/profile">
          <Button variant="outline" className="mt-3">Lengkapi Profil</Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function TutorProfileFallback() {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-muted-foreground">Profil Anda dapat dilengkapi di halaman profil.</p>
        <Link href="/dashboard/tutor/profile">
          <Button variant="outline" className="mt-3">Ke Halaman Profil</Button>
        </Link>
      </CardContent>
    </Card>
  )
}

const STATUS_CONFIG = {
  pending: { label: 'Menunggu Verifikasi', color: 'bg-warning/10 text-warning border-warning/20' },
  approved: { label: 'Disetujui', color: 'bg-secondary/10 text-secondary border-secondary/20' },
  rejected: { label: 'Ditolak', color: 'bg-destructive/10 text-destructive border-destructive/25' },
  suspended: { label: 'Ditangguhkan', color: 'bg-muted text-muted-foreground border-border' },
}

export default function ApplicationsPage() {
  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState<any>(null)
  const [tutor, setTutor] = useState<any>(null)
  const [curationProgress, setCurationProgress] = useState<any>(null)

  const isMounted = useRef(true)
  const timeoutId = useRef<NodeJS.Timeout | null>(null)
  const fetchDone = useRef(false)

  useEffect(() => {
    isMounted.current = true
    fetchDone.current = false

    timeoutId.current = setTimeout(() => {
      if (isMounted.current && loading) {
        console.warn('[Applications] ⏱️ Timeout, force loading=false')
        setLoading(false)
      }
    }, 3000)

    const fetchData = async () => {
      if (fetchDone.current) return
      fetchDone.current = true

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data: tutorData, error: tutorError } = await supabase
          .from('tutors')
          .select(`
            id,
            approval_status,
            verified,
            specializations,
            experience_years,
            hourly_rate,
            user_profiles!inner (name, email)
          `)
          .eq('user_id', user.id)
          .maybeSingle() // ✅ maybeSingle

        if (tutorError || !tutorData) {
          setTutor(null)
          return
        }

        setTutor(tutorData)

        if (tutorData.id) {
          const { data: appData } = await supabase
            .from('tutor_applications')
            .select('*')
            .eq('tutor_id', tutorData.id)
            .maybeSingle()

          setApplication(appData)

          const { data: progress } = await supabase
            .from('curation_progress')
            .select('*')
            .eq('tutor_id', tutorData.id)
            .maybeSingle()

          setCurationProgress(progress)
        }
      } catch (err) {
        console.error('[Applications] Error:', err)
      } finally {
        if (isMounted.current) {
          setLoading(false)
          if (timeoutId.current) clearTimeout(timeoutId.current)
        }
      }
    }

    fetchData()

    return () => {
      isMounted.current = false
      if (timeoutId.current) clearTimeout(timeoutId.current)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat data aplikasi...</p>
      </div>
    )
  }

  if (!tutor) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aplikasi Pengajar</h1>
          <p className="text-sm text-muted-foreground mt-1">Anda belum terdaftar sebagai pengajar.</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Silakan lengkapi profil Anda terlebih dahulu untuk memulai proses aplikasi.</p>
            <Link href="/dashboard/tutor/profile">
              <Button>Lengkapi Profil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completedSteps: string[] = curationProgress?.completed_steps || []
  const curationPercent = Math.min(Math.round((completedSteps.length / 5) * 100), 100)
  const statusConfig = STATUS_CONFIG[tutor.approval_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Aplikasi Pengajar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pantau status aplikasi dan kurasi Anda sebagai pengajar di EduStory.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Status Aplikasi</p>
          <Badge variant="outline" className={`${statusConfig.color} border text-sm`}>
            {statusConfig.label}
          </Badge>
        </Card>

        <Card className="rounded-2xl p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Tahapan Kurasi</p>
          <p className="text-2xl font-bold text-foreground">{completedSteps.length}/5</p>
          <Progress value={curationPercent} className="h-1.5 mt-2" />
        </Card>

        <Card className="rounded-2xl p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Verifikasi</p>
          {tutor.verified ? (
            <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary/90">✓ Terverifikasi</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Belum Terverifikasi</Badge>
          )}
        </Card>
      </div>

      {application?.status === 'rejected' && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Aplikasi Anda ditolak. Alasan: {application.rejection_reason || 'Tidak ada keterangan.'}
          </AlertDescription>
        </Alert>
      )}

      {tutor.approval_status === 'approved' && (
        <Alert className="mb-6 border-secondary/20 bg-secondary/10">
          <AlertDescription className="text-foreground">
            🎉 Selamat! Aplikasi Anda telah disetujui. Anda sekarang dapat menerima permintaan dari siswa.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="curation" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="curation">Status Kurasi</TabsTrigger>
          <TabsTrigger value="profile">Profil Saya</TabsTrigger>
        </TabsList>

        <TabsContent value="curation">
          <TutorAssessmentStatusFallback />
        </TabsContent>

        <TabsContent value="profile">
          <TutorProfileFallback />
        </TabsContent>
      </Tabs>
    </div>
  )
}