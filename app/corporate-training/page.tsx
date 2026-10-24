import type { Metadata } from 'next'
import { ServicePage } from '@/components/marketing/service-page'

export const metadata: Metadata = {
  title: 'Corporate Training — EduStory',
  description:
    'Pelatihan untuk perusahaan, sekolah, dan komunitas: keterampilan akademik, komunikasi, dan pendampingan belajar. Materi disesuaikan dengan kebutuhan peserta.',
}

export default function CorporateTrainingPage() {
  return (
    <ServicePage
      eyebrow="Layanan"
      title="Pelatihan yang dirancang untuk peserta nyata."
      intro="Program korporat gagal ketika materinya generik. Kami mulai dari asesmen kebutuhan, menyusun modul, lalu mengukur hasil — bukan sekadar menyelesaikan jam pelatihan."
      highlights={[
        { value: '3–5 hari', label: 'durasi modul tipikal' },
        { value: 'maks. 20', label: 'peserta per kelas' },
        { value: 'terukur', label: 'evaluasi sebelum–sesudah' },
      ]}
      sections={[
        {
          heading: 'Alur kerja sama',
          body: 'Kami memulai dengan diskusi kebutuhan dan asesmen singkat peserta, kemudian menyusun modul, menjalankan pelatihan, dan menyerahkan laporan hasil.',
          points: ['Asesmen kebutuhan', 'Modul disesuaikan', 'Pelaksanaan terjadwal', 'Laporan hasil pelatihan'],
        },
        {
          heading: 'Topik yang tersedia',
          body: 'Fokus kami pada keterampilan yang berdampak langsung: cara mengajar, komunikasi dengan orang tua, literasi numerasi, dan pendampingan belajar anak.',
          points: ['Metodologi pengajaran', 'Komunikasi & konseling dasar', 'Literasi numerasi', 'Pendampingan belajar anak'],
        },
        {
          heading: 'Pengukuran hasil',
          body: 'Setiap program diukur dengan pre-test dan post-test, ditambah umpan balik peserta. Hasilnya diserahkan sebagai laporan yang bisa dipakai untuk evaluasi internal.',
          points: ['Pre-test & post-test', 'Umpan balik peserta', 'Rekomendasi lanjutan'],
        },
      ]}
      audience={['Perusahaan dengan program pengembangan karyawan', 'Sekolah yang melatih guru', 'Komunitas dan yayasan pendidikan']}
      faq={[
        {
          q: 'Apakah pelatihan bisa dilakukan daring?',
          a: 'Bisa. Format daring kami batasi maksimal 20 peserta agar interaksi tetap terjaga.',
        },
        {
          q: 'Apakah materi bisa disesuaikan?',
          a: 'Ya, modul disusun ulang berdasarkan asesmen kebutuhan dan konteks peserta.',
        },
        {
          q: 'Bagaimana penawaran harganya?',
          a: 'Kami memberikan penawaran setelah memahami cakupan materi, jumlah peserta, dan durasi pelatihan.',
        },
      ]}
    />
  )
}
