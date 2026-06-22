'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X, BookOpen, LogIn, UserPlus, LayoutDashboard, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthModalDialog } from '@/components/auth/auth-modal-dialog'
import { useAuth } from '@/lib/auth-context'

// Helper function to mask email
const maskEmail = (email: string | null | undefined): string => {
  if (!email) return ''
  const [username, domain] = email.split('@')
  if (!username || !domain) return email
  
  const maskedUsername = username.length > 2 
    ? username[0] + '*'.repeat(username.length - 1)
    : username[0] + '*'
  
  return `${maskedUsername}@${domain}`
}

const Header = () => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [scrolled, setScrolled] = useState(false)
  
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

  const handleDashboardClick = () => {
    if (user && userRole) {
      const dashboardPath = userRole === 'student' 
        ? '/dashboard/student' 
        : userRole === 'tutor'
        ? '/dashboard/tutor'
        : userRole === 'admin'
        ? '/dashboard/admin'
        : '/dashboard'
      
      router.push(dashboardPath)
    } else {
      setAuthMode('signin')
      setAuthOpen(true)
    }
  }

  const handleLogout = async () => {
    try {
      await forceSignOut()
    } catch (error) {
      console.error('[Header] Logout error:', error)
      // Force reload even if error
      window.location.href = '/'
    }
  }

  const menuItems = [
    { label: 'Layanan', href: '#layanan' },
    { label: 'Program', href: '#program' },
    { label: 'Testimoni', href: '#testimoni' },
    { label: 'Blog', href: '#blog' },
    { label: 'Kontak', href: '#kontak' },
  ]

  return (
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
              // User sudah login
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
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              // User belum login
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
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
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
  )
}

export default Header