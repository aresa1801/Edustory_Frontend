'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Mail, ArrowLeft } from 'lucide-react'

type AuthMode = 'signin' | 'signup' | 'verify-email'
type UserRole = 'student' | 'tutor'

interface AuthModalProps {
  onSuccess?: () => void
  initialMode?: 'signin' | 'signup'
}

export function AuthModal({ onSuccess, initialMode = 'signin' }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle, loading: authLoading } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [role, setRole] = useState<UserRole>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [otpValue, setOtpValue] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })

  const ROLE_TO_DASHBOARD: Record<UserRole, string> = {
    student: '/dashboard/student/onboarding',
    tutor: '/dashboard/tutor',
  }

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6) {
      setError('Masukkan kode 6 digit')
      return
    }

    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          token: otpValue,
          type: 'signup',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Verifikasi gagal')
      }

      // After verification, set role
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const setRoleRes = await fetch('/api/auth/set-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `******
          },
          body: JSON.stringify({ role }),
        })
        
        if (!setRoleRes.ok) {
          throw new Error('Gagal menyimpan peran. Silakan coba lagi.')
        }
        
        onSuccess?.()
        router.push(ROLE_TO_DASHBOARD[role])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          type: 'signup',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengirim ulang kode')
      }

      setSuccess('Kode verifikasi telah dikirim ulang ke email Anda')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (mode === 'signin') {
        await signIn(formData.email, formData.password)
        // Setelah login, redirect ke /dashboard yang akan handle routing otomatis
        onSuccess?.()
        router.push('/dashboard')
      } else if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Password tidak cocok')
        }
        
        // Sign up - this will trigger email with OTP
        await signUp(formData.email, formData.password, role)
        
        // Switch to verification mode
        setMode('verify-email')
        setSuccess('Kode verifikasi telah dikirim ke email Anda. Silakan periksa inbox Anda.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)

    try {
      // Store the selected role so the OAuth callback can apply it automatically
      if (mode === 'signup') {
        localStorage.setItem('pendingRole', role)
      }
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk dengan Google')
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  // Email Verification Screen
  if (mode === 'verify-email') {
    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Verifikasi Email Anda</h2>
          <p className="text-muted-foreground">
            Kami telah mengirim kode verifikasi 6 digit ke
            <br />
            <span className="font-medium text-foreground">{formData.email}</span>
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <AlertDescription className="text-green-700 dark:text-green-300">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Kode Verifikasi</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={setOtpValue}
                disabled={loading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Button
            onClick={handleVerifyOTP}
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading || otpValue.length !== 6}
          >
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Memverifikasi...
              </>
            ) : (
              'Verifikasi'
            )}
          </Button>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Tidak menerima kode?{' '}
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-primary hover:underline font-medium disabled:opacity-50"
              >
                Kirim ulang
              </button>
            </p>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError(null)
                setSuccess(null)
                setOtpValue('')
              }}
              disabled={loading}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 w-full disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke pendaftaran
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Login/Signup Screen
  return (
    <div className="w-full max-w-md mx-auto">
      <Tabs
        value={mode === 'signin' ? 'signin' : 'signup'}
        onValueChange={(value) => {
          setMode(value as 'signin' | 'signup')
          setError(null)
          setSuccess(null)
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="signin">Masuk</TabsTrigger>
          <TabsTrigger value="signup">Daftar</TabsTrigger>
        </TabsList>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
            <AlertDescription className="text-green-700 dark:text-green-300">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <TabsContent value="signin">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="Masukkan email Anda"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={loading}
                required
              />
            </div>

            <div>
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                placeholder="Masukkan password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                disabled={loading}
                required
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
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Daftar Sebagai</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(['student', 'tutor'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-3 rounded-lg border-2 transition-all ${
                      role === r
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {r === 'student' ? 'Siswa' : 'Tutor'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="Masukkan email Anda"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={loading}
                required
              />
            </div>

            <div>
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="Minimal 8 karakter"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                disabled={loading}
                required
                minLength={8}
              />
            </div>

            <div>
              <Label htmlFor="confirm-password">Konfirmasi Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Ulangi password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
                disabled={loading}
                required
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
                  Memproses...
                </>
              ) : (
                'Daftar'
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Atau lanjutkan dengan
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        {loading ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Loading...
          </>
        ) : (
          <>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </>
        )}
      </Button>
    </div>
  )
}
