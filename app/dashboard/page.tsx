'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'

export default function DashboardRouter() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const supabase = createClient()
        
        // 1. Cek session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          console.log('No session, redirecting to login')
          router.replace('/auth/login')
          return
        }
        
        console.log('Session found for:', session.user.email)
        
        // 2. Cek profile dan role
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle() // Gunakan maybeSingle agar tidak error jika tidak ada data

        if (profileError) {
          console.error('Profile error:', profileError)
          router.replace('/auth/login')
          return
        }

        // 3. Jika belum punya role, ke select-role
        if (!profile?.role) {
          console.log('No role found, redirecting to select-role')
          router.replace('/auth/select-role')
          return
        }

        console.log('Role found:', profile.role)
        
        // 4. Map role ke dashboard path
        const roleMap: Record<string, string> = {
          'siswa': '/dashboard/student',
          'tutor': '/dashboard/tutor',
          'admin': '/dashboard/admin'
        }
        
        const dashboardPath = roleMap[profile.role]
        
        if (dashboardPath) {
          console.log('Redirecting to:', dashboardPath)
          router.replace(dashboardPath)
        } else {
          console.warn('Unknown role:', profile.role)
          router.replace('/auth/select-role')
        }
        
      } catch (err) {
        console.error('Unexpected error:', err)
        router.replace('/auth/login')
      }
    }

    checkAuthAndRedirect()
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