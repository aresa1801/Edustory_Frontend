import Link from 'next/link'
import type { Metadata } from 'next'
import { Check, Minus } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Program Belajar — EduStory',
  description:
    'Tiga program EduStory: Reguler, Intensif, dan Privat. Bandingkan intensitas sesi, format, laporan progres, dan cocok untuk siapa.',
}

const programs = [
  {
    name: 'Reguler',
    tagline: 'Ritme stabil untuk kenaikan level',
    featured: true,
    description:
      'Dirancang untuk siswa SD–SMA yang butuh ritme belajar konsisten. Fokus pada penguatan konsep dasar dan kebiasaan belajar yang bertahan lama.',
    sessions: '2 sesi per pekan',
    duration: '90 menit per sesi',
    format: 'Online atau di rumah siswa',
    bestFor: 'Siswa yang nilainya fluktuatif dan butuh pendampingan rutin',
    includes: ['Laporan progres mingguan', 'Target per pekan bersama tutor', 'Akses catatan sesi digital'],
  },
  {
    name: 'Intensif',
    tagline: 'Persiapan ujian dengan target terukur',
    featured: false,
    description:
      'Untuk menghadapi ujian sekolah, UTBK, atau olimpiade dalam waktu terbatas. Materi dipadatkan, latihan soal diutamakan, evaluasi dilakukan tiap pekan.',
    sessions: '3–4 sesi per pekan',
    duration: '90–120 menit per sesi',
    format: 'Online atau di rumah siswa',
    bestFor: 'Siswa kelas akhir dengan tenggat ujian yang jelas',
    includes: ['Bank soal terarah', 'Simulasi ujian berkala', 'Analisis kelemahan per topik'],
  },
  {
    name: 'Privat',
    tagline: 'Jadwal menyesuaikan keluarga',
    featured: false,
    description:
      'Satu siswa, satu tutor, satu tujuan. Cocok untuk kebutuhan khusus seperti pendampingan satu mata pelajaran atau persiapan seleksi tertentu.',
    sessions: 'Fleksibel, min. 1 sesi per pekan',
    duration: '60–120 menit per sesi',
    format: 'Online, di rumah, atau kombinasi',
    bestFor: 'Keluarga dengan jadwal padat atau kebutuhan materi spesifik',
    includes: ['Tutor pilihan sendiri', 'Jadwal yang bisa digeser', 'Komunikasi langsung dengan tutor'],
  },
]

const comparison = [
  { label: 'Intensitas', reguler: '2×/pekan', intensif: '3–4×/pekan', privat: 'Fleksibel' },
  { label: 'Durasi sesi', reguler: '90 menit', intensif: '90–120 menit', privat: '60–120 menit' },
  { label: 'Format', reguler: 'Online / rumah', intensif: 'Online / rumah', privat: 'Online / rumah / campuran' },
  { label: 'Laporan progres', reguler: 'Mingguan', intensif: 'Mingguan + analisis topik', privat: 'Sesuai permintaan' },
  { label: 'Tutor pilih sendiri', reguler: 'Tidak', intensif: 'Tidak', privat: 'Ya' },
  { label: 'Simulasi ujian', reguler: 'Tidak', intensif: 'Ya', privat: 'Opsional' },
]

export default function ProgramPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="border-b border-border/60 bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Program</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight tracking-tight md:text-5xl">
              Pilih cara belajar yang paling pas.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Tidak semua siswa butuh intensitas yang sama. Tiga program di bawah ini dibedakan oleh ritme, format,
              dan tujuan akhir — bukan sekadar harga.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
          <div className="grid gap-4 md:grid-cols-3">
            {programs.map((program) => (
              <article
                key={program.name}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  program.featured ? 'border-primary/40 bg-card shadow-sm' : 'border-border bg-card'
                }`}
              >
                {program.featured ? (
                  <span className="absolute right-5 top-5 rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
                    Paling populer
                  </span>
                ) : null}
                <h2 className="font-display text-2xl tracking-tight">{program.name}</h2>
                <p className="mt-1 text-[12.5px] font-medium text-primary">{program.tagline}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{program.description}</p>

                <dl className="mt-5 space-y-1.5 text-[12.5px]">
                  {[
                    ['Sesi', program.sessions],
                    ['Durasi', program.duration],
                    ['Format', program.format],
                    ['Cocok untuk', program.bestFor],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 border-b border-border/60 pb-1.5">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-right font-medium text-foreground/90">{value}</dd>
                    </div>
                  ))}
                </dl>

                <ul className="mt-5 space-y-2">
                  {program.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[12.5px] text-foreground/80">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/kontak"
                  className={`mt-6 inline-flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition ${
                    program.featured
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'border border-border bg-background hover:border-primary/40'
                  }`}
                >
                  Konsultasikan program ini
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/40">
          <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
            <h2 className="font-display text-2xl tracking-tight">Perbandingan singkat</h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-background">
              <table className="w-full min-w-[640px] text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-border bg-card/60 text-[11px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Aspek</th>
                    <th className="px-4 py-3 font-semibold">Reguler</th>
                    <th className="px-4 py-3 font-semibold">Intensif</th>
                    <th className="px-4 py-3 font-semibold">Privat</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.label} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium">{row.label}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.reguler}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.intensif}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.privat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 flex items-start gap-2 text-[12px] text-muted-foreground">
              <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Intensitas dan format dapat disesuaikan setelah asesmen awal. Biaya ditentukan dari jumlah sesi dan
              jenjang, dibicarakan terbuka saat konsultasi.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: 'SD & SMP', body: 'Fokus penguatan dasar, kebiasaan belajar, dan persiapan ujian sekolah.' },
              { title: 'SMA', body: 'Pendalaman materi, persiapan UTBK, dan latihan soal tingkat lanjut.' },
              { title: 'Kelas akhir', body: 'Program intensif dengan simulasi ujian dan analisis kelemahan per topik.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/cara-kerja"
              className="inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-semibold transition hover:border-primary/40"
            >
              Lihat cara kerja
            </Link>
            <Link
              href="/faq"
              className="inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-semibold transition hover:border-primary/40"
            >
              Baca pertanyaan umum
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
