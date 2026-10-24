import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Layanan — EduStory',
  description:
    'Lima layanan EduStory: les privat, les online, homeschooling, corporate training, dan kelas semi-privat.',
}

const services = [
  {
    href: '/les-privat',
    title: 'Les Privat',
    tagline: 'Satu siswa, satu tutor, satu tujuan',
    body: 'Pendampingan personal untuk satu atau beberapa mata pelajaran, dengan target yang disusun bersama tutor dan dilaporkan berkala.',
    points: ['Jadwal fleksibel', 'Tutor terkurasi', 'Laporan progres'],
  },
  {
    href: '/les-online',
    title: 'Les Online',
    tagline: 'Kualitas yang sama, tanpa batas lokasi',
    body: 'Sesi daring interaktif dengan papan tulis digital dan rekaman sesi, cocok untuk keluarga di luar Yogyakarta.',
    points: ['Papan tulis digital', 'Rekaman sesi', 'Tanpa biaya perjalanan'],
  },
  {
    href: '/homeschooling',
    title: 'Homeschooling',
    tagline: 'Kurikulum yang disusun ulang',
    body: 'Pendampingan penuh untuk keluarga yang memilih jalur homeschooling, dari perencanaan kurikulum sampai evaluasi berkala.',
    points: ['Kurikulum adaptif', 'Multi-mapel', 'Evaluasi terjadwal'],
  },
  {
    href: '/corporate-training',
    title: 'Corporate Training',
    tagline: 'Pelatihan untuk tim dan institusi',
    body: 'Program pelatihan keterampilan akademik dan profesional untuk perusahaan, sekolah, dan komunitas.',
    points: ['Materi disesuaikan', 'Kelas grup', 'Laporan hasil pelatihan'],
  },
  {
    href: '/kelas-semi-privat',
    title: 'Kelas Semi-Privat',
    tagline: 'Belajar bersama, tetap terpantau',
    body: 'Kelompok kecil 3–5 siswa dengan level setara. Biaya lebih ringan, perhatian tutor tetap terjaga.',
    points: ['Maksimal 5 siswa', 'Level disamakan', 'Biaya lebih efisien'],
  },
]

export default function LayananPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="border-b border-border/60 bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Layanan</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight tracking-tight md:text-5xl">
              Lima cara belajar, satu standar pengajaran.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Format boleh berbeda, tetapi kurasi tutor, target belajar, dan pelaporan progres selalu sama. Pilih
              format yang paling sesuai dengan kondisi keluarga.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <Link
                key={service.href}
                href={service.href}
                className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40"
              >
                <h2 className="font-display text-2xl tracking-tight group-hover:text-primary">{service.title}</h2>
                <p className="mt-1 text-[12.5px] font-medium text-primary">{service.tagline}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{service.body}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {service.points.map((point) => (
                    <li
                      key={point}
                      className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
                <span className="mt-5 inline-block text-[12.5px] font-semibold text-primary">
                  Selengkapnya →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
            <h2 className="font-display text-3xl tracking-tight">Belum yakin harus pilih yang mana?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ceritakan kondisi belajar siswa, kami bantu memilih format yang paling masuk akal.
            </p>
            <Link
              href="/kontak"
              className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Konsultasi gratis
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
