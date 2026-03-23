'use client'

import { useState } from 'react'
import Image from 'next/image'
import { BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TutorProfileModal } from '@/components/tutor-profile-modal'

const Tutors = () => {
  const [selectedTutor, setSelectedTutor] = useState<typeof tutors[0] | null>(null)

  const tutors = [
    {
      id: 1,
      name: 'Dr. Siti Nurhayati',
      qualification: 'S2 Pendidikan Matematika',
      subjects: 'Matematika, Kalkulus, Statistika',
      experience: '12 tahun',
      rating: '4.9/5',
      image: '/tutors/siti-nurhayati.jpg',
      bio: 'Pendidik berpengalaman dengan keahlian khusus dalam mengajar matematika tingkat lanjut. Telah membantu ribuan siswa mencapai nilai sempurna di ujian nasional dan masuk universitas terkemuka.',
      location: 'Jakarta, Indonesia',
      phone: '+62 812-3456-7890',
      email: 'siti.nurhayati@edustory.com',
      studentCount: 500,
      successRate: '96%',
      hourlyRate: 'Rp 350.000',
      certifications: [
        'Sertifikat Pendidik Profesional (SERTIPEND)',
        'Cambridge IGCSE Mathematics Examiner',
        'Master Teacher Award 2023'
      ],
      specializations: [
        'Persiapan Ujian Nasional',
        'Kalkulus & Analisis Lanjut',
        'Bimbingan Universitas Asing'
      ],
      methodology: [
        'Problem-based learning dengan pendekatan interaktif',
        'Analisis soal dan strategi pengerjaan efisien',
        'Personalized learning path sesuai kebutuhan siswa',
        'Regular progress tracking dan reporting'
      ],
      availableDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    },
    {
      id: 2,
      name: 'Prof. Ahmad Hidayat',
      qualification: 'S2 Pendidikan Fisika',
      subjects: 'Fisika, IPA, Kinematika',
      experience: '15 tahun',
      rating: '4.95/5',
      image: '/tutors/ahmad-hidayat.jpg',
      bio: 'Professor terkemuka dengan publikasi internasional dalam bidang fisika pendidikan. Spesialis dalam membuat konsep fisika yang abstrak menjadi mudah dipahami dengan eksperimen interaktif.',
      location: 'Bandung, Indonesia',
      phone: '+62 812-9876-5432',
      email: 'ahmad.hidayat@edustory.com',
      studentCount: 650,
      successRate: '98%',
      hourlyRate: 'Rp 400.000',
      certifications: [
        'Professor Fisika - Universitas Terkemuka',
        'Peneliti Fisika Pendidikan Bersertifikat',
        'International Physics Educator Award'
      ],
      specializations: [
        'Fisika Dasar & Lanjut',
        'Persiapan OSN Fisika',
        'Riset dan Eksperimen Ilmiah'
      ],
      methodology: [
        'Hands-on experiments dan demonstrasi praktis',
        'Simulasi virtual physics untuk pemahaman mendalam',
        'Critical thinking dan problem solving approach',
        'Portfolio-based assessment dan evaluation'
      ],
      availableDays: ['Senin', 'Rabu', 'Jumat', 'Sabtu', 'Minggu']
    },
    {
      id: 3,
      name: 'Budi Santoso, M.Ed',
      qualification: 'S2 Bahasa Inggris',
      subjects: 'Bahasa Inggris, TOEFL, IELTS',
      experience: '10 tahun',
      rating: '4.88/5',
      image: '/tutors/budi-santoso.jpg',
      bio: 'Native-level English instructor dengan pengalaman mengajar di berbagai negara. Ahli dalam persiapan test internasional dan peningkatan fluency berbicara dengan pronunciation sempurna.',
      location: 'Surabaya, Indonesia',
      phone: '+62 813-4567-8901',
      email: 'budi.santoso@edustory.com',
      studentCount: 450,
      successRate: '94%',
      hourlyRate: 'Rp 300.000',
      certifications: [
        'Cambridge CELTA - Teaching English Certification',
        'TOEFL & IELTS Certified Examiner',
        'Conversational English Specialist'
      ],
      specializations: [
        'Test Preparation (TOEFL, IELTS, CAE)',
        'Business English & Professional Communication',
        'Pronunciation & Accent Reduction'
      ],
      methodology: [
        'Immersive English learning environment',
        'Task-based language teaching methodology',
        'Pronunciation correction dengan feedback real-time',
        'Communicative approach untuk natural conversation'
      ],
      availableDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']
    },
    {
      id: 4,
      name: 'Dewi Kusuma, S.Pd',
      qualification: 'S1 Kimia',
      subjects: 'Kimia, Biologi, IPA Terpadu',
      experience: '8 tahun',
      rating: '4.85/5',
      image: '/tutors/dewi-kusuma.jpg',
      bio: 'Guru sains berpassion dengan kemampuan menjelaskan reaksi kimia kompleks dengan cara yang menyenangkan. Banyak murid yang tadinya takut kimia menjadi mencintai pelajaran ini bersama Dewi.',
      location: 'Medan, Indonesia',
      phone: '+62 814-5678-9012',
      email: 'dewi.kusuma@edustory.com',
      studentCount: 380,
      successRate: '92%',
      hourlyRate: 'Rp 280.000',
      certifications: [
        'Certified Science Educator',
        'Kimia Lanjutan & Organik Specialist',
        'Laboratory Safety & Experiment Design Certificate'
      ],
      specializations: [
        'Kimia Dasar & Kimia Organik',
        'Biologi Molekuler & Genetika',
        'Eksperimen Laboratorium Virtual & Real'
      ],
      methodology: [
        'Pendekatan STEM dengan eksperimen hands-on',
        'Visualisasi reaksi kimia melalui animasi 3D',
        'Concept mapping untuk pemahaman struktur materi',
        'Safety-first laboratory practice approach'
      ],
      availableDays: ['Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    },
    {
      id: 5,
      name: 'Rudi Hermawan, M.Kom',
      qualification: 'S2 Ilmu Komputer',
      subjects: 'Pemrograman, IT, Web Development',
      experience: '9 tahun',
      rating: '4.92/5',
      image: '/tutors/rudi-hermawan.jpg',
      bio: 'Software engineer profesional yang mengajar dengan real-world project experience. Muridnya tidak hanya belajar teori tapi langsung membuat aplikasi yang bisa digunakan di dunia nyata.',
      location: 'Yogyakarta, Indonesia',
      phone: '+62 815-6789-0123',
      email: 'rudi.hermawan@edustory.com',
      studentCount: 520,
      successRate: '97%',
      hourlyRate: 'Rp 350.000',
      certifications: [
        'Senior Software Engineer - Microsoft Certified',
        'Full-Stack Web Development Specialist',
        'Cloud Architecture Associate (AWS)'
      ],
      specializations: [
        'Web Development (Frontend & Backend)',
        'Mobile App Development',
        'Database Design & Optimization'
      ],
      methodology: [
        'Project-based learning dengan aplikasi real',
        'Agile development methodology teaching',
        'Code review dan best practices training',
        'Portfolio building untuk job readiness'
      ],
      availableDays: ['Senin', 'Rabu', 'Kamis', 'Sabtu']
    },
    {
      id: 6,
      name: 'Rina Lestari, S.Pd',
      qualification: 'S1 Bahasa Indonesia',
      subjects: 'Bahasa Indonesia, Sastra, Essay',
      experience: '7 tahun',
      rating: '4.87/5',
      image: '/tutors/rina-lestari.jpg',
      bio: 'Guru bahasa Indonesia yang passionate tentang sastra dan kemampuan menulis. Spesialis dalam pengembangan keterampilan berbicara publik dan menulis artikel profesional yang menarik.',
      location: 'Semarang, Indonesia',
      phone: '+62 816-7890-1234',
      email: 'rina.lestari@edustory.com',
      studentCount: 420,
      successRate: '95%',
      hourlyRate: 'Rp 250.000',
      certifications: [
        'Sertifikat Guru Bahasa Indonesia Profesional',
        'Literary Analysis & Criticism Specialist',
        'Professional Writing & Editing Certificate'
      ],
      specializations: [
        'Sastra Indonesia Klasik & Modern',
        'Teknik Menulis Esai & Artikel',
        'Keterampilan Presentasi & Public Speaking'
      ],
      methodology: [
        'Literature-based teaching dengan analisis mendalam',
        'Interactive writing workshops dan feedback sessions',
        'Grammar mastery melalui contextual learning',
        'Creative expression dan storytelling development'
      ],
      availableDays: ['Senin', 'Selasa', 'Rabu', 'Jumat', 'Sabtu']
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
              className="group bg-card rounded-xl border border-border overflow-hidden transition-all duration-300"
            >
              {/* Image Area - 3:4 Ratio */}
              <div className="relative h-80 overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900">
                <Image
                  src={tutor.image}
                  alt={tutor.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={index < 3}
                />
                {/* Hover Overlay - Minimalist */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
              </div>

              {/* Content */}
              <div className="p-6 border-t border-border/50 group-hover:border-primary/30 transition-colors duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 group-hover:text-primary transition-colors duration-300">
                      {tutor.name}
                      <BadgeCheck className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
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
                    <p className="text-foreground group-hover:text-slate-100 transition-colors duration-300">
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
                      <p className="font-semibold text-primary group-hover:text-cyan-400 transition-colors duration-300">
                        {tutor.rating}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setSelectedTutor(tutor)}
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary/10 hover:border-primary transition-all duration-300 group/btn"
                >
                  <span className="group-hover/btn:text-cyan-300 transition-colors duration-300">
                    Lihat Profil
                  </span>
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

      {/* Tutor Profile Modal */}
      {selectedTutor && (
        <TutorProfileModal
          tutor={selectedTutor}
          isOpen={!!selectedTutor}
          onClose={() => setSelectedTutor(null)}
        />
      )}
    </section>
  )
}

export default Tutors
