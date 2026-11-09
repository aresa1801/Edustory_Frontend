/**
 * Sumber data tunggal untuk blok jawaban (AEO/GEO) di homepage.
 * Dipakai oleh komponen AnswerHub dan JSON-LD di app/page.tsx.
 *
 * Semua jawaban dijaga 40–60 kata dan hanya memuat fakta yang sudah ada
 * di situs: kurasi lima tahap, asesmen awal, laporan pekanan, wilayah
 * layanan, serta kanal pembayaran yang benar-benar dipakai.
 */

export const HOME_UPDATED = '2026-11-09'

export type QA = { q: string; a: string }

export const FAQ: QA[] = [
  {
    q: 'Apa itu Edustory dan layanan apa yang tersedia?',
    a: 'Edustory adalah platform les privat dan bimbingan belajar untuk siswa SD, SMP, dan SMA. Layanan yang tersedia meliputi les privat ke rumah di Yogyakarta, les online untuk seluruh Indonesia, kelas semi-privat tiga sampai lima siswa, pendampingan homeschooling, serta corporate training untuk perusahaan yang membutuhkan pelatihan terstruktur.',
  },
  {
    q: 'Bagaimana cara memilih tutor yang tepat untuk anak saya?',
    a: 'Setiap tutor melewati kurasi lima tahap: seleksi akademik, psikologi, microteaching, tulisan tangan, dan wawancara. Setelah konsultasi, kami mencocokkan tutor dengan jenjang, mata pelajaran, gaya belajar siswa, dan jadwal keluarga. Kecocokan menjadi pertimbangan utama, bukan sekadar ketersediaan slot kosong pada jadwal tutor.',
  },
  {
    q: 'Apakah les bisa dilakukan secara online?',
    a: 'Bisa. Sesi online tersedia untuk siswa di seluruh Indonesia dengan tutor terkurasi, papan tulis digital, dan ringkasan sesi. Kualitas pendampingan dibuat setara dengan les tatap muka: tutor tetap menyusun rencana belajar per pekan dan mengirim laporan progres, sehingga orang tua dapat memantau perkembangan tanpa harus berada di ruangan yang sama.',
  },
  {
    q: 'Berapa lama prosesnya sampai sesi pertama dimulai?',
    a: 'Rata-rata dua hari setelah konsultasi, bergantung pada ketersediaan jadwal tutor dan kesiapan keluarga. Untuk kelas empat SD ke atas, kami menyarankan asesmen singkat selama tiga puluh sampai empat puluh lima menit agar tutor memulai dari level yang tepat, bukan mengulang materi yang sudah dikuasai atau melewati prasyarat yang belum solid.',
  },
  {
    q: 'Bagaimana progres belajar siswa dilaporkan?',
    a: 'Progres dilaporkan setiap pekan melalui laporan hasil belajar, catatan sesi, dan analitik nilai yang tersimpan di dasbor. Orang tua dapat melihat materi yang sudah dibahas, fokus berikutnya, serta capaian siswa. Laporan ini menjadi dasar evaluasi bersama tutor, sehingga rencana pekan berikutnya disusun dari data, bukan perkiraan.',
  },
  {
    q: 'Metode pembayaran apa saja yang diterima Edustory?',
    a: 'Pembayaran dapat dilakukan melalui transfer bank dan pembayaran online lewat Midtrans, termasuk virtual account, e-wallet, serta kartu kredit atau debit. Rincian biaya bergantung pada jenjang, jumlah sesi, dan format belajar, lalu disampaikan terbuka saat konsultasi. Tidak ada biaya tersembunyi, dan tersedia paket bulanan yang lebih hemat.',
  },
]

export const STEPS: string[] = [
  'Konsultasi: ceritakan target belajar, kendala siswa, dan jadwal keluarga yang diinginkan.',
  'Rencana belajar: kami susun target per pekan dan memilih tutor yang paling cocok dengan kebutuhan.',
  'Sesi pertama: siswa mulai belajar dengan ruang diskusi, catatan sesi, dan pendampingan tutor.',
  'Evaluasi: progres diukur lewat laporan pekanan, lalu rencana berikutnya disesuaikan.',
]

export const DELIVERABLES: string[] = [
  'Rencana belajar per pekan yang disusun bersama tutor, bukan sekadar daftar materi.',
  'Laporan hasil belajar dan catatan sesi yang dikirim rutin kepada orang tua.',
  'Analitik nilai untuk melihat capaian dan fokus perbaikan berikutnya.',
  'Asesmen awal bagi kelas 4 SD ke atas agar titik mulai belajar tepat.',
]

export const AUDIENCE: string[] = [
  'Siswa SD, SMP, dan SMA yang butuh pendampingan personal maupun persiapan ujian.',
  'Orang tua yang ingin memantau progres anak lewat laporan dan catatan sesi.',
  'Keluarga homeschooling yang membutuhkan tutor pendamping dan evaluasi berkala.',
]

/** Pasangan Q/A siap pakai untuk komponen maupun JSON-LD. */
export function faqPairs(): QA[] {
  return FAQ.map((item) => ({ q: item.q, a: item.a }))
}

/** Langkah HowTo: nama singkat + deskripsi. */
export function stepPairs(): { name: string; text: string }[] {
  return STEPS.map((step) => {
    const [name, ...rest] = step.split(':')
    return { name: name.trim(), text: rest.join(':').trim() }
  })
}
