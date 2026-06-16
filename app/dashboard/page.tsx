'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'

export default function DashboardRouter() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const supabase = createClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        // Jika ada error saat cek session
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Sesi tidak valid. Silakan login ulang.')
          setIsLoading(false)
          return
        }
        
        // Jika TIDAK ada session (belum login)
        if (!session) {
          console.log('No session, redirecting to login')
          router.replace('/auth/login')
          return
        }
        
        // User sudah login, cek role di database
        console.log('Session found, checking profile...')
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        // Jika error saat fetch profile (mungkin profile belum ada)
        if (profileError) {
          console.warn('Profile error:', profileError.message)
          // Redirect ke select role untuk isi profile
          router.replace('/auth/select-role')
          return
        }

        // Jika profile ada dan punya role
        if (profile?.role) {
          console.log('Profile found with role:', profile.role)
          const dashboardPath = profile.role === 'siswa' 
            ? '/dashboard/student' 
            : profile.role === 'tutor'
            ? '/dashboard/tutor'
            : '/dashboard/admin'
          
          router.replace(dashboardPath)
          return
        } else {
          // Profile ada tapi role kosong/null
          console.log('Profile exists but no role, redirecting to select-role')
          router.replace('/auth/select-role')
          return
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Terjadi kesalahan. Silakan coba lagi.')
        setIsLoading(false)
      }
    }

    checkAuthAndRedirect()
  }, [router])

  // Show loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error if any
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Oops!</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => router.replace('/auth/login')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    )
  }

  // Fallback (seharusnya tidak sampai sini)
  return null
}