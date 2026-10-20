import type { Metadata } from 'next'
import Link from 'next/link'
import { SeoShell, SectionTitle, CtaBox } from '@/components/seo/page-shell'
import { SUBJECTS, CITIES, abs } from '@/lib/seo-catalog'

export const metadata: Metadata = {
  title: 'Les Privat Semua Mapel — SD, SMP, SMA & SMK',
  description:
    'Daftar lengkap les privat per mata pelajaran dan kota bersama tutor terkurasi Edustory. Tatap muka ke rumah, online, dan semi-privat untuk semua jenjang.',
  alternates: { canonical: abs('/les-privat') },
  openGraph: {
    title: 'Les Privat Semua Mapel — Edustory',
    description: 'Pilih mata pelajaran dan kota, temukan tutor terkurasi Edustory.',
    url: abs('/les-privat'),
  },
}

export default function LesPrivatHub() {
  return (
    <SeoShell breadcrumb={[{ label: 'Les Privat' }]}>
      <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
        Les privat semua mata pelajaran, semua jenjang
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
        Edustory menghubungkan anak dengan tutor terkurasi untuk setiap mata pelajaran di jenjang SD, SMP,
        SMA, dan SMK. Pilih mapel dan kota di bawah ini untuk melihat pendekatan belajar, materi yang
        dibahas, serta pilihan format belajar yang tersedia.
      </p>

      <section className="mt-10">
        <SectionTitle kicker="Mata pelajaran">Pilih mapel</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUBJECTS.map((s) => (
            <Link
              key={s.slug}
              href={`/les-privat/${s.slug}`}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-[var(--primary)]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-heading font-bold">{s.name}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                  {s.jenjang}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{s.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle kicker="Kota layanan">Les privat di kota Anda</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {CITIES.map((c) => (
            <Link
              key={c.slug}
              href={`/les-privat/matematika/${c.slug}`}
              className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <SectionTitle>Kenapa les privat bersama Edustory?</SectionTitle>
        <ul className="grid gap-4 md:grid-cols-3">
          {[
            {
              t: 'Tutor terkurasi',
              d: 'Setiap tutor melewati seleksi akademik, psikologi, dan microteaching sebelum mengajar.',
            },
            {
              t: 'Kurikulum terstruktur',
              d: 'Rencana belajar disusun per mapel dan per jenjang, dengan target yang bisa diukur.',
            },
            {
              t: 'Laporan progres',
              d: 'Orang tua menerima catatan sesi dan perkembangan anak secara berkala.',
            },
          ].map((f) => (
            <li key={f.t}>
              <p className="font-heading font-bold">{f.t}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{f.d}</p>
            </li>
          ))}
        </ul>
      </div>

      <CtaBox
        title="Belum yakin mapel mana yang paling perlu dibantu?"
        text="Konsultasikan kondisi belajar anak dengan tim Edustory. Kami bantu memetakan prioritas, lalu mencarikan tutor yang sesuai."
      />
    </SeoShell>
  )
}
