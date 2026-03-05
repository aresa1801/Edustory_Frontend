'use client'

import { useEffect, useRef, useState } from 'react'

const Stats = () => {
  const [counts, setCounts] = useState({
    students: 0,
    tutors: 0,
    satisfaction: 0,
    experience: 0,
  })

  const sectionRef = useRef(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          animateCounters()
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [hasAnimated])

  const animateCounters = () => {
    const duration = 2000
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      setCounts({
        students: Math.floor(5000 * progress),
        tutors: Math.floor(500 * progress),
        satisfaction: Math.floor(95 * progress),
        experience: Math.floor(8 * progress),
      })

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }

  const stats = [
    {
      value: `${counts.students}+`,
      label: 'Siswa Terbantu',
      finalValue: '5000+',
    },
    {
      value: `${counts.tutors}+`,
      label: 'Pengajar Profesional',
      finalValue: '500+',
    },
    {
      value: `${counts.satisfaction}%`,
      label: 'Tingkat Kepuasan',
      finalValue: '95%',
    },
    {
      value: `${counts.experience}+`,
      label: 'Tahun Pengalaman',
      finalValue: '8+',
    },
  ]

  return (
    <section ref={sectionRef} className="w-full py-16 md:py-20 lg:py-24 bg-gradient-to-r from-primary to-secondary text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            EduStory dalam Angka
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Pencapaian kami dalam memberikan layanan pendidikan berkualitas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-8 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:border-white/40 transition-all"
            >
              <div className="text-4xl md:text-5xl font-bold mb-2">
                {hasAnimated ? stat.finalValue : stat.value}
              </div>
              <p className="text-lg text-white/90 font-semibold">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Stats
