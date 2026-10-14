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
import { PageHeader, StatCard, TonePill, EmptyState } from '@/components/dashboard/ui'
import { ClipboardList, ShieldCheck, BadgeCheck } from 'lucide-react'

// Fallback sederhana
function TutorAssessmentStatusFallback() {
  return (
    <Card className="surface rounded-2xl shadow-soft">
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
    <Card className="surface rounded-2xl shadow-soft">
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
  pending: { label: 'Menunggu Verifikasi', tone: 'accent' },
  approved: { label: 'Disetujui', tone: 'secondary' },
  rejected: { label: 'Ditolak', tone: 'danger' },
  suspended: { label: 'Ditangguhkan', tone: 'muted' },
} as const

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
        <PageHeader
          eyebrow="Portal Pengajar"
          title="Aplikasi Pengajar"
          description="Anda belum terdaftar sebagai pengajar."
        />
        <Card className="surface rounded-2xl shadow-soft">
          <EmptyState
            icon={ClipboardList}
            title="Belum ada aplikasi"
            description="Silakan lengkapi profil Anda terlebih dahulu untuk memulai proses aplikasi."
            action={
              <Link href="/dashboard/tutor/profile">
                <Button>Lengkapi Profil</Button>
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  const completedSteps: string[] = curationProgress?.completed_steps || []
  const curationPercent = Math.min(Math.round((completedSteps.length / 5) * 100), 100)
  const statusConfig = STATUS_CONFIG[tutor.approval_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Portal Pengajar"
        title="Aplikasi Pengajar"
        description="Pantau status aplikasi dan kurasi Anda sebagai pengajar di EduStory."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Status Aplikasi"
          value={<TonePill tone={statusConfig.tone}>{statusConfig.label}</TonePill>}
          icon={BadgeCheck}
          tone="primary"
        />

        <StatCard
          label="Tahapan Kurasi"
          value={`${completedSteps.length}/5`}
          hint={<Progress value={curationPercent} className="h-1.5 mt-2" />}
          icon={ClipboardList}
          tone="accent"
        />

        <StatCard
          label="Verifikasi"
          value={
            tutor.verified ? (
              <TonePill tone="secondary">✓ Terverifikasi</TonePill>
            ) : (
              <TonePill tone="muted">Belum Terverifikasi</TonePill>
            )
          }
          icon={ShieldCheck}
          tone="secondary"
        />
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