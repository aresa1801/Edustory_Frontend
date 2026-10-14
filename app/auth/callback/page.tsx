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
      console.log('[Callback] Already processed, skipping...')
      return
    }
    hasProcessed.current = true
    console.log('[Callback] 🚀 Starting callback processing...')

    const handleCallback = async () => {
      try {
        const supabase = createClient()

        // Handle token from URL (implicit flow)
        const searchParams = new URLSearchParams(window.location.search)
        const access_token = searchParams.get('access_token')
        const refresh_token = searchParams.get('refresh_token')
        if (access_token && refresh_token) {
          console.log('[Callback] Setting session from tokens...')
          await supabase.auth.setSession({ access_token, refresh_token })
        }

        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('[Callback] Session:', session?.user?.email)
        if (sessionError || !session) {
          console.log('[Callback] ❌ No session found')
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

        console.log('[Callback] ✅ User validated:', currentUser.email)

        // Admin
        if (currentUser.email === ADMIN_EMAIL) {
          console.log('[Callback] 👑 Admin detected')
          window.location.href = '/dashboard/admin'
          return
        }

        // Cek profile dengan try-catch untuk menghindari error RLS
        console.log('[Callback] 🔍 Checking user profile in database...')
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
          console.log('[Callback] ⚠️ Profile error, treating as new user')
          window.location.href = '/auth/select-role'
          return
        }

        console.log('[Callback] Profile data:', userProfile)

        if (!userProfile || !userProfile.role) {
          console.log('[Callback] 🆕 New user → redirect to select-role')
          await new Promise(resolve => setTimeout(resolve, 500))
          window.location.href = '/auth/select-role'
          return
        }

        const role = userProfile.role as string
        console.log('[Callback] ✅ User has role:', role)
        const dashboardPath = ROLE_TO_DASHBOARD[role]
        if (!dashboardPath) {
          console.warn('[Callback] ⚠️ Unknown role:', role)
          window.location.href = '/auth/select-role'
        } else {
          console.log('[Callback] 🎯 Redirecting to dashboard:', dashboardPath)
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <h1 className="text-xl font-semibold text-foreground">Sedang memproses...</h1>
          <p className="text-muted-foreground mt-2">Silakan tunggu sebentar</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="surface w-full max-w-md p-8 text-center">
          <h1 className="mb-2 font-display text-xl font-extrabold tracking-tight text-foreground">Terjadi Kesalahan</h1>
          <p className="mb-6 text-muted-foreground">{error}</p>
          <button
            onClick={() => {
              localStorage.clear()
              sessionStorage.clear()
              window.location.href = '/?error_cleared=1'
            }}
            className="inline-block rounded-xl bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Clear Cache & Kembali
          </button>
        </div>
      </div>
    )
  }

  return null
}