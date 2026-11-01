/**
 * Structured data (JSON-LD) untuk Edustory.
 * Dipakai di app/layout.tsx (Organization + WebSite + Service), dan
 * app/llms.txt/route.ts untuk ringkasan mesin AI (GEO/AEO).
 */

export const SITE = 'https://edustory.online'
export const BRAND = 'Edustory'

export const SERVICES = [
  {
    name: 'Les Privat ke Rumah',
    desc: 'Tutor datang ke rumah untuk siswa SD, SMP, dan SMA di Yogyakarta dan sekitarnya, dengan jadwal tetap dan laporan progres.',
    url: '/les-privat',
  },
  {
    name: 'Les Online',
    desc: 'Sesi privat daring dengan tutor terkurasi, papan tulis digital, dan rekaman ringkasan sesi. Tersedia untuk seluruh Indonesia.',
    url: '/les-online',
  },
  {
    name: 'Kelas Semi-Privat',
    desc: 'Belajar kelompok kecil 3–5 siswa dengan tutor yang sama setiap sesi, biaya lebih ringan, perhatian tetap personal.',
    url: '/kelas-semi-privat',
  },
  {
    name: 'Homeschooling',
    desc: 'Pendampingan belajar terstruktur untuk keluarga homeschooling: perencanaan kurikulum, tutor pendamping, dan evaluasi berkala.',
    url: '/homeschooling',
  },
  {
    name: 'Corporate Training',
    desc: 'Pelatihan bahasa, literasi digital, dan keterampilan kerja untuk tim perusahaan, dirancang sesuai kebutuhan organisasi.',
    url: '/corporate-training',
  },
]

export const FAQS = [
  {
    q: 'Bagaimana cara mendaftar les privat di Edustory?',
    a: 'Mulai dari konsultasi lewat WhatsApp atau halaman kontak. Kami menanyakan kebutuhan belajar, lalu menyarankan program dan jadwal asesmen awal. Setelah itu keluarga menerima profil tutor dan jadwal sesi pertama.',
  },
  {
    q: 'Apakah harus asesmen dulu sebelum mulai?',
    a: 'Ya, untuk kelas 4 SD ke atas. Asesmen singkat 30–45 menit membantu tutor memulai dari level yang tepat, bukan mengulang materi yang sudah dikuasai atau melewati prasyarat yang belum solid.',
  },
  {
    q: 'Berapa biaya les privat di Edustory?',
    a: 'Biaya bergantung pada jenjang, jumlah sesi, dan format (online atau di rumah). Rincian disampaikan terbuka saat konsultasi, tanpa biaya tersembunyi, dan tersedia paket bulanan yang lebih hemat.',
  },
  {
    q: 'Berapa lama sampai sesi pertama dimulai?',
    a: 'Rata-rata 2 hari setelah konsultasi, tergantung ketersediaan jadwal tutor dan kesiapan keluarga.',
  },
  {
    q: 'Apakah bisa les privat di rumah?',
    a: 'Bisa untuk area Yogyakarta dan sekitarnya. Untuk luar area tersebut, sesi berjalan online dengan kualitas pendampingan yang sama.',
  },
  {
    q: 'Metode pembayaran apa saja yang tersedia?',
    a: 'Transfer bank dan pembayaran online melalui Midtrans: virtual account, e-wallet, dan kartu kredit/debit.',
  },
  {
    q: 'Bisakah jadwal les diubah?',
    a: 'Bisa. Perubahan jadwal diajukan paling lambat 12 jam sebelum sesi agar tutor punya waktu menyesuaikan. Perubahan mendadak tetap diusahakan bila kondisinya darurat.',
  },
  {
    q: 'Bagaimana tutor dipilih?',
    a: 'Tutor melewati kurasi: verifikasi latar belakang akademik, micro-teaching, dan evaluasi berkala dari keluarga. Kecocokan dengan gaya belajar siswa menjadi pertimbangan utama.',
  },
]

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': `${SITE}/#organization`,
    name: BRAND,
    alternateName: ['EduStory', 'Edustory Indonesia'],
    url: SITE,
    logo: { '@type': 'ImageObject', url: `${SITE}/brand/icon-512.png` },
    image: `${SITE}/brand/og-image.png`,
    description:
      'Edustory adalah platform les privat dengan tutor terkurasi untuk SD, SMP, dan SMA — tersedia ke rumah (Yogyakarta), online seluruh Indonesia, kelas semi-privat, homeschooling, dan corporate training.',
    areaServed: [
      { '@type': 'Country', name: 'Indonesia' },
      { '@type': 'City', name: 'Yogyakarta' },
    ],
    address: { '@type': 'PostalAddress', addressCountry: 'ID', addressRegion: 'DI Yogyakarta' },
    audience: { '@type': 'EducationalAudience', educationalRole: ['student', 'parent'] },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Layanan belajar Edustory',
      itemListElement: SERVICES.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.name, description: s.desc, url: `${SITE}${s.url}` },
      })),
    },
  }
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    url: SITE,
    name: BRAND,
    inLanguage: 'id-ID',
    publisher: { '@id': `${SITE}/#organization` },
  }
}

export function faqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE}/faq#faq`,
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

export function ld(schema: unknown) {
  return { __html: JSON.stringify(schema) }
}
