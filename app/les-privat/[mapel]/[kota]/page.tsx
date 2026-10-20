import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SeoShell, SectionTitle, CtaBox } from '@/components/seo/page-shell'
import { SUBJECTS, CITIES, getCity, getSubject, comboSlugs, abs } from '@/lib/seo-catalog'

type Params = { mapel: string; kota: string }

export function generateStaticParams(): Params[] {
  return comboSlugs()
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const s = getSubject(params.mapel)
  const c = getCity(params.kota)
  if (!s || !c) return {}
  const title = `Les Privat ${s.name} ${c.name} — Tutor Datang ke Rumah`
  const description = `Les privat ${s.name} di ${c.name} bersama tutor terkurasi Edustory. ${s.tagline}. Melayani ${c.areas.slice(0, 3).join(', ')}, dan sekitarnya.`
  return {
    title,
    description,
    alternates: { canonical: abs(`/les-privat/${s.slug}/${c.slug}`) },
    openGraph: { title, description, url: abs(`/les-privat/${s.slug}/${c.slug}`) },
  }
}

export default function ComboPage({ params }: { params: Params }) {
  const s = getSubject(params.mapel)
  const c = getCity(params.kota)
  if (!s || !c) notFound()

  const otherCities = CITIES.filter((x) => x.slug !== c.slug).slice(0, 12)
  const otherSubjects = SUBJECTS.filter((x) => x.slug !== s.slug).slice(0, 12)

  const faq = [
    {
      q: `Apakah tutor ${s.name} bisa datang ke rumah di ${c.name}?`,
      a: `Ya. Edustory melayani les privat tatap muka di ${c.name} — termasuk ${c.areas.slice(0, 3).join(', ')} — serta les online untuk area yang lebih jauh. Jadwal dan lokasi disepakati bersama tutor setelah matching.`,
    },
    {
      q: `Berapa lama satu sesi les ${s.name}?`,
      a: 'Sesi standar 90 menit dengan jeda singkat. Untuk anak SD kelas awal, sesi bisa dipecah menjadi dua bagian 45 menit agar fokus tetap terjaga.',
    },
    {
      q: `Apakah bisa memilih tutor pria atau wanita?`,
      a: `Bisa. Setiap mapel memiliki tutor pria dan wanita, dan preferensi ini bisa disampaikan saat pendaftaran maupun saat mengganti tutor di ${c.name}.`,
    },
    {
      q: `Bagaimana progres belajar ${s.name} dilaporkan?`,
      a: 'Setiap sesi dicatat: materi yang dibahas, latihan yang dikerjakan, dan catatan tutor. Orang tua dapat melihat ringkasan progres dan rekomendasi sesi berikutnya.',
    },
  ]

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: `Les Privat ${s.name} ${c.name}`,
      serviceType: `Les privat ${s.name}`,
      description: `Les privat ${s.name} di ${c.name} untuk jenjang ${s.jenjang} bersama tutor terkurasi Edustory.`,
      provider: { '@type': 'Organization', name: 'Edustory', url: abs('/') },
      areaServed: { '@type': 'City', name: c.name, containedInPlace: { '@type': 'AdministrativeArea', name: c.region } },
      availableChannel: {
        '@type': 'ServiceChannel',
        serviceUrl: abs(`/les-privat/${s.slug}/${c.slug}`),
        servicePhone: '+6282113113063',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Beranda', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: 'Les Privat', item: abs('/les-privat') },
        { '@type': 'ListItem', position: 3, name: s.name, item: abs(`/les-privat/${s.slug}`) },
        { '@type': 'ListItem', position: 4, name: c.name, item: abs(`/les-privat/${s.slug}/${c.slug}`) },
      ],
    },
  ]

  return (
    <SeoShell
      breadcrumb={[
        { label: 'Les Privat', href: '/les-privat' },
        { label: s.name, href: `/les-privat/${s.slug}` },
        { label: c.name },
      ]}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
        Les Privat {s.name} {c.name}
      </h1>
      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
        {s.jenjang} · {c.region}
      </p>

      <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
        {c.name} punya ritme belajar yang khas. {c.blurb}. Karena itu les privat {s.name} di {c.name} tidak
        bisa disamakan dengan kota lain: tutor Edustory menyesuaikan jadwal dengan jam sekolah setempat,
        mempertimbangkan waktu tempuh, dan menyusun target belajar yang realistis untuk anak Anda.
      </p>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--muted-foreground)]">
        {s.intro}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Area layanan</p>
          <p className="mt-1 text-sm font-semibold">{c.areas.join(' · ')}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Format belajar</p>
          <p className="mt-1 text-sm font-semibold">Tatap muka · Online · Semi-privat</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Persiapan</p>
          <p className="mt-1 text-sm font-semibold">{s.exam ?? 'Rapor & pemahaman konsep'}</p>
        </div>
      </div>

      <section className="mt-10">
        <SectionTitle kicker="Materi">Kurikulum les {s.name} untuk {c.name}</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {s.topics.map((t) => (
            <div
              key={t}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm"
            >
              {t}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle kicker="Pendekatan">Bagaimana les berjalan di {c.name}</SectionTitle>
        <ol className="space-y-4">
          {[
            {
              t: 'Diagnostik awal',
              d: `Sesi pertama memetakan kemampuan ${s.name} anak: bagian mana yang sudah kuat, bagian mana yang perlu dibangun ulang.`,
            },
            {
              t: 'Rencana belajar',
              d: `Tutor menyusun target per pertemuan, disesuaikan dengan jadwal sekolah dan kegiatan anak di ${c.name}.`,
            },
            {
              t: 'Sesi rutin',
              d: `Belajar dengan pola konsep → contoh → latihan mandiri → pembahasan. Tutor datang ke rumah atau mengajar online sesuai kesepakatan.`,
            },
            {
              t: 'Evaluasi berkala',
              d: `Setiap 4–6 sesi, ada evaluasi untuk melihat progres nyata dan menyesuaikan rencana berikutnya.`,
            },
          ].map((step, i) => (
            <li key={step.t} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]">
                {i + 1}
              </span>
              <div>
                <p className="font-heading font-bold">{step.t}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <SectionTitle kicker="FAQ">Pertanyaan seputar les {s.name} di {c.name}</SectionTitle>
        <div className="space-y-3">
          {faq.map((f) => (
            <details
              key={f.q}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <summary className="cursor-pointer font-heading text-sm font-bold md:text-base">{f.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle kicker="Kota lain">Les privat {s.name} di kota lain</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {otherCities.map((x) => (
            <Link
              key={x.slug}
              href={`/les-privat/${s.slug}/${x.slug}`}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              {s.name} {x.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle kicker="Mapel lain">Mapel lain di {c.name}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {otherSubjects.map((x) => (
            <Link
              key={x.slug}
              href={`/les-privat/${x.slug}/${c.slug}`}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              {x.name} {c.name}
            </Link>
          ))}
        </div>
      </section>

      <CtaBox
        title={`Cari tutor ${s.name} di ${c.name}`}
        text={`Tim Edustory akan mencarikan tutor ${s.name} yang tersedia di ${c.name}, sesuai jenjang, jadwal, dan preferensi belajar anak Anda.`}
      />
    </SeoShell>
  )
}
