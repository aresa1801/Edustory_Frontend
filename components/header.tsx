'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X, BookOpen, LogIn, UserPlus, LayoutDashboard, LogOut, AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthModalDialog } from '@/components/auth/auth-modal-dialog'
import { useAuth } from '@/lib/auth-context'

// Helper function to mask email - hanya 3 bintang
const maskEmail = (email?: string | null): string => {
  if (!email) return ''
  const [username, domain] = email.split('@')
  if (!username || !domain) return email
  
  const maskedUsername = username[0] + '***'
  return `${maskedUsername}@${domain}`
}

const Header = () => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [scrolled, setScrolled] = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false) // ✅ State untuk dialog logout
  
  const { user, userRole, loading, forceSignOut } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleMenu = () => setIsOpen(!isOpen)

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

  // ✅ Navigasi ke dashboard atau select-role
  const handleDashboardClick = () => {
    if (!user) {
      setAuthMode('signin')
      setAuthOpen(true)
      return
    }

    if (!userRole) {
      console.log('[Header] User belum pilih role, redirect ke select-role')
      router.push('/auth/select-role')
      return
    }

    const dashboardPath = userRole === 'student' 
      ? '/dashboard/student' 
      : userRole === 'tutor'
      ? '/dashboard/tutor'
      : userRole === 'admin'
      ? '/dashboard/admin'
      : '/dashboard'
    
    router.push(dashboardPath)
  }

  // ✅ Buka dialog konfirmasi logout (bukan langsung logout)
  const handleLogoutClick = () => {
    setShowLogoutDialog(true)
  }

  // ✅ Fungsi logout sebenarnya setelah konfirmasi
  const confirmLogout = async () => {
    setShowLogoutDialog(false)
    try {
      await forceSignOut()
    } catch (error) {
      console.error('[Header] Logout error:', error)
      window.location.href = '/'
    }
  }

  // ✅ Batalkan logout
  const cancelLogout = () => {
    setShowLogoutDialog(false)
  }

  const handleEmergencyClear = async () => {
    console.log('[Header] Emergency clear initiated...')
    
    localStorage.clear()
    sessionStorage.clear()
    
    if ('caches' in window) {
      try {
        const names = await caches.keys()
        await Promise.all(names.map(name => caches.delete(name)))
        console.log('[Header] Browser cache cleared')
      } catch (e) {
        console.error('[Header] Failed to clear browser cache:', e)
      }
    }
    
    window.location.href = '/?emergency_clear=' + Date.now()
  }

  const menuItems = [
    { label: 'Layanan', href: '#layanan' },
    { label: 'Program', href: '#program' },
    { label: 'Testimoni', href: '#testimoni' },
    { label: 'Blog', href: '#blog' },
    { label: 'Kontak', href: '#kontak' },
  ]

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 font-bold text-xl hover:opacity-90 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                EduStory
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-7">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="font-medium">{maskEmail(user.email)}</span>
                  </div>
                  <Button
                    onClick={handleDashboardClick}
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                    disabled={loading && !userRole}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {loading && !userRole ? 'Memuat...' : 'Dashboard'}
                  </Button>
                  {/* ✅ Tombol logout sekarang memicu dialog */}
                  <Button
                    onClick={handleLogoutClick}
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setShowEmergency(!showEmergency)}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                    title="Emergency Clear Cache"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </Button>
                  {showEmergency && (
                    <Button
                      onClick={handleEmergencyClear}
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Emergency Clear
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={handleSignIn}
                    className="text-foreground hover:text-primary gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Masuk
                  </Button>
                  <Button
                    onClick={handleSignUp}
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Daftar
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 text-foreground"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isOpen && (
            <nav className="md:hidden pb-4 border-t border-border/50">
              <div className="flex flex-col gap-1 py-3">
                {menuItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg font-medium transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
                <div className="px-4 pt-3 flex flex-col gap-2 border-t border-border/50 mt-1">
                  {user ? (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground mb-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="font-medium">{maskEmail(user.email)}</span>
                      </div>
                      <Button
                        onClick={() => {
                          handleDashboardClick()
                          setIsOpen(false)
                        }}
                        className="w-full bg-primary hover:bg-primary/90 text-white"
                        disabled={loading && !userRole}
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        {loading && !userRole ? 'Memuat...' : 'Dashboard'}
                      </Button>
                      {/* ✅ Tombol logout mobile juga memicu dialog */}
                      <Button
                        onClick={handleLogoutClick}
                        variant="outline"
                        className="w-full"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                      <Button
                        onClick={handleEmergencyClear}
                        variant="destructive"
                        size="sm"
                        className="w-full gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Emergency Clear Cache
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleSignIn} className="w-full">
                        <LogIn className="w-4 h-4 mr-2" />
                        Masuk
                      </Button>
                      <Button onClick={handleSignUp} className="w-full bg-primary hover:bg-primary/90 text-white">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Daftar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </nav>
          )}
        </div>

        <AuthModalDialog
          isOpen={authOpen}
          onOpenChange={setAuthOpen}
          defaultMode={authMode}
        />
      </header>

      {/* ✅ Modal Konfirmasi Logout */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border/50 p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">Konfirmasi Logout</h3>
            <p className="text-muted-foreground mb-6">
              Apakah Anda yakin ingin keluar dari akun ini?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={cancelLogout}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={confirmLogout}
                className="bg-red-600 hover:bg-red-700"
              >
                Ya, Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Header