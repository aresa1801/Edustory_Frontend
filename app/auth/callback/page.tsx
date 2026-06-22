'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'
import { ADMIN_EMAIL } from '@/lib/constants'

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
        const supabase = createClient()

        // Handle implicit flow: access_token + refresh_token
        const searchParams = new URLSearchParams(window.location.search)
        const access_token = searchParams.get('access_token')
        const refresh_token = searchParams.get('refresh_token')
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
        }

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('[Callback] Session:', session?.user.email, 'Provider:', session?.user.app_metadata?.provider)

        if (sessionError || !session) {
          console.log('[Callback] No session found, redirecting to login')
          router.push('/auth/login')
          return
        }

        // VALIDASI: Cek apakah user masih valid di database
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !currentUser) {
          console.warn('[Callback] User not valid, clearing session...')
          await supabase.auth.signOut({ scope: 'global' })
          // Clear localStorage
          localStorage.clear()
          sessionStorage.clear()
          // Redirect ke home
          router.push('/?session_invalid=1')
          return
        }

        // Check if user is admin
        if (session.user.email === ADMIN_EMAIL) {
          console.log('[Callback] Admin detected, redirecting to admin dashboard')
          router.push('/dashboard/admin')
          return
        }

        // Check if user has a role in the database
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profileError) {
          console.error('[Callback] Profile error:', profileError)
        }

        if (!userProfile || !userProfile.role) {
          // User doesn't have profile yet - check pending role
          const provider = session.user.app_metadata?.provider
          console.log('[Callback] User profile not found, provider:', provider)

          const pendingRole = typeof window !== 'undefined'
            ? localStorage.getItem('pendingRole')
            : null

          if (pendingRole === 'student' || pendingRole === 'tutor') {
            console.log('[Callback] pendingRole found:', pendingRole, '— creating profile')
            localStorage.removeItem('pendingRole')

            // Create the profile with the pre-selected role
            const setRoleRes = await fetch('/api/auth/set-role', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ role: pendingRole }),
            })

            if (setRoleRes.ok) {
              if (pendingRole === 'student') {
                router.push('/dashboard/student/onboarding')
              } else {
                router.push('/dashboard/tutor')
              }
              return
            }
            console.warn('[Callback] set-role API failed, falling back to select-role')
          }

          // No pending role - let the user pick their role manually
          console.log('[Callback] Redirecting to select-role')
          router.push('/auth/select-role')
          return
        }

        // Redirect to appropriate dashboard based on role
        const role = userProfile.role as string
        console.log('[Callback] User profile found with role:', role)
        const dashboardPath = ROLE_TO_DASHBOARD[role]
        
        if (!dashboardPath) {
          console.warn('[Callback] Unknown role value from DB:', role, '— redirecting to select-role')
          router.push('/auth/select-role')
        } else {
          router.push(`/dashboard/${dashboardPath}`)
        }
        
      } catch (err) {
        console.error('[Callback] Error:', err)
        setError('Terjadi kesalahan saat memproses autentikasi')
        
        // Clear session on error
        try {
          const supabase = createClient()
          await supabase.auth.signOut({ scope: 'global' })
          localStorage.clear()
          sessionStorage.clear()
        } catch (e) {
          console.error('[Callback] Failed to clear session:', e)
        }
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