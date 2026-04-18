'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import TutorMatchRequests from '@/components/dashboard/tutor/match-requests'
import TutorMyMatches from '@/components/dashboard/tutor/my-matches'
import TutorProfile from '@/components/dashboard/tutor/tutor-profile'
import TutorAssessmentStatus from '@/components/dashboard/tutor/assessment-status'
import { createClient } from '@/lib/auth'

export default function TutorDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assessmentComplete, setAssessmentComplete] = useState(false)

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
            users_profile:user_id(full_name, email)
          `)
          .eq('user_id', user.id)
          .single()

        setProfile(tutorData)

        if (tutorData?.id) {
          const { data: progress } = await supabase
            .from('curation_progress')
            .select('completed_steps')
            .eq('tutor_id', tutorData.id)
            .single()

          const completedSteps: string[] = progress?.completed_steps || []
          setAssessmentComplete(completedSteps.length >= 5)
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Dashboard Pengajar
        </h1>
        <p className="text-muted-foreground">
          Selamat datang, {profile?.users_profile?.full_name || 'Pengajar'}! Kelola permintaan siswa dan pencocokan pembelajaran Anda.
        </p>
      </div>

      {!assessmentComplete && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertDescription className="text-amber-800">
            ⚠️ Harap selesaikan semua tahapan kurasi agar bisa menerima permintaan dari siswa.{' '}
            <a href="/curation/progress" className="font-medium underline">
              Lihat status kurasi →
            </a>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="assessment" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="assessment">Status Kurasi</TabsTrigger>
          <TabsTrigger value="requests">Permintaan Siswa</TabsTrigger>
          <TabsTrigger value="matches">Pencocokan Aktif</TabsTrigger>
          <TabsTrigger value="profile">Profil Saya</TabsTrigger>
        </TabsList>

        <TabsContent value="assessment" className="space-y-4">
          <TutorAssessmentStatus />
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <TutorMatchRequests />
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          <TutorMyMatches />
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <TutorProfile />
        </TabsContent>
      </Tabs>
    </div>
  )
}
