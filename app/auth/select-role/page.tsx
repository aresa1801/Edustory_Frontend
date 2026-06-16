'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { BookOpen, Users } from 'lucide-react'

export default function SelectRolePage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkUserAndRole = async () => {
      const supabase = createClient()
      
      // 1. Cek apakah user sudah login
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Belum login, redirect ke login
        router.replace('/auth/login')
        return
      }
      
      setUser(user)
      
      // 2. Cek apakah user sudah punya role di database
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile?.role) {
        // Sudah punya role, langsung redirect ke dashboard
        const dashboardPath = profile.role === 'siswa' 
          ? '/dashboard/student' 
          : profile.role === 'tutor'
          ? '/dashboard/tutor'
          : '/dashboard/admin'
        
        router.replace(dashboardPath)
        return
      }
      
      // Belum punya role, tampilkan halaman select role
      setChecking(false)
    }
    
    checkUserAndRole()
  }, [router])

  const handleRoleSelection = async (role: 'student' | 'tutor') => {
    if (!user) return

    setLoading(role)
    const supabase = createClient()
    
    try {
      // Map frontend role to database role
      const dbRole = role === 'student' ? 'siswa' : 'tutor'
      
      // Update user_profiles dengan role
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: dbRole })
        .eq('id', user.id)
      
      if (error) throw error

      // Redirect ke dashboard sesuai role
      const dashboardPath = role === 'student' 
        ? '/dashboard/student' 
        : '/dashboard/tutor'
      
      router.replace(dashboardPath)
    } catch (error) {
      console.error('Error selecting role:', error)
      alert(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setLoading(null)
    }
  }

  // Show loading while checking
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memeriksa sesi Anda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5 p-4">
      <div className="w-full max-w-4xl">
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
            <div className="text-6xl mb-4">👨‍🎓</div>
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
          <button
            onClick={() => router.push('/')}
            className="text-muted-foreground hover:text-primary transition-colors text-sm"
          >
            Kembali ke lobby
          </button>
        </div>
      </div>
    </div>
  )
}