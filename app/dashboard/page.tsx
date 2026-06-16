'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Spinner } from '@/components/ui/spinner'

export default function DashboardRouter() {
  const router = useRouter()
  const { user, userRole, loading } = useAuth()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Jangan lakukan apa-apa jika masih loading atau sedang redirecting
    if (loading || isRedirecting) return

    // Jika tidak ada user, redirect ke login
    if (!user) {
      router.replace('/auth/login')
      return
    }

    // Jika user ada tapi role belum tersedia, tunggu sebentar
    if (!userRole) {
      // Tunggu maksimal 3 detik untuk role tersedia
      const timeout = setTimeout(() => {
        if (!userRole) {
          // Jika setelah 3 detik role masih null, anggap sebagai student
          // atau redirect ke halaman select-role
          router.replace('/auth/select-role')
        }
      }, 3000)
      
      return () => clearTimeout(timeout)
    }

    // Redirect berdasarkan role
    setIsRedirecting(true)
    switch (userRole) {
      case 'admin':
        router.replace('/dashboard/admin')
        break
      case 'tutor':
        router.replace('/dashboard/tutor')
        break
      case 'student':
        router.replace('/dashboard/student')
        break
      default:
        // Role tidak dikenali, kembali ke login
        router.replace('/auth/login')
    }
  }, [user, userRole, loading, router, isRedirecting])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Spinner className="h-8 w-8 mx-auto mb-4" />
        <p className="text-muted-foreground">Memuat dashboard Anda...</p>
      </div>
    </div>
  )
}