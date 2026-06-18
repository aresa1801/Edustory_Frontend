'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AuthModal } from './auth/auth-modal'
import { useAuth } from '@/lib/auth-context'
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'

const HeroWithAuth = () => {
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')
  const { user, userRole, profileExists } = useAuth()

  const handleDaftarSekarang = () => {
    setAuthMode('signup')
    setAuthDialogOpen(true)
  }

  const handleMasuk = () => {
    setAuthMode('signin')
    setAuthDialogOpen(true)
  }

  const dashboardPath = userRole ? `/dashboard/${userRole}` : '/dashboard'
  
  // User is authenticated AND has a valid profile
  const isValidUser = user && profileExists && userRole

  return (
    <>
      <section
        id="home"
        className="w-full py-16 md:py-24 lg:py-32 relative overflow-hidden"
      >
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 -z-10" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-secondary/10 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-7">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Platform Pembelajaran #1 di Indonesia
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  Wujudkan{' '}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-secondary">
                    Potensi Belajar
                  </span>{' '}
                  Terbaik Bersama EduStory
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg">
                  Platform pembelajaran privat terpercaya dengan pengajar profesional,
                  fleksibel, dan personalized untuk semua usia.
                </p>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {[
                  '5000+ Siswa Aktif',
                  '500+ Pengajar Terverifikasi',
                  '95% Tingkat Kepuasan',
                ].map((badge) => (
                  <div key={badge} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground">{badge}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                {isValidUser ? (
                  <Link href={dashboardPath}>
                    <Button className="bg-primary hover:bg-primary/90 text-white h-12 px-8 text-base font-semibold gap-2">
                      Buka Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button
                      onClick={handleDaftarSekarang}
                      className="bg-primary hover:bg-primary/90 text-white h-12 px-8 text-base font-semibold gap-2"
                    >
                      Daftar Sekarang
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleMasuk}
                      variant="outline"
                      className="h-12 px-8 text-base font-semibold"
                    >
                      Sudah Punya Akun? Masuk
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Right Content — Illustration */}
            <div className="relative h-80 md:h-[480px]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl" />
              <div className="relative h-full rounded-3xl overflow-hidden border border-border/40 shadow-2xl shadow-primary/10">
                <img
                  src="/hero-illustration.jpg"
                  alt="Siswa belajar bersama pengajar EduStory"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-4 -left-4 bg-card border border-border/50 rounded-2xl p-4 shadow-lg backdrop-blur-sm hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sesi hari ini</p>
                    <p className="text-sm font-semibold">Matematika — 15:00 WIB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <AuthModal
            initialMode={authMode}
            onSuccess={() => setAuthDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default HeroWithAuth
