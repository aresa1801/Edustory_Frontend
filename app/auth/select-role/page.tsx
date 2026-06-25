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
  const [isLoading, setIsLoading] = useState<'student' | 'tutor' | null>(null)
  const [error, setError] = useState('')

  const handleSelectRole = async (role: 'student' | 'tutor') => {
    setIsLoading(role)
    setError('')

    console.log('[SelectRole] 📝 Memilih role:', role)

    try {
      const supabase = createClient()
      const dbRole = role === 'student' ? 'siswa' : 'tutor'

      console.log('[SelectRole] 💾 Menyimpan role ke database:', { userId, dbRole })

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
        console.error('[SelectRole] ❌ Gagal simpan:', result.error)
        throw result.error
      }

      console.log('[SelectRole] ✅ Role berhasil disimpan')

      await supabase.auth.updateUser({
        data: { role: dbRole },
      })

      const dashboardPath = role === 'student' 
        ? '/dashboard/student' 
        : '/dashboard/tutor'
      
      console.log('[SelectRole] 🎯 Redirect ke:', dashboardPath)
      window.location.href = dashboardPath
      
    } catch (err) {
      console.error('[SelectRole] ❌ Error:', err)
      setError(err instanceof Error ? err.message : 'Gagal menyimpan role. Silakan coba lagi.')
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 p-4">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-3">
            Pilih Peran Anda
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tentukan bagaimana Anda ingin menggunakan EduStory. Pilihan ini dapat diubah kapan saja melalui pengaturan akun.
          </p>
          {userEmail && (
            <p className="text-sm text-muted-foreground mt-3">
              Masuk sebagai <span className="font-medium text-foreground">{userEmail}</span>
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Student Card */}
          <Card 
            className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer
              ${isLoading === 'student' ? 'opacity-70 pointer-events-none' : 'hover:border-primary/50'}
            `}
            onClick={() => !isLoading && handleSelectRole('student')}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
            <CardHeader className="text-center pt-8">
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl font-bold">Saya Siswa</CardTitle>
              <CardDescription className="text-base">
                Saya ingin mencari pengajar privat yang sesuai dengan kebutuhan saya
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left max-w-xs mx-auto">
                <li>✓ Akses ke ribuan tutor profesional</li>
                <li>✓ Jadwal fleksibel sesuai keinginan</li>
                <li>✓ Pembelajaran personal dan efektif</li>
              </ul>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading === 'student'}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectRole('student')
                }}
              >
                {isLoading === 'student' ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Menyimpan...</>
                ) : (
                  'Pilih Siswa'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Tutor Card */}
          <Card 
            className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer
              ${isLoading === 'tutor' ? 'opacity-70 pointer-events-none' : 'hover:border-primary/50'}
            `}
            onClick={() => !isLoading && handleSelectRole('tutor')}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
            <CardHeader className="text-center pt-8">
              <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                <UserCog className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-2xl font-bold">Saya Pengajar</CardTitle>
              <CardDescription className="text-base">
                Saya ingin mengajar dan membagikan ilmu kepada siswa yang membutuhkan
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left max-w-xs mx-auto">
                <li>✓ Temukan siswa yang cocok dengan keahlian Anda</li>
                <li>✓ Atur jadwal dan tarif sendiri</li>
                <li>✓ Dapatkan penghasilan tambahan</li>
              </ul>
              <Button 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isLoading === 'tutor'}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectRole('tutor')
                }}
              >
                {isLoading === 'tutor' ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Menyimpan...</>
                ) : (
                  'Pilih Pengajar'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Pilihan ini dapat diubah kapan saja di pengaturan akun Anda.
        </p>
      </div>
    </div>
  )
}