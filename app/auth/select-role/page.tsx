'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, UserCog, Loader2, AlertCircle } from 'lucide-react'

export default function SelectRolePage() {
  const router = useRouter()
  const { user, isFirstTimeUser, clearFirstTimeUserFlag } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let isMounted = true
    let checkTimeout: NodeJS.Timeout

    const checkUserAndRole = async () => {
      console.log('[SelectRole] Checking user and role...')
      
      // Timeout 10 detik untuk prevent stuck
      checkTimeout = setTimeout(() => {
        if (isMounted && checking) {
          console.warn('[SelectRole] Check timeout, forcing redirect to home')
          setChecking(false)
          router.push('/?check_timeout=1')
        }
      }, 10000)

      try {
        if (!user) {
          console.log('[SelectRole] No user found, redirecting to home')
          if (isMounted) {
            setChecking(false)
            router.push('/?no_user=1')
          }
          return
        }

        const supabase = createClient()
        
        // Cek apakah user sudah punya profile di database
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('[SelectRole] Profile check error:', profileError)
        }

        console.log('[SelectRole] Profile data:', profile)

        // Jika sudah punya role, redirect ke dashboard
        if (profile?.role) {
          console.log('[SelectRole] User already has role:', profile.role)
          if (isMounted) {
            clearTimeout(checkTimeout)
            setChecking(false)
            
            const dashboardPath = profile.role === 'siswa' || profile.role === 'student'
              ? '/dashboard/student' 
              : profile.role === 'tutor'
              ? '/dashboard/tutor'
              : '/dashboard/admin'
            
            router.push(dashboardPath)
          }
          return
        }

        // User belum punya role, tampilkan halaman select role
        console.log('[SelectRole] User has no role, showing select role page')
        if (isMounted) {
          clearTimeout(checkTimeout)
          setChecking(false)
        }

      } catch (err) {
        console.error('[SelectRole] Error checking user:', err)
        if (isMounted) {
          clearTimeout(checkTimeout)
          setChecking(false)
          setError('Gagal memeriksa data user. Silakan coba lagi.')
        }
      }
    }

    checkUserAndRole()

    return () => {
      isMounted = false
      if (checkTimeout) clearTimeout(checkTimeout)
    }
  }, [user, router, checking])

  const handleSelectRole = async (role: 'student' | 'tutor') => {
    if (!user) {
      setError('User tidak ditemukan. Silakan login ulang.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // Map frontend role to database role
      const dbRole = role === 'student' ? 'siswa' : 'tutor'

      console.log('[SelectRole] Saving role:', { userId: user.id, role: dbRole })

      // Cek apakah profile sudah ada
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      let result

      if (existingProfile) {
        // Update existing profile
        console.log('[SelectRole] Updating existing profile')
        result = await supabase
          .from('user_profiles')
          .update({ 
            role: dbRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      } else {
        // Insert new profile
        console.log('[SelectRole] Creating new profile')
        result = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            role: dbRole,
            name: user.user_metadata?.full_name || user.email || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
      }

      if (result.error) {
        console.error('[SelectRole] Save error:', result.error)
        throw result.error
      }

      // Update user metadata juga
      await supabase.auth.updateUser({
        data: { role: dbRole },
      })

      console.log('[SelectRole] Role saved successfully')

      // Clear first time user flag
      clearFirstTimeUserFlag()

      // Redirect ke dashboard sesuai role
      const dashboardPath = role === 'student' 
        ? '/dashboard/student' 
        : '/dashboard/tutor'
      
      console.log('[SelectRole] Redirecting to:', dashboardPath)
      router.push(dashboardPath)
      
    } catch (err) {
      console.error('[SelectRole] Error selecting role:', err)
      setError('Gagal menyimpan role. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Memeriksa sesi Anda...</h2>
          <p className="text-muted-foreground">Mohon tunggu sebentar</p>
        </div>
      </div>
    )
  }

  // Show error if user not found
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5 p-4">
        <div className="bg-card rounded-2xl border border-border/50 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">User Tidak Ditemukan</h1>
          <p className="text-muted-foreground mb-6">
            Silakan login ulang untuk melanjutkan
          </p>
          <Button
            onClick={() => router.push('/')}
            className="w-full"
          >
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Pilih Peran Anda
          </h1>
          <p className="text-muted-foreground text-lg">
            Selamat datang di EduStory! Pilih peran Anda untuk melanjutkan.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Email: <span className="font-medium">{user.email}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10"
            onClick={() => !isLoading && handleSelectRole('student')}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Saya Siswa</CardTitle>
              <CardDescription>
                Saya ingin mencari pengajar privat untuk membantu pembelajaran
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Pilih Siswa
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10"
            onClick={() => !isLoading && handleSelectRole('tutor')}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-3">
                <UserCog className="w-6 h-6 text-secondary" />
              </div>
              <CardTitle className="text-xl">Saya Pengajar</CardTitle>
              <CardDescription>
                Saya ingin mengajar dan membantu siswa mencapai potensi terbaik
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Pilih Pengajar
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Pilihan ini tidak dapat diubah setelah disimpan
        </p>
      </div>
    </div>
  )
}