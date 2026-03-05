'use client'

import { MessageSquare, CheckCircle2, Users, BookOpen } from 'lucide-react'

const HowItWorks = () => {
  const steps = [
    {
      number: 1,
      icon: MessageSquare,
      title: 'Konsultasi Gratis',
      description: 'Hubungi kami untuk diskusi kebutuhan belajar Anda',
    },
    {
      number: 2,
      icon: CheckCircle2,
      title: 'Pilih Program',
      description: 'Tentukan mata pelajaran dan jadwal pembelajaran',
    },
    {
      number: 3,
      icon: Users,
      title: 'Match dengan Pengajar',
      description: 'Kami carikan pengajar terbaik sesuai kebutuhan Anda',
    },
    {
      number: 4,
      icon: BookOpen,
      title: 'Mulai Belajar',
      description: 'Proses pembelajaran dimulai dengan pendekatan personal',
    },
  ]

  return (
    <section className="w-full py-16 md:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Cara Mudah Mulai Belajar
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Proses yang sederhana dan transparan untuk memulai perjalanan belajar Anda
          </p>
        </div>

        {/* Steps Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connecting Line - Desktop Only */}
          <div className="hidden lg:block absolute top-20 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent z-0"></div>

          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={index} className="relative z-10">
                <div className="flex flex-col items-center text-center">
                  {/* Step Number Circle */}
                  <div className="mb-6 flex items-center justify-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-white border-4 border-primary flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">
                          {step.number}
                        </span>
                      </div>
                      <div className="absolute inset-0 rounded-full bg-primary/10 scale-125 -z-10"></div>
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="mb-4 p-3 rounded-lg bg-primary/10">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Vertical Arrow - Mobile Only */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center my-6">
                    <div className="text-primary text-3xl">↓</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
