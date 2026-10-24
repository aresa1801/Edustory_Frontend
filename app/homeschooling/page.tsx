import type { Metadata } from 'next'
import { ServicePage } from '@/components/marketing/service-page'

export const metadata: Metadata = {
  title: 'Homeschooling — EduStory',
  description:
    'Pendampingan homeschooling EduStory: penyusunan kurikulum, tutor multi-mapel, dan evaluasi berkala untuk keluarga yang memilih jalur belajar mandiri.',
}

export default function HomeschoolingPage() {
  return (
    <ServicePage
      eyebrow="Layanan"
      title="Homeschooling yang punya kurikulum, bukan sekadar les tambahan."
      intro="Banyak keluarga memilih homeschooling lalu berakhir mengumpulkan les dari banyak tempat tanpa arah. Kami menyusun kurikulum tahunan, menetapkan capaian per semester, lalu menugaskan tutor yang mengeksekusinya."
      highlights={[
        { value: '1 tahun', label: 'rencana kurikulum' },
        { value: 'multi-mapel', label: 'dalam satu koordinasi' },
        { value: '2×/semester', label: 'evaluasi capaian' },
      ]}
      sections={[
        {
          heading: 'Penyusunan kurikulum',
          body: 'Kami mulai dari pemetaan kemampuan siswa, lalu menyusun urutan materi per mapel yang mengacu pada kurikulum nasional namun disesuaikan dengan kecepatan anak.',
          points: ['Pemetaan awal', 'Silabus per semester', 'Target capaian terukur', 'Penyesuaian tiap triwulan'],
        },
        {
          heading: 'Eksekusi oleh tutor terkurasi',
          body: 'Satu koordinator akademik menjaga agar tutor antar-mapel tidak saling tumpang tindih, dan agar beban belajar anak tetap realistis.',
          points: ['Tutor per mapel', 'Jadwal terkoordinasi', 'Laporan mingguan terpadu'],
        },
        {
          heading: 'Evaluasi dan penyesuaian',
          body: 'Setiap semester kami meninjau capaian bersama orang tua. Bila anak melaju lebih cepat, materi diperdalam; bila tertinggal, pendekatan diubah sebelum menumpuk.',
          points: ['Rapor internal', 'Sesi evaluasi orang tua', 'Revisi rencana belajar'],
        },
      ]}
      audience={['Keluarga yang memilih jalur homeschooling', 'Siswa atlet atau seniman dengan jadwal khusus', 'Siswa yang butuh kecepatan belajar berbeda']}
      faq={[
        {
          q: 'Apakah bisa mengikuti ujian kesetaraan?',
          a: 'Bisa. Kurikulum kami disusun agar selaras dengan materi ujian kesetaraan, dan tutor membantu persiapan menjelang ujian.',
        },
        {
          q: 'Berapa mapel yang bisa diambil?',
          a: 'Fleksibel, mulai dari satu mapel pendamping hingga paket penuh sesuai kebutuhan keluarga.',
        },
        {
          q: 'Apakah belajar dilakukan di rumah?',
          a: 'Ya, sesi berlangsung di rumah atau daring sesuai kesepakatan, dengan jadwal yang disusun per triwulan.',
        },
      ]}
    />
  )
}
