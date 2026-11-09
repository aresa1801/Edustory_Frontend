import type { Metadata } from 'next'
import { ENTITY } from '@/lib/entity'

export const metadata: Metadata = {
  title: `About ${ENTITY.name}`,
  description: ENTITY.description,
  alternates: { canonical: `${ENTITY.url}/about` },
  openGraph: {
    title: `About ${ENTITY.name}`,
    description: ENTITY.description,
    url: `${ENTITY.url}/about`,
    siteName: ENTITY.name,
    type: 'website',
  },
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 md:py-28">
      <p className="text-xs font-medium uppercase tracking-[0.2em] opacity-60">
        Tutoring
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
        {ENTITY.name}
      </h1>
      <p className="mt-4 text-lg opacity-70">{ENTITY.slogan}</p>

      <div className="mt-10 space-y-5 text-base leading-relaxed opacity-90">
        <p>{ENTITY.description}</p>
        <p>
          Edustory is based in Yogyakarta, Indonesia and has been operating since 2024. It is a product of Rekso Software Engineering. Every claim on this page is also published as structured data
          (schema.org) on the site root, so search engines and AI assistants can
          verify it against the same source.
        </p>
      </div>

      <dl className="mt-12 grid gap-x-8 gap-y-6 border-t border-current/10 pt-8 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.15em] opacity-60">Website</dt>
          <dd className="mt-1"><a className="underline underline-offset-4" href={ENTITY.url}>{ENTITY.url.replace(/^https?:\/\//, '')}</a></dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.15em] opacity-60">Based in</dt>
          <dd className="mt-1">Yogyakarta, Indonesia</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.15em] opacity-60">Founded</dt>
          <dd className="mt-1">2024</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.15em] opacity-60">Parent organization</dt>
          <dd className="mt-1">Rekso Software Engineering</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-[0.15em] opacity-60">Profiles</dt>
          <dd className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {ENTITY.sameAs.map((href) => (
              <a key={href} className="underline underline-offset-4" href={href} rel="me noopener" target="_blank">
                {href.replace(/^https?:\/\//, '')}
              </a>
            ))}
          </dd>
        </div>
      </dl>
    </main>
  )
}
