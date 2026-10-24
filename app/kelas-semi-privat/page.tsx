import type { Metadata } from 'next'
import { ServicePage } from '@/components/marketing/service-page'

export const metadata: Metadata = {
  title: 'Kelas Semi-Privat — EduStory',
  description:
    'Kelas semi-privat EduStory: kelompok kecil 3–5 siswa dengan level setara, tutor terkurasi, dan biaya lebih efisien.',
}

export default function KelasSemiPrivatPage() {
  return (
    <ServicePage
      eyebrow="Layanan"
      title="Belajar bersama, tetap terpantau."
      intro="Kelas semi-privat adalah jalan tengah: biaya lebih ringan daripada privat, tetapi interaksi masih cukup dekat untuk memastikan setiap siswa benar-benar memahami materi."
      highlights={[
        { value: '3–5', label: 'siswa per kelas' },
        { value: 'setara', label: 'level peserta disamakan' },
        { value: '1 tutor', label: 'mendampingi sepanjang program' },
      ]}
      sections={[
        {
          heading: 'Bagaimana kelompoknya disusun',
          body: 'Kami menempatkan siswa berdasarkan hasil asesmen, bukan berdasarkan usia atau sekolah. Kelompok dengan level mirip membuat tutor bisa berhenti lebih lama pada bagian yang memang sulit bagi semua peserta.',
          points: ['Penempatan berdasarkan asesmen', 'Maksimal 5 siswa', 'Evaluasi ulang tiap triwulan'],
        },
        {
          heading: 'Apa yang membuatnya tetap personal',
          body: 'Setiap siswa punya catatan kemajuan sendiri. Tutor tetap menandai kesulitan individu dan mengirimkan catatan terpisah untuk orang tua.',
          points: ['Catatan progres per siswa', 'Pekerjaan rumah terdiferensiasi', 'Laporan terpisah untuk orang tua'],
        },
        {
          heading: 'Cocok untuk persiapan bersama',
          body: 'Format ini sering dipakai untuk persiapan ujian kelas akhir, di mana siswa butuh latihan soal intensif namun tetap mendapatkan koreksi langsung.',
          points: ['Latihan soal terarah', 'Pembahasan bersama', 'Simulasi ujian berkala'],
        },
      ]}
      audience={['Siswa dengan level setara', 'Keluarga yang ingin biaya lebih efisien', 'Persiapan ujian kelas akhir']}
      faq={[
        {
          q: 'Bisakah saya membentuk kelompok sendiri?',
          a: 'Bisa. Keluarga dapat mengajukan 3–5 siswa dengan level setara, lalu kami jadwalkan asesmen penempatan.',
        },
        {
          q: 'Bagaimana bila level anak berbeda dari kelompok?',
          a: 'Kami akan menyarankan pindah kelompok atau kembali ke format privat bila selisih levelnya terlalu jauh.',
        },
        {
          q: 'Apakah bisa daring?',
          a: 'Bisa, dengan papan tulis digital yang sama seperti layanan les online.',
        },
      ]}
    />
  )
}
