'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AuthModal } from './auth/auth-modal'
import { useAuth } from '@/lib/auth-context'
import { ArrowRight, Sparkles, Star, BadgeCheck, CalendarCheck, GraduationCap } from 'lucide-react'

const HeroWithAuth = () => {
  const router = useRouter()
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')
  const { user, userRole, loading } = useAuth()

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode)
    setAuthDialogOpen(true)
  }

  const handleDashboardClick = () => {
    if (user && userRole) {
      const dashboardPath =
        userRole === 'student'
          ? '/dashboard/student'
          : userRole === 'tutor'
            ? '/dashboard/tutor'
            : userRole === 'admin'
              ? '/dashboard/admin'
              : '/dashboard'
      router.push(dashboardPath)
    } else {
      openAuth('signin')
    }
  }

  return (
    <>
      <section id="home" className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-24">
        {/* Ambient background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-40 -z-10 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
        />

        <div className="container-page">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            {/* Left — copy */}
            <div className="animate-slide-up">
              <span className="eyebrow">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Platform Pembelajaran Privat Terpercaya
              </span>

              <h1 className="mt-6">
                Belajar lebih cepat dengan{' '}
                <span className="text-gradient">pengajar yang tepat</span> untukmu
              </h1>

              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Les privat ke rumah, online, semi-privat, sampai homeschooling — semua diatur rapi dalam satu
                aplikasi. Cari pengajar, atur jadwal, pantau progres, dan bayar dengan aman.
              </p>

              {/* Trust row */}
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                {[
                  { icon: GraduationCap, label: '500+ pengajar terverifikasi' },
                  { icon: BadgeCheck, label: 'Kurikulum & progres terukur' },
                  { icon: CalendarCheck, label: 'Jadwal fleksibel' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-sm font-medium">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/12 text-secondary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {label}
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                {user ? (
                  <Button onClick={handleDashboardClick} size="lg" disabled={loading} className="h-12 px-7 text-base">
                    {loading ? 'Memuat…' : 'Buka Dashboard'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => openAuth('signup')} size="lg" disabled={loading} className="h-12 px-7 text-base">
                      Daftar Sekarang
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => openAuth('signin')}
                      variant="outline"
                      size="lg"
                      disabled={loading}
                      className="h-12 px-7 text-base"
                    >
                      Masuk
                    </Button>
                  </>
                )}
              </div>

              {/* Rating */}
              <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {['#5B4BF5', '#10B981', '#FFB020', '#2A7FFF'].map((c) => (
                    <span
                      key={c}
                      className="h-7 w-7 rounded-full border-2 border-background"
                      style={{ background: `linear-gradient(135deg, ${c}, color-mix(in oklab, ${c} 55%, white))` }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />
                  ))}
                </div>
                <span>
                  <strong className="text-foreground">4.9/5</strong> dari 5.000+ siswa
                </span>
              </div>
            </div>

            {/* Right — visual */}
            <div className="relative">
              <div className="surface overflow-hidden p-2 shadow-lifted">
                <div className="overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/hero-illustration.jpg"
                    alt="Siswa belajar bersama pengajar EduStory"
                    className="aspect-[4/5] w-full object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
                  />
                </div>
              </div>

              {/* Floating: session */}
              <div className="surface absolute -bottom-5 left-0 flex items-center gap-3 p-3 pr-4 shadow-lifted sm:-left-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <CalendarCheck className="h-4.5 w-4.5" />
                </span>
                <div className="leading-tight">
                  <p className="text-[11px] text-muted-foreground">Sesi berikutnya</p>
                  <p className="text-sm font-semibold">Matematika · 15:00 WIB</p>
                </div>
              </div>

              {/* Floating: progress */}
              <div className="surface absolute -top-4 right-0 hidden items-center gap-3 p-3 pr-4 shadow-lifted sm:flex sm:-right-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/12 text-secondary">
                  <BadgeCheck className="h-4.5 w-4.5" />
                </span>
                <div className="leading-tight">
                  <p className="text-[11px] text-muted-foreground">Progres bulan ini</p>
                  <p className="text-sm font-semibold">+18% 📈</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <AuthModal initialMode={authMode} onSuccess={() => setAuthDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default HeroWithAuth
