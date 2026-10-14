'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, UserCog, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

    console.log(`[SelectRole] 📝 Memilih ${role}, User ID:`, userId)

    try {
      console.log('[SelectRole] 🔍 Mengirim request ke API...')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)

      // Token sesi dipakai server untuk memverifikasi identitas pemanggil.
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/auth/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ 
          userId: userId, 
          role: role, // <-- kirim role yang dipilih
          email: userEmail,
          name: userName
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      console.log('[SelectRole] 📡 Response status:', response.status)

      const result = await response.json()
      console.log('[SelectRole] 📦 Response body:', result)

      if (!response.ok) {
        throw new Error(result.error || `Gagal menyimpan role (status ${response.status})`)
      }

      console.log('[SelectRole] ✅ Role berhasil disimpan via API:', result)

      // Redirect sesuai role
      const dashboardPath = role === 'student' ? '/dashboard/student' : '/dashboard/tutor'
      console.log(`[SelectRole] 🎯 Redirecting ke ${dashboardPath}`)
      window.location.replace(dashboardPath)

    } catch (err) {
      console.error('[SelectRole] ❌ Error:', err)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timeout. Silakan coba lagi.')
      } else {
        setError(err instanceof Error ? err.message : 'Gagal menyimpan role. Silakan coba lagi.')
      }
      setIsLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-5xl">
        <div className="mb-12 text-center">
          <span className="eyebrow mb-5">Satu langkah lagi</span>
          <h1 className="text-gradient font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Pilih Peran Anda
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Tentukan bagaimana Anda ingin menggunakan EduStory. Pilihan ini dapat diubah kapan saja melalui pengaturan akun.
          </p>
          {userEmail && (
            <p className="text-sm text-muted-foreground mt-3">
              Masuk sebagai <span className="font-medium text-foreground">{userEmail}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center text-destructive">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {/* Student Card - SAMA SEPERTI SEBELUMNYA */}
          <Card 
            className={`surface hover-card relative cursor-pointer overflow-hidden
              ${isLoading === 'student' ? 'pointer-events-none opacity-70' : ''}
            `}
            onClick={() => !isLoading && handleSelectRole('student')}
          >
            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary/70 to-accent/50" />
            <CardHeader className="pt-8 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                <GraduationCap className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl font-extrabold tracking-tight">Saya Student</CardTitle>
              <CardDescription className="text-base">
                Saya ingin belajar dan menemukan tutor yang tepat
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8 text-center">
              <ul className="mx-auto mb-6 max-w-xs space-y-2 text-left text-sm text-muted-foreground">
                <li>✓ Temukan tutor profesional di berbagai bidang</li>
                <li>✓ Belajar dengan metode yang personal dan efektif</li>
                <li>✓ Raih prestasi akademik bersama mentor terbaik</li>
              </ul>
              <Button 
                className="w-full rounded-xl"
                disabled={isLoading === 'student'}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectRole('student')
                }}
              >
                {isLoading === 'student' ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Menyimpan...</>
                ) : (
                  'Siap belajar!'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Tutor Card - SEKARANG AKTIF */}
          <Card 
            className={`surface hover-card relative cursor-pointer overflow-hidden
              ${isLoading === 'tutor' ? 'pointer-events-none opacity-70' : ''}
            `}
            onClick={() => !isLoading && handleSelectRole('tutor')}
          >
            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-secondary/70 to-accent/50" />
            <CardHeader className="pt-8 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary/10">
                <UserCog className="h-10 w-10 text-secondary" />
              </div>
              <CardTitle className="font-display text-2xl font-extrabold tracking-tight">Saya Tutor</CardTitle>
              <CardDescription className="text-base">
                Saya ingin mengajar dan berbagi ilmu dengan siswa
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8 text-center">
              <ul className="mx-auto mb-6 max-w-xs space-y-2 text-left text-sm text-muted-foreground">
                <li>✓ Temukan siswa yang cocok dengan keahlian Anda</li>
                <li>✓ Atur jadwal dan pilih student sendiri</li>
                <li>✓ Dapatkan penghasilan tambahan</li>
              </ul>
              <Button 
                variant="secondary"
                className="w-full rounded-xl"
                disabled={isLoading === 'tutor'}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectRole('tutor')
                }}
              >
                {isLoading === 'tutor' ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Menyimpan...</>
                ) : (
                  'Saya ingin mengajar'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Pilihan ini dapat diubah kapan saja di pengaturan akun Anda.
        </p>
      </div>
    </div>
  )
}