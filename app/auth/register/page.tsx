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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
          <h1 className="text-xl font-semibold text-foreground">Sedang memproses...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="surface p-8">
          <div className="mb-8 text-center">
            <h1 className="mb-2 font-display text-3xl font-extrabold tracking-tight text-foreground">
              {isGoogleAuth ? 'Lengkapi Profil Anda' : 'Bergabung dengan EduStory'}
            </h1>
            <p className="text-muted-foreground">
              {isGoogleAuth ? 'Verifikasi data Anda untuk melanjutkan' : 'Buat akun dan mulai perjalanan belajar Anda'}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Info badge untuk Google auth */}
          {isGoogleAuth && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
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
              className="h-12 w-full rounded-xl"
            >
              {loading ? 'Sedang memproses...' : isGoogleAuth ? 'Lanjutkan' : 'Daftar'}
            </Button>
          </form>

          {/* Divider - hanya tampil jika bukan Google auth */}
          {!isGoogleAuth && (
            <>
              <div className="flex items-center gap-4 my-6">
                <div className="h-px flex-1 bg-border"></div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">atau</span>
                <div className="h-px flex-1 bg-border"></div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl"
              >
                <Chrome className="w-5 h-5" />
                {loading ? 'Sedang mendaftar...' : 'Daftar dengan Google'}
              </Button>
            </>
          )}

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Sudah punya akun?{' '}
              <Link
                href="/auth/login"
                className="font-semibold text-primary transition-colors hover:underline"
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