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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Pilih Peran Anda
          </h1>
          <p className="text-muted-foreground text-lg">
            Selamat datang di EduStory! Pilih peran Anda untuk melanjutkan.
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