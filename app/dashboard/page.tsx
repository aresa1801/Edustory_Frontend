'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Spinner } from '@/components/ui/spinner'

export default function DashboardRouter() {
  const router = useRouter()
  const { user, userRole, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push('/login')
      return
    }

    // Route berdasarkan role user
    switch (userRole) {
      case 'student':
        router.push('/dashboard/student')
        break
      case 'tutor':
        router.push('/dashboard/tutor')
        break
      case 'admin':
        router.push('/dashboard/admin')
        break
      default:
        router.push('/login')
    }
  }, [user, userRole, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Spinner className="h-8 w-8 mx-auto mb-4" />
        <p className="text-muted-foreground">Memuat dashboard Anda...</p>
      </div>
    </div>
  )
}
