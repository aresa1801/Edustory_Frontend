import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Cara Kerja — EduStory',
  description:
    'Alur EduStory dari konsultasi sampai sesi pertama: konsultasi kebutuhan, asesmen awal, pencocokan tutor, sesi belajar, dan laporan progres.',
}

const steps = [
  {
    step: '01',
    title: 'Konsultasi kebutuhan',
    time: '15–20 menit',
    body: 'Kami mulai dari mendengar: mata pelajaran yang bermasalah, target nilai, jadwal keluarga, dan pengalaman belajar sebelumnya. Tidak ada penawaran paket sebelum kebutuhan jelas.',
    output: 'Ringkasan kebutuhan dan rekomendasi program',
  },
  {
    step: '02',
    title: 'Asesmen awal',
    time: '30–45 menit',
    body: 'Siswa mengerjakan asesmen singkat untuk memetakan level pemahaman. Hasilnya dipakai untuk menentukan titik mulai, bukan untuk memberi label pada siswa.',
    output: 'Peta kekuatan dan celah materi',
  },
  {
    step: '03',
    title: 'Pencocokan tutor',
    time: '1–2 hari',
    body: 'Kami memilih tutor berdasarkan mapel, jenjang, gaya komunikasi, dan ketersediaan jadwal. Bila ada lebih dari satu kandidat, keluarga dapat memilih.',
    output: 'Profil tutor dan jadwal sesi pertama',
  },
  {
    step: '04',
    title: 'Sesi belajar',
    time: '60–120 menit per sesi',
    body: 'Setiap sesi punya target yang disepakati sebelumnya. Tutor mencatat apa yang dibahas, kesulitan yang muncul, dan pekerjaan rumah berikutnya.',
    output: 'Catatan sesi digital',
  },
  {
    step: '05',
    title: 'Laporan & evaluasi',
    time: 'setiap pekan',
    body: 'Progres dilaporkan berkala: materi yang sudah dikuasai, yang masih perlu latihan, dan rencana pekan berikutnya. Orang tua bisa meminta sesi evaluasi kapan saja.',
    output: 'Laporan progres dan rencana lanjutan',
  },
]

export default function CaraKerjaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="border-b border-border/60 bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Cara kerja</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight tracking-tight md:text-5xl">
              Dari konsultasi ke sesi pertama, tanpa proses berbelit.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Rata-rata keluarga memulai sesi pertama dalam dua hari setelah konsultasi. Setiap tahap punya keluaran
              yang jelas, jadi tidak ada langkah yang berjalan tanpa hasil.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8 md:py-20">
          <ol className="relative space-y-4 border-l border-border pl-6">
            {steps.map((item) => (
              <li key={item.step} className="relative">
                <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 bg-background font-mono text-[9px] font-bold text-primary">
                  {item.step}
                </span>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-display text-xl tracking-tight">{item.title}</h2>
                    <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{item.body}</p>
                  <p className="mt-3 text-[12px] font-medium text-primary">Hasil: {item.output}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-border/60 bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
            <h2 className="font-display text-2xl tracking-tight">Yang selalu keluarga dapatkan</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: 'Tutor tetap', body: 'Satu tutor untuk satu tujuan belajar, kecuali keluarga meminta ganti.' },
                { title: 'Catatan sesi', body: 'Ringkasan materi dan pekerjaan rumah tersimpan dan bisa dibuka kapan saja.' },
                { title: 'Laporan berkala', body: 'Progres dilaporkan terjadwal, bukan hanya saat ditanya.' },
                { title: 'Ganti tutor gratis', body: 'Bila sesi perdana tidak cocok, kami carikan pengganti tanpa biaya.' },
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
          <h2 className="font-display text-3xl tracking-tight">Mulai dari satu percakapan.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ceritakan kondisi belajar siswa, kami susun rencana awalnya tanpa biaya.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/kontak"
              className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Hubungi kami
            </Link>
            <Link
              href="/kurasi"
              className="inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-semibold transition hover:border-primary/40"
            >
              Lihat standar tutor
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
