'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AuthModal } from './auth/auth-modal'
import { CheckCircle2, ArrowRight } from 'lucide-react'

const HeroWithAuth = () => {
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')

  const handleDaftarSekarang = () => {
    setAuthMode('signup')
    setAuthDialogOpen(true)
  }

  const handleMasuk = () => {
    setAuthMode('signin')
    setAuthDialogOpen(true)
  }

  return (
    <>
      <section
        id="home"
        className="w-full py-12 md:py-20 lg:py-24 bg-gradient-to-br from-background via-background to-card/30 relative overflow-hidden"
      >
        {/* Decorative gradient orbs */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-3xl opacity-20 -z-10"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-t from-primary/10 rounded-full blur-3xl opacity-10 -z-10"></div>
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6 animate-fade-in">
              <div>
                <h1 className="text-balance text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-foreground to-secondary mb-4">
                  Wujudkan Potensi Belajar Terbaik Bersama EduStory
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                  Platform pembelajaran privat terpercaya dengan pengajar profesional, fleksibel, dan personalized untuk semua usia
                </p>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="font-semibold text-foreground">5000+ Siswa</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="font-semibold text-foreground">500+ Pengajar</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="font-semibold text-foreground">95% Kepuasan</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  onClick={handleDaftarSekarang}
                  className="bg-primary hover:bg-primary/90 text-white h-12 px-8 text-base font-semibold flex items-center gap-2"
                >
                  Daftar Sekarang
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleMasuk}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5 h-12 px-8 text-base font-semibold"
                >
                  Masuk
                </Button>
              </div>
            </div>

            {/* Right Content - Illustration */}
            <div className="relative h-96 md:h-full min-h-96 animate-slide-up">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-2xl"></div>
              <div className="relative h-full rounded-2xl overflow-hidden shadow-lg border border-border/50">
                <img
                  src="/hero-illustration.jpg"
                  alt="Students learning together"
                  className="w-full h-full object-cover"
                />
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
