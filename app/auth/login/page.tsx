'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/auth'
import { BrandLogo } from '@/components/brand/logo'
import { GoogleIcon } from '@/components/brand/google-icon'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard')
    })
  }, [router])

  const handleGoogle = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk dengan Google')
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-border bg-card p-7 shadow-sm">
          <div className="flex justify-center">
            <BrandLogo size="md" href={null} />
          </div>

          <h1 className="mt-7 text-center font-display text-2xl font-bold">Masuk ke Edustory</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Satu akun untuk siswa, tutor, dan orang tua.
          </p>

          {error ? (
            <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
            {loading ? 'Mengalihkan...' : 'Lanjutkan dengan Google'}
          </button>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
            Dengan masuk, kamu menyetujui{' '}
            <Link href="/terms" className="text-primary underline">
              Ketentuan Layanan
            </Link>{' '}
            dan{' '}
            <Link href="/privacy" className="text-primary underline">
              Kebijakan Privasi
            </Link>
            .
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            ← Kembali ke beranda
          </Link>
        </p>
      </div>
    </main>
  )
}
