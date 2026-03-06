'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import StudentBrowseTutors from '@/components/dashboard/student/browse-tutors'
import StudentMyMatches from '@/components/dashboard/student/my-matches'
import StudentProfile from '@/components/dashboard/student/student-profile'
import { getCurrentUser } from '@/lib/auth'

export default function StudentDashboard() {
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
            Dashboard Siswa
          </h1>
          <p className="text-muted-foreground">
            Selamat datang, siswa! Temukan pengajar terbaik untuk Anda
          </p>
        </div>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="browse">Cari Pengajar</TabsTrigger>
            <TabsTrigger value="matches">Pencocokan Saya</TabsTrigger>
            <TabsTrigger value="profile">Profil Saya</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <StudentBrowseTutors />
          </TabsContent>

          <TabsContent value="matches" className="space-y-4">
            <StudentMyMatches />
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <StudentProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
