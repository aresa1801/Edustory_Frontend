'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // User sudah login, cek role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile?.role) {
          // Sudah punya role, redirect ke dashboard
          const dashboardPath = profile.role === 'siswa' 
            ? '/dashboard/student' 
            : profile.role === 'tutor'
            ? '/dashboard/tutor'
            : '/dashboard/admin'
          
          router.replace(dashboardPath)
          return
        } else {
          // Belum punya role, redirect ke select role
          router.replace('/auth/select-role')
          return
        }
      }
      
      setIsLoading(false)
    }

    checkAuthAndRedirect()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Landing page content untuk user yang belum login
  return (
    <div className="min-h-screen">
      {/* ... konten landing page Anda ... */}
      <button 
        onClick={() => router.push('/auth/login')}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
      >
        Mulai Belajar
      </button>
    </div>
  )
}