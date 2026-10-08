'use client'

import { useState } from 'react'
import Image from 'next/image'
import { BadgeCheck, Star, ArrowRight } from 'lucide-react'
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
        'Master Teacher Award 2023',
      ],
      specializations: ['Persiapan Ujian Nasional', 'Kalkulus & Analisis Lanjut', 'Bimbingan Universitas Asing'],
      methodology: [
        'Problem-based learning dengan pendekatan interaktif',
        'Analisis soal dan strategi pengerjaan efisien',
        'Personalized learning path sesuai kebutuhan siswa',
        'Regular progress tracking dan reporting',
      ],
      availableDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
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
        'International Physics Educator Award',
      ],
      specializations: ['Fisika Dasar & Lanjut', 'Persiapan OSN Fisika', 'Riset dan Eksperimen Ilmiah'],
      methodology: [
        'Hands-on experiments dan demonstrasi praktis',
        'Simulasi virtual physics untuk pemahaman mendalam',
        'Critical thinking dan problem solving approach',
        'Portfolio-based assessment dan evaluation',
      ],
      availableDays: ['Senin', 'Rabu', 'Jumat', 'Sabtu', 'Minggu'],
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
        'Conversational English Specialist',
      ],
      specializations: ['Test Preparation (TOEFL, IELTS, CAE)', 'Business English & Professional Communication', 'Pronunciation & Accent Reduction'],
      methodology: [
        'Immersive English learning environment',
        'Task-based language teaching methodology',
        'Pronunciation correction dengan feedback real-time',
        'Communicative approach untuk natural conversation',
      ],
      availableDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
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
        'Laboratory Safety & Experiment Design Certificate',
      ],
      specializations: ['Kimia Dasar & Kimia Organik', 'Biologi Molekuler & Genetika', 'Eksperimen Laboratorium Virtual & Real'],
      methodology: [
        'Pendekatan STEM dengan eksperimen hands-on',
        'Visualisasi reaksi kimia melalui animasi 3D',
        'Concept mapping untuk pemahaman struktur materi',
        'Safety-first laboratory practice approach',
      ],
      availableDays: ['Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
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
        'Cloud Architecture Associate (AWS)',
      ],
      specializations: ['Web Development (Frontend & Backend)', 'Mobile App Development', 'Database Design & Optimization'],
      methodology: [
        'Project-based learning dengan aplikasi real',
        'Agile development methodology teaching',
        'Code review dan best practices training',
        'Portfolio building untuk job readiness',
      ],
      availableDays: ['Senin', 'Rabu', 'Kamis', 'Sabtu'],
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
        'Professional Writing & Editing Certificate',
      ],
      specializations: ['Sastra Indonesia Klasik & Modern', 'Teknik Menulis Esai & Artikel', 'Keterampilan Presentasi & Public Speaking'],
      methodology: [
        'Literature-based teaching dengan analisis mendalam',
        'Interactive writing workshops dan feedback sessions',
        'Grammar mastery melalui contextual learning',
        'Creative expression dan storytelling development',
      ],
      availableDays: ['Senin', 'Selasa', 'Rabu', 'Jumat', 'Sabtu'],
    },
  ]

  return (
    <section className="section-pad">
      <div className="container-page">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="eyebrow">Pengajar</span>
          <h2 className="mt-4">Pengajar profesional kami</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Dipilih dan dilatih secara khusus untuk memberikan kualitas terbaik.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tutors.map((tutor, index) => (
            <article key={tutor.id} className="surface hover-card group flex flex-col overflow-hidden">
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <Image
                  src={tutor.image}
                  alt={tutor.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={index < 3}
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  {tutor.rating}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <span className="truncate">{tutor.name}</span>
                  <BadgeCheck className="h-4.5 w-4.5 shrink-0 text-primary" />
                </h3>
                <p className="text-sm font-medium text-primary">{tutor.qualification}</p>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{tutor.subjects}</p>

                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Pengalaman</p>
                    <p className="font-semibold">{tutor.experience}</p>
                  </div>
                  <span className="h-8 w-px bg-border" />
                  <div>
                    <p className="text-xs text-muted-foreground">Mulai dari</p>
                    <p className="font-semibold">{tutor.hourlyRate}</p>
                  </div>
                </div>

                <Button
                  onClick={() => setSelectedTutor(tutor)}
                  variant="outline"
                  className="mt-5 w-full justify-between rounded-xl hover:border-primary/50 hover:bg-primary/5"
                >
                  Lihat profil
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button size="lg" className="h-12 gap-2 px-8 text-base">
            Lihat semua pengajar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedTutor && (
        <TutorProfileModal tutor={selectedTutor} isOpen={!!selectedTutor} onClose={() => setSelectedTutor(null)} />
      )}
    </section>
  )
}

export default Tutors
