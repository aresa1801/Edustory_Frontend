'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, UserCog, Loader2, AlertCircle } from 'lucide-react'

export default function SelectRolePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState<any>(null) // Simpan user lokal
  const isMounted = useRef(true)

  useEffect(() => {
    let retryCount = 0
    const maxRetries = 20 // 10 detik (20 x 500ms)

    const checkUserAndRole = async () => {
      console.log('[SelectRole] 🔍 Checking user and role...')
      
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        console.log('[SelectRole] Session from Supabase:', session?.user?.email)
        
        if (!session) {
          // Session belum siap, tunggu dan retry
          if (retryCount < maxRetries && isMounted.current) {
            retryCount++
            console.log(`[SelectRole] ⏳ Waiting for session... (${retryCount}/${maxRetries})`)
            setTimeout(checkUserAndRole, 500)
            return
          }
          
          // Gagal setelah retry → redirect ke home
          console.log('[SelectRole] ❌ No session after retries')
          if (isMounted.current) {
            window.location.href = '/?no_session=1'
          }
          return
        }

        // Session ditemukan → simpan user lokal
        const currentUser = session.user
        setUser(currentUser)
        console.log('[SelectRole] ✅ User:', currentUser.email)

        // Cek apakah user sudah punya role di database
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (profileError) {
          console.error('[SelectRole] Profile error:', profileError)
        }

        console.log('[SelectRole] Profile data:', profile)

        // Jika sudah punya role → redirect langsung ke dashboard
        if (profile?.role) {
          const dashboardPath = profile.role === 'siswa' || profile.role === 'student'
            ? '/dashboard/student'
            : profile.role === 'tutor'
            ? '/dashboard/tutor'
            : '/dashboard/admin'
          
          console.log('[SelectRole] 🎯 Redirecting to:', dashboardPath)
          if (isMounted.current) {
            window.location.href = dashboardPath
          }
          return
        }

        // Belum punya role → tampilkan halaman pilihan
        console.log('[SelectRole] 📝 Show select role page')
        if (isMounted.current) {
          setChecking(false)
        }

      } catch (err) {
        console.error('[SelectRole] Error:', err)
        if (isMounted.current) {
          setError('Gagal memeriksa data user. Silakan coba lagi.')
          setChecking(false) // Tetap hilangkan loading agar user bisa melihat error
        }
      }
    }

    checkUserAndRole()

    return () => {
      isMounted.current = false
    }
  }, []) // Dependency kosong – hanya dijalankan sekali

  // ============================================================
  // HANDLE PILIH ROLE
  // ============================================================
  const handleSelectRole = async (role: 'student' | 'tutor') => {
    if (!user) {
      setError('User tidak ditemukan. Silakan login ulang.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const dbRole = role === 'student' ? 'siswa' : 'tutor'

      console.log('[SelectRole] 💾 Saving role:', { userId: user.id, role: dbRole })

      // Cek profile sudah ada atau belum
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      let result

      if (existingProfile) {
        // Update
        result = await supabase
          .from('user_profiles')
          .update({ 
            role: dbRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      } else {
        // Insert
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
        console.error('[SelectRole] ❌ Save error:', result.error)
        throw result.error
      }

      console.log('[SelectRole] ✅ Role saved to database')

      // Update user metadata (opsional)
      await supabase.auth.updateUser({
        data: { role: dbRole },
      })

      console.log('[SelectRole] ✅ User metadata updated')

      // Redirect ke dashboard sesuai role
      const dashboardPath = role === 'student' 
        ? '/dashboard/student' 
        : '/dashboard/tutor'
      
      console.log('[SelectRole] 🎯 Redirecting to dashboard:', dashboardPath)
      window.location.href = dashboardPath
      
    } catch (err) {
      console.error('[SelectRole] ❌ Error selecting role:', err)
      setError('Gagal menyimpan role. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  // Tampilkan loading selama pengecekan
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

  // Jika user tidak ditemukan setelah pengecekan selesai
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
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    )
  }

  // Tampilan pilihan role
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Pilih Peran Anda</h1>
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