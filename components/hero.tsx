'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import Image from 'next/image'

const Hero = () => {
  return (
    <section id="home" className="section-pad relative w-full overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute -right-16 top-10 -z-10 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 -z-10 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />

      <div className="container-page">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Left Content */}
          <div className="animate-fade-in space-y-7">
            <div>
              <span className="eyebrow">Pembelajaran privat</span>
              <h1 className="mt-5 text-balance font-extrabold tracking-tight text-4xl md:text-5xl lg:text-6xl">
                Wujudkan Potensi Belajar Terbaik Bersama EduStory
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                Platform pembelajaran privat terpercaya dengan pengajar profesional, fleksibel, dan personalized untuk semua usia
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
              <div className="surface inline-flex items-center gap-2 px-4 py-2.5">
                <CheckCircle2 className="h-5 w-5 text-secondary" />
                <span className="font-semibold text-foreground">5000+ Siswa</span>
              </div>
              <div className="surface inline-flex items-center gap-2 px-4 py-2.5">
                <CheckCircle2 className="h-5 w-5 text-secondary" />
                <span className="font-semibold text-foreground">500+ Pengajar</span>
              </div>
              <div className="surface inline-flex items-center gap-2 px-4 py-2.5">
                <CheckCircle2 className="h-5 w-5 text-secondary" />
                <span className="font-semibold text-foreground">95% Kepuasan</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 pt-2 sm:flex-row">
              <Button className="h-12 gap-2 rounded-xl px-8 text-base font-semibold">
                Mulai Belajar
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-xl px-8 text-base font-semibold"
              >
                Lihat Program
              </Button>
            </div>
          </div>

          {/* Right Content - Illustration */}
          <div className="animate-slide-up relative h-96 min-h-96 md:h-full">
            <div className="surface-gradient h-full overflow-hidden p-2">
              <div className="h-full overflow-hidden rounded-xl">
                <Image
                  src="/hero-illustration.jpg"
                  alt="Students learning together"
                  width={960}
                  height={720}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
