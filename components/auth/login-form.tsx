'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { loginUser } from '@/lib/auth'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { session } = await loginUser(email, password)
      if (session) {
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat masuk')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-2xl shadow-soft p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Selamat Datang</h1>
          <p className="text-muted-foreground">Masuk ke akun EduStory Anda</p>
        </div>

        {message === 'pending_approval' && (
          <Alert className="mb-6 bg-primary/10 border-primary/30">
            <AlertDescription className="text-primary">
              Pendaftaran Anda berhasil! Tim kami akan segera memverifikasi profil Anda.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Masukkan email Anda"
              className="mt-1"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Masukkan password Anda"
              className="mt-1"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Loading...
              </>
            ) : (
              'Masuk'
            )}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Belum memiliki akun?{' '}
            <a href="/register" className="text-primary font-semibold hover:underline">
              Daftar di sini
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
