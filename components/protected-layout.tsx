'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ProtectedLayoutProps {
  children: React.ReactNode
  allowedRoles?: ('student' | 'tutor' | 'admin')[]
}

export function ProtectedLayout({
  children,
  allowedRoles = ['student', 'tutor', 'admin'],
}: ProtectedLayoutProps) {
  const router = useRouter()
  const { user, userRole, loading, forceSignOut } = useAuth()

  // ⬇️ BARU: Banned state
  const [bannedInfo, setBannedInfo] = useState<{
    score: number
    tierLabel: string
  } | null>(null)
  const [checkingBanned, setCheckingBanned] = useState(true)

  // ⬇️ BARU: Cek banned saat mount
  useEffect(() => {
    if (loading) return
    if (!user?.id || !userRole) {
      setCheckingBanned(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/credit/me?user_id=${user.id}&role=${userRole}&_t=${Date.now()}`,
          { cache: 'no-store' }
        )
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.banned) {
            setBannedInfo({
              score: data.creditScore ?? 0,
              tierLabel: data.tierLabel ?? 'Blacklist',
            })
            // Auto logout + redirect setelah 6 detik
            setTimeout(async () => {
              try {
                await forceSignOut()
              } catch (e) {
                console.error('[ProtectedLayout] forceSignOut error:', e)
              }
              window.location.href = '/'
            }, 6000)
          }
        }
      } catch (err) {
        console.error('[ProtectedLayout] check banned error:', err)
        // Kalau error, biarin lanjut (jangan block user karena network error)
      } finally {
        if (!cancelled) setCheckingBanned(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, userRole, loading, forceSignOut])

  // ===== ROLE REDIRECT (existing) =====
  useEffect(() => {
    if (loading) return
    if (bannedInfo) return  // jangan redirect kalau lagi banned popup

    if (!user) {
      router.push('/login')
      return
    }

    if (userRole && !allowedRoles.includes(userRole)) {
      router.push('/dashboard')
      return
    }
  }, [user, userRole, loading, router, allowedRoles, bannedInfo])

  // ===== LOADING =====
  if (loading || checkingBanned) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user) {
    return null
  }

  // ===== BANNED POPUP (block render children) =====
  if (bannedInfo) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-red-500/40 p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-center mb-3">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-center text-foreground mb-2">
              Akun Anda Telah Diblokir
            </h3>

            <p className="text-sm text-muted-foreground text-center mb-4">
              Credit score Anda terlalu rendah. Akun Anda tidak bisa diakses
              sampai admin membuka blokir.
            </p>

            <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-center mb-4">
              <p className="text-xs text-muted-foreground">Credit Score Anda:</p>
              <p className="text-4xl font-bold text-red-400 mt-1">
                {bannedInfo.score}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Tier: <strong className="text-red-400">{bannedInfo.tierLabel}</strong>
              </p>
            </div>

            <p className="text-xs text-center text-muted-foreground mb-4">
              Anda akan otomatis keluar dalam beberapa detik...
            </p>

            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await forceSignOut()
                } catch (e) {
                  console.error(e)
                }
                window.location.href = '/'
              }}
              className="w-full"
            >
              Keluar Sekarang
            </Button>
          </div>
        </div>
      </>
    )
  }

  return <>{children}</>
}