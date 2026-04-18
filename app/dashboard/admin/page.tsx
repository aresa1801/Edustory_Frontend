'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import AdminTutorCuration from '@/components/dashboard/admin/tutor-curation'
import AdminUsersManagement from '@/components/dashboard/admin/users-management'
import AdminStatistics from '@/components/dashboard/admin/statistics'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/auth'

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)

        if (currentUser) {
          const supabase = createClient()
          const { data } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single()

          setIsAdmin(data?.role === 'admin')
        }
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

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertDescription>
            Anda harus login sebagai admin untuk mengakses halaman ini
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
            Dashboard Admin
          </h1>
          <p className="text-muted-foreground">
            Kelola platform EduStory dan verifikasi pengajar
          </p>
        </div>

        <Tabs defaultValue="curation" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="curation">Kurasi Pengajar</TabsTrigger>
            <TabsTrigger value="users">Kelola Pengguna</TabsTrigger>
            <TabsTrigger value="statistics">Statistik</TabsTrigger>
          </TabsList>

          <TabsContent value="curation" className="space-y-4">
            <AdminTutorCuration />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <AdminUsersManagement />
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <AdminStatistics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
