'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, User, Chrome } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignUp = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up with Google')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Semua field harus diisi')
      return
    }

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok')
      return
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      // Redirect to role selection
      router.push('/auth/select-role')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Bergabung dengan EduStory</h1>
            <p className="text-muted-foreground">Buat akun dan mulai perjalanan belajar Anda</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Google Sign Up */}
          <Button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full h-12 bg-white text-black hover:bg-gray-100 flex items-center justify-center gap-3 mb-6"
          >
            <Chrome className="w-5 h-5" />
            {loading ? 'Sedang mendaftar...' : 'Daftar dengan Google'}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border/30"></div>
            <span className="text-xs text-muted-foreground uppercase">atau</span>
            <div className="flex-1 h-px bg-border/30"></div>
          </div>

          {/* Email Sign Up */}
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Nama Anda"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Konfirmasi Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white"
            >
              {loading ? 'Sedang mendaftar...' : 'Daftar'}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              Sudah punya akun?{' '}
              <Link
                href="/auth/login"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
