'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Spinner } from '@/components/ui/spinner'

interface ProtectedLayoutProps {
  children: React.ReactNode
  allowedRoles?: ('student' | 'tutor' | 'admin')[]
}

export function ProtectedLayout({
  children,
  allowedRoles = ['student', 'tutor', 'admin'],
}: ProtectedLayoutProps) {
  const router = useRouter()
  const { user, userRole, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (userRole && !allowedRoles.includes(userRole)) {
      router.push('/dashboard')
      return
    }
  }, [user, userRole, loading, router, allowedRoles])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
