'use client'

import { useState } from 'react'
import { createClient } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, UserCog, Loader2, AlertCircle } from 'lucide-react'

interface SelectRoleClientProps {
  userEmail: string
  userId: string
  userName: string
}

export default function SelectRoleClient({ userEmail, userId, userName }: SelectRoleClientProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSelectRole = async (role: 'student' | 'tutor') => {
    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const dbRole = role === 'student' ? 'siswa' : 'tutor'

      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      let result

      if (existingProfile) {
        result = await supabase
          .from('user_profiles')
          .update({ 
            role: dbRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
      } else {
        result = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            role: dbRole,
            name: userName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
      }

      if (result.error) {
        console.error('[SelectRole] ❌ Save error:', result.error)
        throw result.error
      }

      // Update metadata (opsional)
      await supabase.auth.updateUser({
        data: { role: dbRole },
      })

      // Redirect ke dashboard sesuai role
      const dashboardPath = role === 'student' 
        ? '/dashboard/student' 
        : '/dashboard/tutor'
      
      window.location.href = dashboardPath
      
    } catch (err) {
      console.error('[SelectRole] ❌ Error selecting role:', err)
      setError('Gagal menyimpan role. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Pilih Peran Anda</h1>
          <p className="text-muted-foreground text-lg">
            Selamat datang di EduStory! Pilih peran Anda untuk melanjutkan.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Email: <span className="font-medium">{userEmail}</span>
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
              <Button className="w-full" disabled={isLoading}>
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
              <Button className="w-full" variant="outline" disabled={isLoading}>
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