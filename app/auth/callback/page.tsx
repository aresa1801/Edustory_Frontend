'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'
import { isAdminEmail, toAppRole, getDashboardPath } from '@/lib/auth/role-utils'

export default function AuthCallback() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient()

        // Handle implicit flow tokens passed as query params
        const searchParams = new URLSearchParams(window.location.search)
        const access_token = searchParams.get('access_token')
        const refresh_token = searchParams.get('refresh_token')
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
        }

        // Get or exchange session (PKCE handled automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          console.log('[AuthCallback] No session, redirecting to login')
          router.push('/auth/login')
          return
        }

        console.log('[AuthCallback] Session found:', session.user.email)

        // Check if email is confirmed (important for email/password signups)
        if (session.user.email && !session.user.email_confirmed_at) {
          console.log('[AuthCallback] Email not confirmed yet')
          setError('Silakan verifikasi email Anda terlebih dahulu. Periksa inbox Anda untuk kode verifikasi.')
          setLoading(false)
          return
        }

        // Admin bypass — skip role selection entirely
        if (isAdminEmail(session.user.email)) {
          console.log('[AuthCallback] Admin user detected')
          router.push('/dashboard/admin')
          return
        }

        // Check existing profile
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError
        }

        console.log('[AuthCallback] Profile check:', userProfile)

        // User already has a role — redirect to their dashboard
        if (userProfile?.role) {
          console.log('[AuthCallback] User has role:', userProfile.role)
          const appRole = toAppRole(userProfile.role as string)
          const dashboardPath = getDashboardPath(appRole)
          router.push(dashboardPath ?? '/auth/select-role')
          return
        }

        // New user — check for a pending role from localStorage (set before OAuth redirect)
        const pendingRole = typeof window !== 'undefined'
          ? localStorage.getItem('pendingRole')
          : null

        console.log('[AuthCallback] Pending role:', pendingRole)

        if (pendingRole === 'student' || pendingRole === 'tutor') {
          localStorage.removeItem('pendingRole')

          console.log('[AuthCallback] Creating profile with pending role:', pendingRole)

          const setRoleRes = await fetch('/api/auth/set-role', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `******
            },
            body: JSON.stringify({ role: pendingRole }),
          })

          if (setRoleRes.ok) {
            console.log('[AuthCallback] Profile created successfully')
            const dashboardPath = getDashboardPath(pendingRole)
            router.push(dashboardPath ?? '/dashboard')
            return
          } else {
            const errorData = await setRoleRes.json()
            console.error('[AuthCallback] Failed to create profile:', errorData)
          }
          // API failed — fall through to select-role
        }

        // No role yet — let user pick
        console.log('[AuthCallback] No role found, redirecting to select-role')
        router.push('/auth/select-role')
      } catch (err) {
        console.error('[AuthCallback] Error:', err)
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
