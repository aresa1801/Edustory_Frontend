'use client'

import { Home, Monitor, Users, BookOpen, Building2, Target } from 'lucide-react'

const Features = () => {
  const features = [
    {
      icon: Home,
      title: 'Les Privat ke Rumah',
      description: 'Pengajar datang ke lokasi Anda untuk pembelajaran yang lebih personal',
    },
    {
      icon: Monitor,
      title: 'Les Online',
      description: 'Belajar via Zoom/Google Meet dari mana saja dengan fleksibel',
    },
    {
      icon: Users,
      title: 'Kelas Semi-Privat',
      description: 'Belajar bersama teman dengan harga lebih hemat',
    },
    {
      icon: BookOpen,
      title: 'Homeschooling',
      description: 'Kurikulum lengkap setara sekolah formal',
    },
    {
      icon: Building2,
      title: 'Corporate Training',
      description: 'Pelatihan untuk perusahaan dan institusi',
    },
    {
      icon: Target,
      title: 'Program Personalized',
      description: 'Materi disesuaikan kebutuhan individu',
    },
  ]

  return (
    <section id="layanan" className="w-full py-16 md:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Mengapa Memilih EduStory?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Kami menyediakan berbagai layanan pembelajaran yang disesuaikan dengan kebutuhan Anda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="p-6 bg-white rounded-xl border border-border hover:border-primary hover:shadow-lg transition-all duration-300 group"
              >
                <div className="mb-4">
                  <div className="inline-flex p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Features
