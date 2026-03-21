'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

const Testimonials = () => {
  const [current, setCurrent] = useState(0)
  const [autoplay, setAutoplay] = useState(true)

  const testimonials = [
    {
      name: 'Siti Nurhaliza',
      role: 'Orang Tua Siswa SD',
      program: 'Les Privat Matematika',
      image: '👩‍🦰',
      quote: 'EduStory sangat membantu anak saya. Pengajar sangat sabar dan metode mengajarnya menyenangkan. Nilai matematika anak saya meningkat dari 65 menjadi 85.',
      rating: 5,
    },
    {
      name: 'Ahmad Pratama',
      role: 'Siswa SMP',
      program: 'Les Online Bahasa Inggris',
      image: '👨‍🎓',
      quote: 'Dengan les online EduStory, saya jadi lebih percaya diri dalam berbahasa Inggris. Pengajarnya native speaker dan pembelajaran sangat interaktif.',
      rating: 5,
    },
    {
      name: 'Budi Santoso',
      role: 'Orang Tua Siswa SMA',
      program: 'Homeschooling IPA',
      image: '👨‍💼',
      quote: 'Program homeschooling di EduStory sangat komprehensif dan terjangkau. Kurikulumnya jelas dan anak saya bisa belajar dengan tempo yang sesuai.',
      rating: 5,
    },
    {
      name: 'Dewi Lestari',
      role: 'Mahasiswa',
      program: 'Les Privat Kalkulus',
      image: '👩‍🎓',
      quote: 'Pengajar kalkulus dari EduStory sangat memahami kesulitan saya. Penjelasannya detail dan membuat saya akhirnya mengerti konsep yang sulit.',
      rating: 5,
    },
    {
      name: 'Rudi Hermawan',
      role: 'Profesional',
      program: 'Kelas Bahasa Mandarin',
      image: '👨‍💻',
      quote: 'Program bahasa Mandarin EduStory sangat fleksibel sesuai jadwal kerja saya. Instruktur profesional dan materi berkualitas tinggi.',
      rating: 5,
    },
  ]

  useEffect(() => {
    if (!autoplay) return

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [autoplay, testimonials.length])

  const prev = () => {
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length)
    setAutoplay(false)
  }

  const next = () => {
    setCurrent((prev) => (prev + 1) % testimonials.length)
    setAutoplay(false)
  }

  return (
    <section id="testimoni" className="w-full py-16 md:py-20 lg:py-24 bg-gradient-to-b from-background to-card/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-primary mb-4">
            Apa Kata Mereka?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ribuan siswa dan orang tua puas dengan layanan kami
          </p>
        </div>

        {/* Testimonial Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl shadow-lg shadow-primary/10 border border-border/50 p-8 md:p-12 mb-8 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300">
            <div className="mb-6">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-warning text-warning"
                  />
                ))}
              </div>
              <p className="text-xl md:text-2xl text-foreground italic mb-8 leading-relaxed">
                "{testimonials[current].quote}"
              </p>
            </div>

            <div className="flex items-center gap-4 border-t border-border pt-6">
              <div className="text-4xl">
                {testimonials[current].image}
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-lg">
                  {testimonials[current].name}
                </h4>
                <p className="text-muted-foreground text-sm">
                  {testimonials[current].role}
                </p>
                <p className="text-primary font-medium text-sm">
                  {testimonials[current].program}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={prev}
              className="border-primary text-primary hover:bg-primary/10"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {/* Dots Indicator */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrent(index)
                    setAutoplay(false)
                  }}
                  className={`h-2 rounded-full transition-all ${
                    index === current
                      ? 'bg-primary w-8'
                      : 'bg-border w-2 hover:bg-primary/50'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={next}
              className="border-primary text-primary hover:bg-primary/10"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Testimonials
