'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import TutorAssessmentStatus from '@/components/dashboard/tutor/assessment-status'
import TutorProfile from '@/components/dashboard/tutor/tutor-profile'
import { createClient } from '@/lib/auth'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const STATUS_CONFIG = {
  pending: { label: 'Menunggu Verifikasi', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  approved: { label: 'Disetujui', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  rejected: { label: 'Ditolak', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  suspended: { label: 'Ditangguhkan', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
}

export default function ApplicationsPage() {
  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState<any>(null)
  const [tutor, setTutor] = useState<any>(null)
  const [curationProgress, setCurationProgress] = useState<any>(null)

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
            specializations,
            experience_years,
            hourly_rate,
            users_profile:user_id(full_name, email)
          `)
          .eq('user_id', user.id)
          .single()

        setTutor(tutorData)

        if (tutorData?.id) {
          const { data: appData } = await supabase
            .from('tutor_applications')
            .select('*')
            .eq('tutor_id', tutorData.id)
            .single()

          setApplication(appData)

          const { data: progress } = await supabase
            .from('curation_progress')
            .select('*')
            .eq('tutor_id', tutorData.id)
            .single()

          setCurationProgress(progress)
        }
      } catch (err) {
        console.error('Error fetching application data:', err)
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

  const completedSteps: string[] = curationProgress?.completed_steps || []
  const curationPercent = Math.round((completedSteps.length / 5) * 100)
  const statusConfig = STATUS_CONFIG[tutor?.approval_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Aplikasi Pengajar</h1>
        <p className="text-muted-foreground">
          Pantau status aplikasi dan kurasi Anda sebagai pengajar di EduStory.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground mb-1">Status Aplikasi</p>
          <Badge variant="outline" className={`${statusConfig.color} border text-sm`}>
            {statusConfig.label}
          </Badge>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-muted-foreground mb-1">Tahapan Kurasi</p>
          <p className="text-2xl font-bold text-foreground">{completedSteps.length}/5</p>
          <Progress value={curationPercent} className="h-1.5 mt-2" />
        </Card>

        <Card className="p-5">
          <p className="text-sm text-muted-foreground mb-1">Verifikasi</p>
          {tutor?.verified ? (
            <Badge className="bg-green-500 hover:bg-green-600">✓ Terverifikasi</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Belum Terverifikasi</Badge>
          )}
        </Card>
      </div>

      {application?.status === 'rejected' && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            Aplikasi Anda ditolak. Alasan: {application?.rejection_reason || 'Tidak ada keterangan.'}
          </AlertDescription>
        </Alert>
      )}

      {tutor?.approval_status === 'approved' && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
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
          <TutorAssessmentStatus />
        </TabsContent>

        <TabsContent value="profile">
          <TutorProfile />
        </TabsContent>
      </Tabs>
    </div>
  )
}
