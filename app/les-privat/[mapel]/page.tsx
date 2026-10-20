import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SeoShell, SectionTitle, CtaBox } from '@/components/seo/page-shell'
import { SUBJECTS, CITIES, getSubject, abs } from '@/lib/seo-catalog'

type Params = { mapel: string }

export function generateStaticParams(): Params[] {
  return SUBJECTS.map((s) => ({ mapel: s.slug }))
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const s = getSubject(params.mapel)
  if (!s) return {}
  const title = `Les Privat ${s.name} ${s.jenjang} — Tutor Terkurasi`
  const description = `Les privat ${s.name} untuk jenjang ${s.jenjang} bersama tutor terkurasi Edustory. ${s.tagline}. Tatap muka, online, dan semi-privat.`
  return {
    title,
    description,
    alternates: { canonical: abs(`/les-privat/${s.slug}`) },
    openGraph: { title, description, url: abs(`/les-privat/${s.slug}`) },
  }
}

export default function SubjectPage({ params }: { params: Params }) {
  const s = getSubject(params.mapel)
  if (!s) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Les Privat ${s.name}`,
    serviceType: `Les privat ${s.name}`,
    description: s.intro,
    provider: { '@type': 'Organization', name: 'Edustory', url: abs('/') },
    areaServed: CITIES.map((c) => ({ '@type': 'City', name: c.name })),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `Program les privat ${s.name}`,
      itemListElement: s.topics.slice(0, 8).map((t) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Course', name: `${s.name}: ${t}` },
      })),
    },
  }

  return (
    <SeoShell
      breadcrumb={[{ label: 'Les Privat', href: '/les-privat' }, { label: s.name }]}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
        Les Privat {s.name} — {s.jenjang}
      </h1>
      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">{s.tagline}</p>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">{s.intro}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Jenjang</p>
          <p className="mt-1 font-heading font-bold">{s.jenjang}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Format</p>
          <p className="mt-1 font-heading font-bold">Tatap muka · Online · Semi-privat</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Fokus</p>
          <p className="mt-1 font-heading font-bold">{s.exam ?? 'Rapor & pemahaman konsep'}</p>
        </div>
      </div>

      <section className="mt-10">
        <SectionTitle kicker="Materi">Yang dibahas dalam les {s.name}</SectionTitle>
        <ul className="grid gap-2 sm:grid-cols-2">
          {s.topics.map((t) => (
            <li
              key={t}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm"
            >
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="font-heading font-bold">Hasil yang kami targetkan</p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{s.outcome}</p>
      </section>

      <section className="mt-10">
        <SectionTitle kicker="Kota">Les privat {s.name} di kota Anda</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {CITIES.map((c) => (
            <Link
              key={c.slug}
              href={`/les-privat/${s.slug}/${c.slug}`}
              className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              {s.name} {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle kicker="Mapel lain">Mata pelajaran lain</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.filter((x) => x.slug !== s.slug).map((x) => (
            <Link
              key={x.slug}
              href={`/les-privat/${x.slug}`}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              {x.name}
            </Link>
          ))}
        </div>
      </section>

      <CtaBox
        title={`Butuh tutor ${s.name} untuk anak Anda?`}
        text={`Ceritakan kondisi belajar anak, lalu tim Edustory akan mencarikan tutor ${s.name} yang paling cocok — termasuk pertimbangan jadwal, lokasi, dan gaya belajar.`}
      />
    </SeoShell>
  )
}
