import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Kurasi Tutor — EduStory',
  description:
    'Lima tahap seleksi pengajar EduStory: akademik, psikologi, microteaching, tulisan tangan, dan wawancara. Standar yang harus dilewati sebelum seorang tutor mengajar.',
}

const stages = [
  {
    step: '01',
    title: 'Seleksi akademik',
    body: 'Kandidat mengerjakan uji kompetensi sesuai mata pelajaran dan jenjang yang akan diajar. Nilai minimum ditetapkan per mapel, bukan satu ambang global, karena tingkat kesulitan tiap bidang berbeda.',
    detail: ['Uji tulis 60 menit', 'Studi kasus soal HOTS', 'Batas lulus 80/100'],
  },
  {
    step: '02',
    title: 'Asesmen psikologi',
    body: 'Kami memetakan gaya komunikasi, ketahanan menghadapi siswa yang sulit fokus, dan cara kandidat mengelola tekanan. Tutor yang cakap secara akademik tetapi tidak sabar tidak akan lolos tahap ini.',
    detail: ['Profil komunikasi', 'Toleransi frustrasi', 'Orientasi pada proses'],
  },
  {
    step: '03',
    title: 'Microteaching',
    body: 'Kandidat mengajar 15 menit dengan topik acak di depan assessor yang berperan sebagai siswa. Yang dinilai bukan hanya penguasaan materi, tapi kemampuan menyederhanakan konsep sulit.',
    detail: ['Sesi 15 menit', 'Topik acak', 'Rekaman untuk review'],
  },
  {
    step: '04',
    title: 'Uji tulisan tangan',
    body: 'Catatan sesi dibaca ulang oleh siswa dan orang tua. Tulisan yang tidak terbaca membuat laporan belajar kehilangan fungsinya, jadi keterbacaan kami nilai secara eksplisit.',
    detail: ['Contoh catatan sesi', 'Struktur ringkasan', 'Keterbacaan'],
  },
  {
    step: '05',
    title: 'Wawancara akhir',
    body: 'Wawancara membahas komitmen waktu, etika mengajar, dan cara menangani situasi sulit seperti siswa yang kehilangan motivasi atau orang tua yang menuntut target tinggi.',
    detail: ['Komitmen jadwal', 'Etika & kerahasiaan', 'Studi kasus orang tua'],
  },
]

export default function KurasiPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="border-b border-border/60 bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Kurasi</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight tracking-tight md:text-5xl">
              Tutor terkurasi, bukan sekadar terdaftar.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Marketplace pendidikan biasanya berhenti di verifikasi dokumen. EduStory menempatkan setiap kandidat
              melalui lima tahap seleksi yang menguji kompetensi akademik, cara mengajar, dan cara berkomunikasi
              dengan siswa maupun orang tua.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { value: '5', label: 'tahap seleksi wajib' },
                { value: '15 menit', label: 'microteaching dinilai langsung' },
                { value: 'berkala', label: 'evaluasi setelah tutor aktif' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-background p-4">
                  <p className="font-display text-2xl">{item.value}</p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
          <div className="grid gap-4">
            {stages.map((stage) => (
              <article key={stage.step} className="rounded-2xl border border-border bg-card p-6 md:p-7">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-xs font-bold text-primary">{stage.step}</span>
                  <h2 className="font-display text-xl tracking-tight">{stage.title}</h2>
                </div>
                <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-muted-foreground">{stage.body}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {stage.detail.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
            <h2 className="font-display text-2xl tracking-tight">Setelah tutor bergabung</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Evaluasi sesi pertama',
                  body: 'Siswa dan orang tua memberi penilaian setelah sesi perdana. Bila tidak cocok, kami carikan tutor pengganti tanpa biaya tambahan.',
                },
                {
                  title: 'Pemantauan berkelanjutan',
                  body: 'Skor kepuasan, kehadiran, dan ketepatan laporan dipantau. Tutor dengan performa di bawah standar masuk pembinaan.',
                },
                {
                  title: 'Pembinaan & pelatihan',
                  body: 'Tutor mengikuti sesi peningkatan metodologi secara berkala, termasuk cara menyusun target belajar per pekan.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-border bg-background p-5">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
          <h2 className="font-display text-3xl tracking-tight">Ingin melihat tutor yang tersedia?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sampaikan kebutuhan belajar, kami tampilkan profil tutor yang relevan beserta rekam jejaknya.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/kontak"
              className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Konsultasi gratis
            </Link>
            <Link
              href="/program"
              className="inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-semibold transition hover:border-primary/40"
            >
              Lihat program
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
