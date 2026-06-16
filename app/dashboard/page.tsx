'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'

export default function DashboardRouter() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let retryCount = 0
    const maxRetries = 3

    const checkAuthAndRedirect = async () => {
      while (retryCount < maxRetries && isMounted) {
        try {
          const supabase = createClient()
          
          // Tunggu sebentar untuk memastikan session siap
          await new Promise(resolve => setTimeout(resolve, 100))
          
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (!isMounted) return
          
          // Jika tidak ada session
          if (!session) {
            console.log('No session found, redirecting to login')
            router.replace('/auth/login')
            return
          }
          
          console.log('Session found for user:', session.user.email)
          
          // Cek profile dengan retry
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

          if (!isMounted) return

          if (profileError) {
            console.warn('Profile fetch error:', profileError.message)
            retryCount++
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount))
            continue
          }

          if (!profile?.role) {
            console.log('No role found, redirecting to select-role')
            router.replace('/auth/select-role')
            return
          }

          console.log('Profile found with role:', profile.role)
          
          // Map role ke dashboard path
          const roleMap: Record<string, string> = {
            'siswa': '/dashboard/student',
            'tutor': '/dashboard/tutor',
            'admin': '/dashboard/admin'
          }
          
          const dashboardPath = roleMap[profile.role] || '/auth/select-role'
          router.replace(dashboardPath)
          return
          
        } catch (err) {
          console.error(`Attempt ${retryCount + 1} failed:`, err)
          retryCount++
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount))
        }
      }
      
      // Jika semua retry gagal
      if (isMounted) {
        console.error('All authentication attempts failed')
        router.replace('/auth/login')
      }
    }

    checkAuthAndRedirect()

    return () => {
      isMounted = false
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Memuat dashboard...</p>
      </div>
    </div>
  )
}