'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/auth'
import { ADMIN_EMAIL } from '@/lib/constants'

const ROLE_TO_DASHBOARD: Record<string, string> = {
  siswa: 'student',
  student: 'student',
  tutor: 'tutor',
  admin: 'admin',
}

export default function AuthCallback() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasProcessed = useRef(false)

  useEffect(() => {
    if (hasProcessed.current) {
      return
    }
    hasProcessed.current = true

    const handleCallback = async () => {
      try {
        const supabase = createClient()

        // Handle token from URL (implicit flow)
        const searchParams = new URLSearchParams(window.location.search)
        const access_token = searchParams.get('access_token')
        const refresh_token = searchParams.get('refresh_token')
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
        }

        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          window.location.href = '/auth/login'
          return
        }

        // Get user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
        if (userError || !currentUser) {
          console.warn('[Callback] ❌ User not valid, clearing session...')
          await supabase.auth.signOut({ scope: 'global' })
          localStorage.clear()
          sessionStorage.clear()
          window.location.href = '/?session_invalid=1'
          return
        }

        // Admin
        if (currentUser.email === ADMIN_EMAIL) {
          window.location.href = '/dashboard/admin'
          return
        }

        // Cek profile dengan try-catch untuk menghindari error RLS
        let userProfile = null
        let profileError = null
        try {
          const result = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', currentUser.id)
            .maybeSingle()
          userProfile = result.data
          profileError = result.error
        } catch (err) {
          profileError = err
          console.error('[Callback] Profile fetch exception:', err)
        }

        if (profileError) {
          console.error('[Callback] Profile error:', profileError)
          // Jika error karena RLS, anggap user baru
          window.location.href = '/auth/select-role'
          return
        }

        if (!userProfile || !userProfile.role) {
          await new Promise(resolve => setTimeout(resolve, 500))
          window.location.href = '/auth/select-role'
          return
        }

        const role = userProfile.role as string
        const dashboardPath = ROLE_TO_DASHBOARD[role]
        if (!dashboardPath) {
          console.warn('[Callback] ⚠️ Unknown role:', role)
          window.location.href = '/auth/select-role'
        } else {
          window.location.href = `/dashboard/${dashboardPath}`
        }
      } catch (err) {
        console.error('[Callback] ❌ Error:', err)
        setError('Terjadi kesalahan saat memproses autentikasi')
        try {
          const supabase = createClient()
          await supabase.auth.signOut({ scope: 'global' })
          localStorage.clear()
          sessionStorage.clear()
        } catch (e) {
          console.error('[Callback] Failed to clear session:', e)
        } finally {
          setLoading(false)
        }
      }
    }

    handleCallback()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground">Sedang memproses...</h1>
          <p className="text-muted-foreground mt-2">Silakan tunggu sebentar</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5 p-4">
        <div className="bg-card rounded-2xl border border-border/50 p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">Terjadi Kesalahan</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => {
              localStorage.clear()
              sessionStorage.clear()
              window.location.href = '/?error_cleared=1'
            }}
            className="inline-block px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
          >
            Clear Cache & Kembali
          </button>
        </div>
      </div>
    )
  }

  return null
}