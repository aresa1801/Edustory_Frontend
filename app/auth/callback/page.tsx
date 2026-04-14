'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          router.push('/auth/login')
          return
        }

        // Check if user is admin
        if (session.user.email === 'storyaunty.evi@gmail.com') {
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
          // User doesn't exist yet, redirect to role selection
          router.push('/auth/select-role')
          return
        }

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError
        }

        // Redirect to appropriate dashboard based on role
        if (userProfile) {
          const role = userProfile.role as string
          router.push(`/dashboard/${role}`)
        } else {
          router.push('/auth/select-role')
        }
      } catch (err) {
        console.error('Callback error:', err)
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
