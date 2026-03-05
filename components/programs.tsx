'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const Programs = () => {
  const [activeTab, setActiveTab] = useState('sd')

  const programData = {
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

  const programs = programData[activeTab as keyof typeof programData]

  return (
    <section id="program" className="w-full py-16 md:py-20 lg:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Program Pembelajaran Kami
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Berbagai pilihan program untuk semua tingkat pendidikan
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {['sd', 'smp', 'sma', 'mahasiswa', 'bahasa'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-primary text-white'
                  : 'bg-white text-foreground border border-border hover:border-primary'
              }`}
            >
              {tab === 'sd' && 'SD'}
              {tab === 'smp' && 'SMP'}
              {tab === 'sma' && 'SMA'}
              {tab === 'mahasiswa' && 'Mahasiswa'}
              {tab === 'bahasa' && 'Bahasa'}
            </button>
          ))}
        </div>

        {/* Program Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program, index) => (
            <div
              key={index}
              className="p-6 bg-white rounded-xl border border-border hover:shadow-lg hover:border-primary transition-all duration-300"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {program.subject}
                  </h3>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {program.level}
                  </Badge>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-2xl font-bold text-primary mb-1">
                  {program.price}
                </p>
                <p className="text-sm text-muted-foreground">per sesi</p>
              </div>

              <Button
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/5"
              >
                Lihat Detail
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Programs
