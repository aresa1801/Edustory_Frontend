'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'

const TABS = [
  { key: 'sd', label: 'SD' },
  { key: 'smp', label: 'SMP' },
  { key: 'sma', label: 'SMA' },
  { key: 'mahasiswa', label: 'Mahasiswa' },
  { key: 'bahasa', label: 'Bahasa' },
] as const

const Programs = () => {
  const [activeTab, setActiveTab] = useState<string>('sd')

  const programData: Record<string, { subject: string; level: string; price: string }[]> = {
    sd: [
      { subject: 'Matematika', level: 'SD 1-3', price: 'Rp 150K - 200K' },
      { subject: 'Bahasa Indonesia', level: 'SD 1-3', price: 'Rp 150K - 200K' },
      { subject: 'Bahasa Inggris', level: 'SD 1-3', price: 'Rp 150K - 200K' },
      { subject: 'Matematika', level: 'SD 4-6', price: 'Rp 200K - 250K' },
      { subject: 'IPA', level: 'SD 4-6', price: 'Rp 200K - 250K' },
      { subject: 'Bahasa Inggris', level: 'SD 4-6', price: 'Rp 200K - 250K' },
    ],
    smp: [
      { subject: 'Matematika', level: 'SMP', price: 'Rp 250K - 350K' },
      { subject: 'Fisika', level: 'SMP', price: 'Rp 250K - 350K' },
      { subject: 'Kimia', level: 'SMP', price: 'Rp 250K - 350K' },
      { subject: 'Bahasa Inggris', level: 'SMP', price: 'Rp 250K - 350K' },
      { subject: 'Biologi', level: 'SMP', price: 'Rp 250K - 350K' },
      { subject: 'Bahasa Indonesia', level: 'SMP', price: 'Rp 250K - 350K' },
    ],
    sma: [
      { subject: 'Matematika', level: 'SMA IPA/IPS', price: 'Rp 350K - 500K' },
      { subject: 'Fisika', level: 'SMA IPA', price: 'Rp 350K - 500K' },
      { subject: 'Kimia', level: 'SMA IPA', price: 'Rp 350K - 500K' },
      { subject: 'Bahasa Inggris', level: 'SMA', price: 'Rp 350K - 500K' },
      { subject: 'Sejarah', level: 'SMA IPS', price: 'Rp 350K - 500K' },
      { subject: 'Geografi', level: 'SMA IPS', price: 'Rp 350K - 500K' },
    ],
    mahasiswa: [
      { subject: 'Kalkulus', level: 'Mahasiswa', price: 'Rp 400K - 600K' },
      { subject: 'Aljabar Linier', level: 'Mahasiswa', price: 'Rp 400K - 600K' },
      { subject: 'Fisika Dasar', level: 'Mahasiswa', price: 'Rp 400K - 600K' },
      { subject: 'Kimia Organik', level: 'Mahasiswa', price: 'Rp 400K - 600K' },
      { subject: 'Pemrograman', level: 'Mahasiswa', price: 'Rp 400K - 600K' },
      { subject: 'Statistika', level: 'Mahasiswa', price: 'Rp 400K - 600K' },
    ],
    bahasa: [
      { subject: 'Bahasa Inggris', level: 'Semua Usia', price: 'Rp 200K - 400K' },
      { subject: 'Bahasa Mandarin', level: 'Semua Usia', price: 'Rp 250K - 450K' },
      { subject: 'Bahasa Jepang', level: 'Semua Usia', price: 'Rp 250K - 450K' },
      { subject: 'Bahasa Korea', level: 'Semua Usia', price: 'Rp 250K - 450K' },
      { subject: 'Bahasa Arab', level: 'Semua Usia', price: 'Rp 200K - 400K' },
      { subject: 'TOEFL/IELTS', level: 'Persiapan Test', price: 'Rp 300K - 500K' },
    ],
  }

  const programs = programData[activeTab] ?? []

  return (
    <section id="program" className="section-pad border-y border-border/70 bg-muted/40">
      <div className="container-page">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="eyebrow">Program</span>
          <h2 className="mt-4">Program pembelajaran kami</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Berbagai pilihan mata pelajaran untuk semua tingkat pendidikan.
          </p>
        </div>

        {/* Tabs — scrollable, pill style */}
        <div className="-mx-4 mb-10 flex justify-start gap-2 overflow-x-auto px-4 pb-2 sm:justify-center sm:overflow-visible">
          {TABS.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program, index) => (
            <article key={`${program.subject}-${index}`} className="surface hover-card group flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold">{program.subject}</h3>
                <Badge variant="secondary" className="shrink-0 rounded-full bg-primary/10 text-primary">
                  {program.level}
                </Badge>
              </div>

              <div className="mt-5 flex-1">
                <p className="text-2xl font-extrabold tracking-tight text-foreground">{program.price}</p>
                <p className="text-sm text-muted-foreground">per sesi (estimasi)</p>
              </div>

              <Button
                variant="outline"
                className="mt-6 w-full justify-between rounded-xl border-border hover:border-primary/50 hover:bg-primary/5"
              >
                Lihat detail
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Programs
