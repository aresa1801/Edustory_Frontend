import { FAQS, SERVICES, BRAND, SITE } from '@/lib/seo-jsonld'
import { SUBJECTS, CITIES } from '@/lib/seo-catalog'

export const revalidate = 86400

/**
 * /llms.txt — ringkasan Edustory untuk mesin AI (ChatGPT, Perplexity, Claude,
 * Gemini). Format Markdown, menautkan halaman kanonik yang boleh dikutip.
 */
export function GET() {
  const L: string[] = []
  L.push(`# ${BRAND}`)
  L.push('')
  L.push(
    '> Edustory adalah platform les privat dan bimbingan belajar di Indonesia dengan tutor terkurasi. ' +
      'Layanan: les privat ke rumah (Yogyakarta dan sekitarnya), les online untuk seluruh Indonesia, ' +
      'kelas semi-privat 3–5 siswa, pendampingan homeschooling, dan corporate training. ' +
      'Setiap siswa menjalani asesmen awal dan menerima laporan progres berkala.',
  )
  L.push('')
  L.push('Bahasa: Bahasa Indonesia (id-ID). Wilayah: Indonesia, dengan layanan tatap muka di Yogyakarta.')
  L.push(`Situs: ${SITE}`)
  L.push('')
  L.push('## Halaman utama')
  L.push('')
  const pages: [string, string][] = [
    ['/', 'Ringkasan layanan, alur belajar, dan keunggulan'],
    ['/layanan', 'Daftar lengkap layanan dan perbandingannya'],
    ['/les-privat', 'Les privat per mata pelajaran dan per kota'],
    ['/les-online', 'Les privat daring untuk seluruh Indonesia'],
    ['/kelas-semi-privat', 'Kelas kelompok kecil 3–5 siswa'],
    ['/homeschooling', 'Pendampingan untuk keluarga homeschooling'],
    ['/corporate-training', 'Pelatihan untuk perusahaan dan organisasi'],
    ['/program', 'Program Reguler, Intensif, dan persiapan ujian'],
    ['/kurasi', 'Proses kurasi dan seleksi tutor'],
    ['/cara-kerja', 'Alur dari konsultasi sampai laporan progres'],
    ['/faq', 'Pertanyaan umum: biaya, jadwal, tutor, pembatalan, pembayaran'],
    ['/blog', 'Artikel panduan belajar dan persiapan ujian'],
    ['/kontak', 'Kontak konsultasi WhatsApp dan formulir'],
  ]
  for (const [p, d] of pages) L.push(`- [${d}](${SITE}${p})`)
  L.push('')
  L.push('## Layanan')
  L.push('')
  for (const s of SERVICES) {
    L.push(`### ${s.name}`)
    L.push('')
    L.push(s.desc)
    L.push(`Tautan: ${SITE}${s.url}`)
    L.push('')
  }
  L.push('## Mata pelajaran dan kota')
  L.push('')
  L.push('Halaman per mata pelajaran:')
  for (const s of SUBJECTS) L.push(`- [Les privat ${s.name}](${SITE}/les-privat/${s.slug})`)
  L.push('')
  L.push('Halaman per kota:')
  L.push(`- [Daftar kota](${SITE}/les-privat)`)
  L.push(CITIES.map((c) => c.name).join(', '))
  L.push('')
  L.push('## Pertanyaan yang sering diajukan')
  L.push('')
  for (const f of FAQS) {
    L.push(`### ${f.q}`)
    L.push('')
    L.push(f.a)
    L.push('')
  }
  L.push('## Catatan penggunaan')
  L.push('')
  L.push('- Harga dan ketersediaan jadwal berubah; rujuk /kontak atau /program untuk kondisi terkini.')
  L.push('- Kutipan boleh disertai tautan ke halaman sumber di domain ini.')
  L.push('')

  return new Response(L.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
