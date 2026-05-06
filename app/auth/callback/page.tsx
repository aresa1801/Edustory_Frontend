'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'

// Map DB role values to dashboard route segments
const ROLE_TO_DASHBOARD: Record<string, string> = {
  siswa: 'student',
  student: 'student',
  tutor: 'tutor',
  admin: 'admin',
}

export default function AuthCallback() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Use the SSR-aware browser client so the session is persisted in cookies,
        // which is required by the dashboard layouts that also use createClient().
        const supabase = createClient()

        // Handle implicit flow: access_token + refresh_token may be passed as query
        // params (older Supabase redirect) or in the URL hash.  For PKCE flow the
        // SSR client's getSession() will automatically exchange the code param.
        const searchParams = new URLSearchParams(window.location.search)
        const access_token = searchParams.get('access_token')
        const refresh_token = searchParams.get('refresh_token')
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
        }

        // Get the current session (also handles PKCE code exchange automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('[v0] Auth Callback - Session:', session?.user.email, 'Provider:', session?.user.app_metadata?.provider)

        if (sessionError || !session) {
          console.log('[v0] No session found, redirecting to login')
          router.push('/auth/login')
          return
        }

        // Check if user is admin
        if (session.user.email === 'storyaunty.evi@gmail.com') {
          console.log('[v0] Admin detected, redirecting to admin dashboard')
          router.push('/dashboard/admin')
          return
        }

        // Check if user has a role in the database
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profileError && profileError.code === 'PGRST116') {
          // User doesn't exist yet — redirect to role selection regardless of provider.
          // The select-role page will create the profile (with Google metadata) when the
          // user picks a role, so no separate register step is needed.
          const provider = session.user.app_metadata?.provider
          console.log('[v0] User profile not found, provider:', provider, '— redirecting to select-role')
          router.push('/auth/select-role')
          return
        }

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError
        }

        // Redirect to appropriate dashboard based on role
        if (userProfile) {
          const role = userProfile.role as string
          console.log('[v0] User profile found with role:', role)
          // Map DB role values (e.g. 'siswa') back to dashboard route segments
          const dashboardPath = ROLE_TO_DASHBOARD[role]
          if (!dashboardPath) {
            console.warn('[v0] Unknown role value from DB:', role, '— redirecting to select-role')
            router.push('/auth/select-role')
          } else {
            router.push(`/dashboard/${dashboardPath}`)
          }
        } else {
          console.log('[v0] No role found, redirecting to select-role')
          router.push('/auth/select-role')
        }
      } catch (err) {
        console.error('[v0] Callback error:', err)
        setError('Terjadi kesalahan saat memproses autentikasi')
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4"></div>
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
          <a
            href="/auth/login"
            className="inline-block px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
          >
            Kembali ke Login
          </a>
        </div>
      </div>
    )
  }

  return null
}
