'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, User, Chrome } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isGoogleAuth, setIsGoogleAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user data from session on mount
  useEffect(() => {
    const initializeForm = async () => {
      const supabase = createClient()
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('[v0] Register page - Session:', session?.user.email, 'Provider:', session?.user.app_metadata?.provider)
        
        if (sessionError || !session) {
          console.log('[v0] No session, redirecting to login')
          router.push('/auth/login')
          return
        }

        // Check if Google OAuth
        const provider = session.user.app_metadata?.provider
        if (provider === 'google') {
          console.log('[v0] Google OAuth detected, pre-filling form')
          setIsGoogleAuth(true)
          // Pre-fill data from Google
          setEmail(session.user.email || '')
          setFullName(session.user.user_metadata?.full_name || '')
        } else {
          // If not Google OAuth, redirect to select-role
          console.log('[v0] Not Google OAuth, redirecting to select-role')
          router.push('/auth/select-role')
        }
      } catch (err) {
        console.error('[v0] Initialize error:', err)
      } finally {
        setLoading(false)
      }
    }

    initializeForm()
  }, [router])

  const handleGoogleSignUp = async () => {
    const supabase = createClient()
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    console.log('[v0] Register form submitted - isGoogleAuth:', isGoogleAuth)

    if (!fullName || !email) {
      setError('Nama dan email harus diisi')
      return
    }

    // For non-Google auth, validate password
    if (!isGoogleAuth) {
      if (!password || !confirmPassword) {
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
    }

    setLoading(true)
    const supabase = createClient()
    try {
      // For Google OAuth, user is already authenticated
      // Just create the user profile
      if (isGoogleAuth) {
        console.log('[v0] Creating user profile for Google auth user')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          throw new Error('Session tidak ditemukan')
        }

        // Create or update user profile in database
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: session.user.id,
            email: email,
            name: fullName,
            avatar_url: session.user.user_metadata?.avatar_url,
            created_at: new Date().toISOString(),
          })
          .select()

        if (profileError && profileError.code !== '23505') {
          throw profileError
        }

        // Redirect to role selection
        console.log('[v0] Profile created, redirecting to select-role')
        router.push('/auth/select-role')
      } else {
        // For email/password signup
        console.log('[v0] Creating new user with email/password')
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
        console.log('[v0] User signed up, redirecting to select-role')
        router.push('/auth/select-role')
      }
    } catch (err) {
      console.error('[v0] Register error:', err)
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-foreground">Sedang memproses...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isGoogleAuth ? 'Lengkapi Profil Anda' : 'Bergabung dengan EduStory'}
            </h1>
            <p className="text-muted-foreground">
              {isGoogleAuth ? 'Verifikasi data Anda untuk melanjutkan' : 'Buat akun dan mulai perjalanan belajar Anda'}
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Info badge untuk Google auth */}
          {isGoogleAuth && (
            <div className="bg-primary/10 border border-primary/30 text-primary px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
              <Chrome className="w-4 h-4" />
              Anda terhubung dengan Google
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4">
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
                  disabled={isGoogleAuth || loading}
                />
              </div>
            </div>

            {/* Password fields - hanya tampil jika bukan Google auth */}
            {!isGoogleAuth && (
              <>
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
              </>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white"
            >
              {loading ? 'Sedang memproses...' : isGoogleAuth ? 'Lanjutkan' : 'Daftar'}
            </Button>
          </form>

          {/* Divider - hanya tampil jika bukan Google auth */}
          {!isGoogleAuth && (
            <>
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-border/30"></div>
                <span className="text-xs text-muted-foreground uppercase">atau</span>
                <div className="flex-1 h-px bg-border/30"></div>
              </div>

              <Button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="w-full h-12 bg-white text-black hover:bg-gray-100 flex items-center justify-center gap-3"
              >
                <Chrome className="w-5 h-5" />
                {loading ? 'Sedang mendaftar...' : 'Daftar dengan Google'}
              </Button>
            </>
          )}

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