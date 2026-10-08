'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AuthShell from '@/components/auth/auth-shell'
import { Mail, Lock, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Cek apakah user sudah login
  useEffect(() => {
    const checkIfLoggedIn = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        router.replace('/dashboard')
        return
      }

      setCheckingAuth(false)
    }

    checkIfLoggedIn()
  }, [router])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
      setLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Memeriksa sesi…</p>
        </div>
      </div>
    )
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Masuk ke EduStory</h1>
        <p className="mt-2 text-muted-foreground">Lanjutkan perjalanan belajarmu.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        onClick={handleGoogleSignIn}
        disabled={loading}
        variant="outline"
        className="h-12 w-full gap-3 rounded-xl"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
          />
        </svg>
        {loading ? 'Sedang masuk…' : 'Lanjutkan dengan Google'}
      </Button>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">atau</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl pl-11"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className="mb-2 block text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl pl-11"
              disabled={loading}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading || !email || !password} className="h-12 w-full gap-2 rounded-xl">
          <LogIn className="h-4 w-4" />
          {loading ? 'Sedang masuk…' : 'Masuk'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Belum punya akun?{' '}
        <Link href="/auth/register" className="font-semibold text-primary hover:underline">
          Daftar di sini
        </Link>
      </p>
    </AuthShell>
  )
}
