'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react'

const Testimonials = () => {
  const [current, setCurrent] = useState(0)
  const [autoplay, setAutoplay] = useState(true)

  const testimonials = [
    {
      name: 'Siti Nurhaliza',
      role: 'Orang Tua Siswa SD',
      program: 'Les Privat Matematika',
      image: '👩‍🦰',
      quote:
        'EduStory sangat membantu anak saya. Pengajar sangat sabar dan metode mengajarnya menyenangkan. Nilai matematika anak saya meningkat dari 65 menjadi 85.',
      rating: 5,
    },
    {
      name: 'Ahmad Pratama',
      role: 'Siswa SMP',
      program: 'Les Online Bahasa Inggris',
      image: '👨‍🎓',
      quote:
        'Dengan les online EduStory, saya jadi lebih percaya diri dalam berbahasa Inggris. Pengajarnya native speaker dan pembelajaran sangat interaktif.',
      rating: 5,
    },
    {
      name: 'Budi Santoso',
      role: 'Orang Tua Siswa SMA',
      program: 'Homeschooling IPA',
      image: '👨‍💼',
      quote:
        'Program homeschooling di EduStory sangat komprehensif dan terjangkau. Kurikulumnya jelas dan anak saya bisa belajar dengan tempo yang sesuai.',
      rating: 5,
    },
    {
      name: 'Dewi Lestari',
      role: 'Mahasiswa',
      program: 'Les Privat Kalkulus',
      image: '👩‍🎓',
      quote:
        'Pengajar kalkulus dari EduStory sangat memahami kesulitan saya. Penjelasannya detail dan membuat saya akhirnya mengerti konsep yang sulit.',
      rating: 5,
    },
    {
      name: 'Rudi Hermawan',
      role: 'Profesional',
      program: 'Kelas Bahasa Mandarin',
      image: '👨‍💻',
      quote:
        'Program bahasa Mandarin EduStory sangat fleksibel sesuai jadwal kerja saya. Instruktur profesional dan materi berkualitas tinggi.',
      rating: 5,
    },
  ]

  useEffect(() => {
    if (!autoplay) return
    const interval = setInterval(() => setCurrent((prev) => (prev + 1) % testimonials.length), 6000)
    return () => clearInterval(interval)
  }, [autoplay, testimonials.length])

  const prev = () => {
    setCurrent((p) => (p - 1 + testimonials.length) % testimonials.length)
    setAutoplay(false)
  }
  const next = () => {
    setCurrent((p) => (p + 1) % testimonials.length)
    setAutoplay(false)
  }

  const active = testimonials[current]

  return (
    <section id="testimoni" className="section-pad">
      <div className="container-page">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="eyebrow">Testimoni</span>
          <h2 className="mt-4">Apa kata mereka</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Ribuan siswa dan orang tua puas dengan layanan kami.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="surface relative p-8 md:p-12">
            <Quote className="absolute right-8 top-8 h-12 w-12 text-primary/10" aria-hidden />

            <div className="mb-5 flex gap-1">
              {[...Array(active.rating)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-accent text-accent" />
              ))}
            </div>

            <p className="text-lg leading-relaxed text-foreground md:text-xl">“{active.quote}”</p>

            <div className="mt-8 flex items-center gap-4 border-t border-border pt-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-2xl" aria-hidden>
                {active.image}
              </span>
              <div>
                <p className="font-bold text-foreground">{active.name}</p>
                <p className="text-sm text-muted-foreground">{active.role}</p>
                <p className="text-sm font-medium text-primary">{active.program}</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <button
              onClick={prev}
              aria-label="Testimoni sebelumnya"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary/50 hover:text-primary"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrent(index)
                    setAutoplay(false)
                  }}
                  className={`h-2 rounded-full transition-all ${
                    index === current ? 'w-8 bg-primary' : 'w-2 bg-border hover:bg-primary/50'
                  }`}
                  aria-label={`Testimoni ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              aria-label="Testimoni berikutnya"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary/50 hover:text-primary"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Testimonials
