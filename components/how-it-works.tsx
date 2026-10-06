'use client'

import { MessageSquare, CheckCircle2, Users, BookOpen } from 'lucide-react'

const HowItWorks = () => {
  const steps = [
    {
      number: 1,
      icon: MessageSquare,
      title: 'Konsultasi Gratis',
      description: 'Ceritakan kebutuhan belajarmu — tim kami bantu memetakan target.',
    },
    {
      number: 2,
      icon: CheckCircle2,
      title: 'Pilih Program',
      description: 'Tentukan mata pelajaran, format, dan jadwal yang paling pas.',
    },
    {
      number: 3,
      icon: Users,
      title: 'Match dengan Pengajar',
      description: 'Kami carikan pengajar terbaik yang sesuai kebutuhanmu.',
    },
    {
      number: 4,
      icon: BookOpen,
      title: 'Mulai Belajar',
      description: 'Sesi dimulai dengan pendekatan personal dan progres yang terukur.',
    },
  ]

  return (
    <section className="section-pad bg-muted/40">
      <div className="container-page">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="eyebrow">Cara Kerja</span>
          <h2 className="mt-4">Mulai belajar hanya dalam 4 langkah</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Proses sederhana dan transparan — dari konsultasi sampai sesi pertama.
          </p>
        </div>

        <ol className="relative grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Connector (desktop) */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-primary/40 via-secondary/40 to-accent/40 lg:block"
          />

          {steps.map((step) => {
            const Icon = step.icon
            return (
              <li key={step.number} className="relative">
                <div className="flex flex-col items-start lg:items-center lg:text-center">
                  <div className="relative mb-5">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-lg font-extrabold text-primary shadow-soft">
                      {step.number}
                    </span>
                    <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

export default HowItWorks
