'use client'

import { useEffect, useRef, useState } from 'react'

const Stats = () => {
  const [counts, setCounts] = useState({ students: 0, tutors: 0, satisfaction: 0, experience: 0 })
  const sectionRef = useRef<HTMLElement | null>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          const duration = 1800
          const startTime = Date.now()
          const animate = () => {
            const progress = Math.min((Date.now() - startTime) / duration, 1)
            const ease = 1 - Math.pow(1 - progress, 3)
            setCounts({
              students: Math.floor(5000 * ease),
              tutors: Math.floor(500 * ease),
              satisfaction: Math.floor(95 * ease),
              experience: Math.floor(8 * ease),
            })
            if (progress < 1) requestAnimationFrame(animate)
          }
          animate()
        }
      },
      { threshold: 0.2 },
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [hasAnimated])

  const stats = [
    { value: '5.000+', label: 'Siswa terbantu' },
    { value: '500+', label: 'Pengajar profesional' },
    { value: '95%', label: 'Tingkat kepuasan' },
    { value: '8+', label: 'Tahun pengalaman' },
  ]

  const live = [`${counts.students.toLocaleString('id-ID')}+`, `${counts.tutors}+`, `${counts.satisfaction}%`, `${counts.experience}+`]

  return (
    <section ref={sectionRef} className="section-pad">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-14 text-background sm:px-12 md:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.22]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 15% 15%, color-mix(in oklab, var(--primary) 90%, transparent), transparent 45%), radial-gradient(circle at 85% 80%, color-mix(in oklab, var(--accent) 80%, transparent), transparent 45%)',
            }}
          />
          <div className="relative">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="text-background">EduStory dalam angka</h2>
              <p className="mt-4 text-background/70">
                Pencapaian kami dalam memberikan layanan pendidikan berkualitas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
                    {hasAnimated ? stat.value : live[index]}
                  </div>
                  <p className="mt-2 text-sm font-medium text-background/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Stats
