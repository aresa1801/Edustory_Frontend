'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getDashboardPath, isAdminEmail } from '@/lib/auth/role-utils'

/**
 * Dashboard index route — checks authentication and role, then redirects
 * to the appropriate sub-dashboard. The middleware already guards this route
 * for unauthenticated users, so we only need to handle role resolution here.
 */
export default function DashboardRouter() {
  const router = useRouter()
  const { user, userRole, loading, profileExists } = useAuth()

  useEffect(() => {
    if (loading) return

    // No user — middleware should catch this, but just in case:
    if (!user) {
      router.replace('/auth/login')
      return
    }

    // Admin bypass — skip role check
    if (isAdminEmail(user.email)) {
      router.replace('/dashboard/admin')
      return
    }

    // User exists but profile doesn't (new Google user or deleted profile) — send to select-role
    if (!profileExists) {
      console.warn('[Dashboard] User profile not found, redirecting to select-role')
      router.replace('/auth/select-role')
      return
    }

    // No role yet — send to role selection
    if (!userRole) {
      router.replace('/auth/select-role')
      return
    }

    // User has a role — go to their dashboard
    const dashboardPath = getDashboardPath(userRole)
    if (dashboardPath) {
      router.replace(dashboardPath)
    }
  }, [loading, user, userRole, profileExists, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Memuat dashboard...</p>
      </div>
    </div>
  )
}
