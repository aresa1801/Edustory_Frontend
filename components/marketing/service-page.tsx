import Link from 'next/link'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Check } from 'lucide-react'

export interface ServicePageProps {
  eyebrow: string
  title: string
  intro: string
  highlights: { value: string; label: string }[]
  sections: { heading: string; body: string; points?: string[] }[]
  audience: string[]
  faq: { q: string; a: string }[]
}

export function ServicePage({ eyebrow, title, intro, highlights, sections, audience, faq }: ServicePageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="border-b border-border/60 bg-card/40">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight tracking-tight md:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{intro}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-background p-4">
                  <p className="font-display text-xl">{item.value}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8 md:py-16">
          <div className="space-y-4">
            {sections.map((section) => (
              <article key={section.heading} className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-xl tracking-tight">{section.heading}</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{section.body}</p>
                {section.points?.length ? (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {section.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-[12.5px] text-foreground/80">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/40">
          <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
            <h2 className="font-display text-xl tracking-tight">Cocok untuk</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {audience.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-[12px] text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-14 sm:px-8">
          <h2 className="font-display text-xl tracking-tight">Pertanyaan yang sering muncul</h2>
          <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
            {faq.map((item) => (
              <details key={item.q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[13.5px] font-semibold">
                  {item.q}
                  <span className="mt-0.5 text-primary transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/kontak"
              className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Konsultasi gratis
            </Link>
            <Link
              href="/layanan"
              className="inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-semibold transition hover:border-primary/40"
            >
              Layanan lain
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
