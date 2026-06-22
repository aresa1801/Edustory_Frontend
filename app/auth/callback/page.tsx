'use client'

import { useEffect, useState, useRef } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasProcessed = useRef(false) // ✅ PAKAI REF, BUKAN STATE

  useEffect(() => {
    // Prevent multiple executions dengan ref
    if (hasProcessed.current) {
      console.log('[Callback] Already processed, skipping...')
      return
    }
    
    hasProcessed.current = true
    console.log('[Callback] 🚀 Starting callback processing...')

    const handleCallback = async () => {
      try {
        const supabase = createClient()

        // Handle implicit flow: access_token + refresh_token
        const searchParams = new URLSearchParams(window.location.search)
        const access_token = searchParams.get('access_token')
        const refresh_token = searchParams.get('refresh_token')
        
        if (access_token && refresh_token) {
          console.log('[Callback] Setting session from tokens...')
          await supabase.auth.setSession({ access_token, refresh_token })
        }

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('[Callback] Session:', session?.user?.email)

        if (sessionError || !session) {
          console.log('[Callback] ❌ No session found')
          window.location.href = '/auth/login'
          return
        }

        // VALIDASI: Cek apakah user masih valid
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

        // Check if user is admin
        if (currentUser.email === ADMIN_EMAIL) {
          console.log('[Callback] 👑 Admin detected')
          window.location.href = '/dashboard/admin'
          return
        }

        // Check if user has a role in the database
        console.log('[Callback] 🔍 Checking user profile in database...')
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (profileError) {
          console.error('[Callback] Profile error:', profileError)
        }

        console.log('[Callback] Profile data:', userProfile)

        if (!userProfile || !userProfile.role) {
          // User doesn't have role yet → redirect to select-role
          console.log('[Callback] 🆕 New user → redirect to select-role')
          window.location.href = '/auth/select-role'
          return
        }

        // User sudah punya role → redirect ke dashboard
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
        
        // Clear session on error
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
  }, []) // ✅ EMPTY DEPENDENCY ARRAY - hanya run sekali

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