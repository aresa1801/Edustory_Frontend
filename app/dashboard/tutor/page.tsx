'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import TutorMatchRequests from '@/components/dashboard/tutor/match-requests'
import TutorMyMatches from '@/components/dashboard/tutor/my-matches'
import TutorProfile from '@/components/dashboard/tutor/tutor-profile'
import { getCurrentUser } from '@/lib/auth'

export default function TutorDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Failed to fetch user:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertDescription>
            Anda harus login terlebih dahulu
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Dashboard Pengajar
          </h1>
          <p className="text-muted-foreground">
            Kelola permintaan siswa dan pencocokan pembelajaran Anda
          </p>
        </div>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="requests">Permintaan Siswa</TabsTrigger>
            <TabsTrigger value="matches">Pencocokan Aktif</TabsTrigger>
            <TabsTrigger value="profile">Profil Saya</TabsTrigger>
          </TabsList>

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
    </div>
  )
}
