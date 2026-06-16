'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { BookOpen, Users } from 'lucide-react'

export default function SelectRolePage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      } else {
        setUser(user)
      }
    }
    getUser()
  }, [router])

  const handleRoleSelection = async (role: 'student' | 'tutor') => {
    if (!user) return

    console.log('[v0] Role selected:', role)
    setLoading(role)
    const supabase = createClient()
    try {
      console.log('[v0] Saving user profile with role:', role)

      // Get current session to retrieve the access token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Call the server-side API route which uses the service role key to bypass RLS
      const response = await fetch('/api/auth/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Terjadi kesalahan saat menyimpan peran')
      }

      // Redirect based on role - students go to onboarding wizard
      console.log('[v0] Role saved, redirecting to dashboard:', role)
      if (role === 'student') {
        router.push('/dashboard/student/onboarding')
      } else {
        router.push(`/dashboard/${role}`)
      }
    } catch (error) {
      console.error('[v0] Error selecting role:', error)
      alert(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">Pilih Peran Anda</h1>
          <p className="text-lg text-muted-foreground">
            Tentukan apakah Anda ingin mendaftar sebagai siswa atau pengajar
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Student Option */}
          <button
            onClick={() => handleRoleSelection('student')}
            disabled={loading === 'student'}
            className="bg-card rounded-2xl border border-border/50 p-8 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 disabled:opacity-50"
          >
            <div className="text-6xl mb-4">👨‍</div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Menjadi Siswa</h2>
            <p className="text-muted-foreground mb-8">
              Temukan pengajar terbaik dan tingkatkan prestasi akademik Anda dengan bimbingan profesional
            </p>
            <Button
              disabled={loading === 'student'}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white"
            >
              {loading === 'student' ? 'Sedang memproses...' : 'Lanjutkan sebagai Siswa'}
            </Button>
          </button>

          {/* Tutor Option */}
          <button
            onClick={() => handleRoleSelection('tutor')}
            disabled={loading === 'tutor'}
            className="bg-card rounded-2xl border border-border/50 p-8 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 disabled:opacity-50"
          >
            <div className="text-6xl mb-4">👨‍🏫</div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Menjadi Pengajar</h2>
            <p className="text-muted-foreground mb-8">
              Bagikan keahlian Anda dan bantu siswa mencapai impian akademik mereka dengan pengalaman mengajar berkualitas
            </p>
            <Button
              disabled={loading === 'tutor'}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white"
            >
              {loading === 'tutor' ? 'Sedang memproses...' : 'Lanjutkan sebagai Pengajar'}
            </Button>
          </button>
        </div>

        {/* Back to login link */}
        <div className="text-center mt-8">
          <a
            href="/auth/login"
            className="text-muted-foreground hover:text-primary transition-colors text-sm"
          >
            Kembali ke login
          </a>
        </div>
      </div>
    </div>
  )
}