'use client'

import { BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

const Tutors = () => {
  const tutors = [
    {
      name: 'Dr. Siti Nurhayati',
      qualification: 'S2 Pendidikan Matematika',
      subjects: 'Matematika, Kalkulus',
      experience: '12 tahun',
      rating: '4.9/5',
      image: '👩‍🏫',
    },
    {
      name: 'Prof. Ahmad Hidayat',
      qualification: 'S2 Pendidikan Fisika',
      subjects: 'Fisika, IPA',
      experience: '15 tahun',
      rating: '4.95/5',
      image: '👨‍🏫',
    },
    {
      name: 'Budi Santoso, M.Ed',
      qualification: 'S2 Bahasa Inggris',
      subjects: 'Bahasa Inggris, TOEFL',
      experience: '10 tahun',
      rating: '4.88/5',
      image: '👨‍🏫',
    },
    {
      name: 'Dewi Kusuma, S.Pd',
      qualification: 'S1 Kimia',
      subjects: 'Kimia, Biologi',
      experience: '8 tahun',
      rating: '4.85/5',
      image: '👩‍🏫',
    },
    {
      name: 'Rudi Hermawan, M.Kom',
      qualification: 'S2 Ilmu Komputer',
      subjects: 'Pemrograman, IT',
      experience: '9 tahun',
      rating: '4.92/5',
      image: '👨‍💻',
    },
    {
      name: 'Rina Lestari, S.Pd',
      qualification: 'S1 Bahasa Indonesia',
      subjects: 'Bahasa Indonesia, Sastra',
      experience: '7 tahun',
      rating: '4.87/5',
      image: '👩‍🏫',
    },
  ]

  return (
    <section className="w-full py-16 md:py-20 lg:py-24 bg-card/50 border-t border-border/50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-primary mb-4">
            Pengajar Profesional Kami
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Dipilih dan dilatih secara khusus untuk memberikan kualitas terbaik
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {tutors.map((tutor, index) => (
            <div
              key={index}
              className="group bg-card rounded-xl border border-border hover:border-primary/50 overflow-hidden hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 transform hover:scale-102 hover:-translate-y-1"
            >
              {/* Image Area */}
              <div className="h-40 bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center text-7xl group-hover:from-primary/25 group-hover:to-secondary/25 transition-all duration-300">
                {tutor.image}
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      {tutor.name}
                      <BadgeCheck className="w-5 h-5 text-primary" />
                    </h3>
                    <p className="text-sm text-primary font-medium">
                      {tutor.qualification}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold">
                      Mata Pelajaran
                    </p>
                    <p className="text-foreground">
                      {tutor.subjects}
                    </p>
                  </div>
                  
                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Pengalaman</p>
                      <p className="font-semibold text-foreground">
                        {tutor.experience}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rating</p>
                      <p className="font-semibold text-primary">
                        {tutor.rating}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary/5"
                >
                  Lihat Profil
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button className="bg-primary hover:bg-primary/90 text-white h-12 px-8 text-base font-semibold">
            Lihat Semua Pengajar
          </Button>
        </div>
      </div>
    </section>
  )
}

export default Tutors
