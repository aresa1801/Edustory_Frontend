import type { Metadata } from 'next'
import { ServicePage } from '@/components/marketing/service-page'

export const metadata: Metadata = {
  title: 'Les Online — EduStory',
  description:
    'Les privat daring EduStory dengan papan tulis digital, rekaman sesi, dan tutor terkurasi. Kualitas pendampingan sama seperti les tatap muka.',
}

export default function LesOnlinePage() {
  return (
    <ServicePage
      eyebrow="Layanan"
      title="Les online dengan kualitas tatap muka."
      intro="Sesi daring sering dianggap kelas dua. Kami menyusunnya agar setara: papan tulis digital yang bisa ditulis bersama, rekaman sesi untuk diulang, dan tutor yang sama setiap pekan."
      highlights={[
        { value: '90 menit', label: 'durasi sesi standar' },
        { value: 'rekaman', label: 'setiap sesi tersimpan' },
        { value: '1:1', label: 'satu siswa, satu tutor' },
      ]}
      sections={[
        {
          heading: 'Bagaimana sesi daring berjalan',
          body: 'Tutor membuka papan tulis digital, menjelaskan konsep, lalu mengerjakan soal bersama siswa. Siswa dapat menulis langsung di papan yang sama, sehingga tutor melihat di titik mana pemahaman mulai goyah.',
          points: ['Papan tulis kolaboratif', 'Berbagi layar materi', 'Rekaman untuk diulang', 'Catatan sesi dikirim setelah kelas'],
        },
        {
          heading: 'Yang menjaga kualitasnya tetap tinggi',
          body: 'Kami membatasi jumlah sesi daring per tutor per hari agar tidak kelelahan, dan mewajibkan kamera aktif minimal pada 10 menit pertama untuk menjaga keterlibatan siswa.',
          points: ['Kamera aktif di awal sesi', 'Batas sesi harian tutor', 'Evaluasi acak oleh tim akademik'],
        },
        {
          heading: 'Kebutuhan teknis',
          body: 'Cukup laptop atau tablet dengan koneksi stabil 5 Mbps. Tidak perlu perangkat khusus. Bila koneksi siswa terputus, sesi dilanjutkan dan sisa waktu tidak hangus.',
          points: ['Laptop/tablet + koneksi 5 Mbps', 'Headset disarankan', 'Tanpa instalasi aplikasi tambahan'],
        },
      ]}
      audience={['Keluarga di luar Yogyakarta', 'Siswa dengan jadwal padat', 'Keluarga yang memindahkan anak antar kota']}
      faq={[
        {
          q: 'Apakah rekaman sesi bisa diakses orang tua?',
          a: 'Bisa. Rekaman dan catatan sesi tersedia di dashboard dan dapat diputar ulang kapan saja.',
        },
        {
          q: 'Bagaimana bila internet siswa bermasalah?',
          a: 'Sesi dapat dilanjutkan setelah koneksi pulih, atau dijadwalkan ulang tanpa biaya tambahan bila gangguan berlangsung lebih dari 15 menit.',
        },
        {
          q: 'Apakah les online lebih murah?',
          a: 'Umumnya ya, karena tidak ada biaya perjalanan tutor. Selisihnya kami sampaikan saat konsultasi.',
        },
      ]}
    />
  )
}
