'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, BookOpen, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthModalDialog } from '@/components/auth/auth-modal-dialog'

const Header = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  // Theme toggle removed — project is dark-mode only
  const isDark = true

  const toggleMenu = () => setIsOpen(!isOpen)

  const handleSignIn = () => {
    setAuthMode('signin')
    setAuthOpen(true)
  }

  const handleSignUp = () => {
    setAuthMode('signup')
    setAuthOpen(true)
  }

  const menuItems = [
    { label: 'Home', href: '#home' },
    { label: 'Layanan', href: '#layanan' },
    { label: 'Program', href: '#program' },
    { label: 'Testimoni', href: '#testimoni' },
    { label: 'Blog', href: '#blog' },
    { label: 'Kontak', href: '#kontak' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl md:text-2xl text-primary">
            <BookOpen className="w-7 h-7" />
            <span>EduStory</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-foreground hover:text-primary font-medium transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary/5"
            >
              Konsultasi Gratis
            </Button>
            <Button 
              onClick={handleSignUp}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Daftar Sekarang
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <nav className="md:hidden pb-4 border-t border-border">
            <div className="flex flex-col gap-3 py-4">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-4 py-2 text-foreground hover:text-primary hover:bg-primary/5 rounded-lg font-medium transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="px-4 pt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full border-primary text-primary"
                >
                  Konsultasi Gratis
                </Button>
                <Button 
                  onClick={() => {
                    handleSignUp()
                    setIsOpen(false)
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                >
                  Daftar Sekarang
                </Button>
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
