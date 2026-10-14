'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, UserCog, Loader2 } from 'lucide-react'

export default function SelectRolePage() {
  const router = useRouter()
  const { user, isFirstTimeUser, clearFirstTimeUserFlag } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Redirect jika tidak ada user
    if (!user) {
      router.push('/')
      return
    }

    // Cek apakah user sudah punya profile
    const checkExistingProfile = async () => {
      if (!user) return
      
      const supabase = createClient()
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role) {
        // User sudah punya role, redirect ke dashboard
        const dashboardPath = profile.role === 'student' 
          ? '/dashboard/student' 
          : profile.role === 'tutor'
          ? '/dashboard/tutor'
          : '/dashboard/admin'
        
        router.push(dashboardPath)
      }
    }

    checkExistingProfile()
  }, [user, router])

  const handleSelectRole = async (role: 'student' | 'tutor') => {
    if (!user) {
      setError('User tidak ditemukan. Silakan login ulang.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // Insert user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          role: role,
          name: user.user_metadata?.full_name || user.email || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (profileError) throw profileError

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { role },
      })

      if (updateError) throw updateError

      // Clear first time user flag
      clearFirstTimeUserFlag()

      // Redirect ke dashboard sesuai role
      const dashboardPath = role === 'student' 
        ? '/dashboard/student' 
        : '/dashboard/tutor'
      
      router.push(dashboardPath)
    } catch (err) {
      console.error('Error selecting role:', err)
      setError('Gagal menyimpan role. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="mb-3 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Pilih Peran Anda
          </h1>
          <p className="text-muted-foreground text-lg">
            Selamat datang di EduStory! Pilih peran Anda untuk melanjutkan.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card 
            className="surface hover-card cursor-pointer"
            onClick={() => !isLoading && handleSelectRole('student')}
          >
            <CardHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="font-display text-xl font-extrabold tracking-tight">Saya Siswa</CardTitle>
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
            className="surface hover-card cursor-pointer"
            onClick={() => !isLoading && handleSelectRole('tutor')}
          >
            <CardHeader>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10">
                <UserCog className="h-6 w-6 text-secondary" />
              </div>
              <CardTitle className="font-display text-xl font-extrabold tracking-tight">Saya Pengajar</CardTitle>
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

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Pilihan ini tidak dapat diubah setelah disimpan
        </p>
      </div>
    </div>
  )
}