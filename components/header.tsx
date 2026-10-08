'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X, BookOpen, LogIn, UserPlus, LayoutDashboard, LogOut, AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthModalDialog } from '@/components/auth/auth-modal-dialog'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

// Helper function to mask email - hanya 3 bintang
const maskEmail = (email?: string | null): string => {
  if (!email) return ''
  const [username, domain] = email.split('@')
  if (!username || !domain) return email
  return `${username[0]}***@${domain}`
}

const menuItems = [
  { label: 'Layanan', href: '#layanan' },
  { label: 'Program', href: '#program' },
  { label: 'Testimoni', href: '#testimoni' },
  { label: 'Blog', href: '#blog' },
  { label: 'Kontak', href: '#kontak' },
]

const Header = () => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [scrolled, setScrolled] = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const { user, userRole, loading, forceSignOut } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock body scroll while the mobile sheet is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleSignIn = () => {
    setAuthMode('signin')
    setAuthOpen(true)
    setIsOpen(false)
  }

  const handleSignUp = () => {
    setAuthMode('signup')
    setAuthOpen(true)
    setIsOpen(false)
  }

  const handleDashboardClick = () => {
    if (!user) {
      setAuthMode('signin')
      setAuthOpen(true)
      return
    }
    if (!userRole) {
      router.push('/auth/select-role')
      return
    }
    const dashboardPath =
      userRole === 'student'
        ? '/dashboard/student'
        : userRole === 'tutor'
          ? '/dashboard/tutor'
          : userRole === 'admin'
            ? '/dashboard/admin'
            : '/dashboard'
    router.push(dashboardPath)
  }

  const confirmLogout = async () => {
    setShowLogoutDialog(false)
    setIsOpen(false)
    try {
      await forceSignOut()
    } catch {
      window.location.href = '/'
    }
  }

  const handleEmergencyClear = async () => {
    localStorage.clear()
    sessionStorage.clear()
    if ('caches' in window) {
      try {
        const names = await caches.keys()
        await Promise.all(names.map((name) => caches.delete(name)))
      } catch {
        /* ignore */
      }
    }
    window.location.href = '/?emergency_clear=' + Date.now()
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 w-full transition-all duration-300',
          scrolled ? 'border-b border-border/60 bg-background/85 backdrop-blur-xl' : 'bg-transparent',
        )}
      >
        <div className="container-page">
          <div className="flex h-16 items-center justify-between md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
                <BookOpen className="h-4.5 w-4.5" />
              </span>
              <span className="font-display text-xl font-extrabold tracking-tight">
                Edu<span className="text-primary">Story</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 md:flex">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* Desktop actions */}
            <div className="hidden items-center gap-2.5 md:flex">
              {user ? (
                <>
                  <span className="flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm">
                    <span className="h-2 w-2 rounded-full bg-secondary" />
                    <span className="font-medium text-muted-foreground">{maskEmail(user.email)}</span>
                  </span>
                  <Button onClick={handleDashboardClick} disabled={loading && !userRole} className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    {loading && !userRole ? 'Memuat…' : 'Dashboard'}
                  </Button>
                  <Button
                    onClick={() => setShowLogoutDialog(true)}
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 hover:border-destructive/40 hover:text-destructive"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setShowEmergency((v) => !v)}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-warning hover:text-warning"
                    title="Emergency clear cache"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </Button>
                  {showEmergency && (
                    <Button onClick={handleEmergencyClear} variant="destructive" size="sm" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={handleSignIn} className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Masuk
                  </Button>
                  <Button onClick={handleSignUp} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Daftar
                  </Button>
                </>
              )}
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setIsOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition hover:bg-muted md:hidden"
              aria-label={isOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AuthModalDialog isOpen={authOpen} onOpenChange={setAuthOpen} defaultMode={authMode} />
      </header>

      {/* Mobile sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />
          <nav className="absolute inset-x-0 top-16 mx-3 rounded-2xl border border-border/70 bg-card p-4 shadow-lifted animate-slide-up">
            <div className="flex flex-col">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-xl px-4 py-3 text-base font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2 border-t border-border/70 pt-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-secondary" />
                    <span className="font-medium">{maskEmail(user.email)}</span>
                  </div>
                  <Button
                    onClick={() => {
                      handleDashboardClick()
                      setIsOpen(false)
                    }}
                    className="w-full gap-2"
                    disabled={loading && !userRole}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {loading && !userRole ? 'Memuat…' : 'Dashboard'}
                  </Button>
                  <Button onClick={() => setShowLogoutDialog(true)} variant="outline" className="w-full gap-2">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                  <Button onClick={handleEmergencyClear} variant="ghost" size="sm" className="w-full gap-2 text-warning">
                    <Trash2 className="h-4 w-4" />
                    Emergency clear cache
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleSignIn} className="w-full gap-2">
                    <LogIn className="h-4 w-4" />
                    Masuk
                  </Button>
                  <Button onClick={handleSignUp} className="w-full gap-2">
                    <UserPlus className="h-4 w-4" />
                    Daftar
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Logout confirm */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card p-6 shadow-lifted animate-scale-in">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <LogOut className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Konfirmasi logout</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Apakah Anda yakin ingin keluar dari akun ini?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
                Batal
              </Button>
              <Button variant="destructive" onClick={confirmLogout}>
                Ya, logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Header
