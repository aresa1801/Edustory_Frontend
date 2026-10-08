'use client'

import { Home, Monitor, Users, BookOpen, Building2, Target } from 'lucide-react'

const Features = () => {
  const features = [
    {
      icon: Home,
      title: 'Les Privat ke Rumah',
      description: 'Pengajar datang ke lokasi Anda untuk pembelajaran yang lebih personal dan fokus.',
      tone: 'primary',
    },
    {
      icon: Monitor,
      title: 'Les Online',
      description: 'Belajar via Zoom/Google Meet dari mana saja, dengan rekaman dan materi digital.',
      tone: 'secondary',
    },
    {
      icon: Users,
      title: 'Kelas Semi-Privat',
      description: 'Belajar bersama teman dalam kelompok kecil dengan biaya lebih hemat.',
      tone: 'accent',
    },
    {
      icon: BookOpen,
      title: 'Homeschooling',
      description: 'Kurikulum lengkap setara sekolah formal, disesuaikan dengan kecepatan anak.',
      tone: 'primary',
    },
    {
      icon: Building2,
      title: 'Corporate Training',
      description: 'Program pelatihan terstruktur untuk perusahaan dan institusi.',
      tone: 'secondary',
    },
    {
      icon: Target,
      title: 'Program Personalized',
      description: 'Materi dan target belajar dirancang khusus sesuai kebutuhan individu.',
      tone: 'accent',
    },
  ]

  const toneClass: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/12 text-secondary',
    accent: 'bg-accent/16 text-accent-foreground',
  }

  return (
    <section id="layanan" className="section-pad">
      <div className="container-page">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="eyebrow">Layanan</span>
          <h2 className="mt-4">Satu platform untuk semua cara belajar</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pilih format belajar yang paling nyaman — kami menyesuaikan metode, jadwal, dan pengajar.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article key={feature.title} className="surface hover-card group p-6">
                <span
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${toneClass[feature.tone]}`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Features
