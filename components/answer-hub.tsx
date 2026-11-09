import { ArrowUpRight } from 'lucide-react'
import { FAQ, STEPS, DELIVERABLES, AUDIENCE } from '@/lib/home-faq'

/**
 * AnswerHub — blok tanya-jawab, alur, dan cakupan layanan di homepage.
 * Server component: seluruh teks masuk ke HTML hasil build sehingga bisa
 * dibaca crawler dan mesin jawaban (GEO/AEO).
 */
export default function AnswerHub() {
  return (
    <section id="faq" className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Tanya jawab</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
            FAQ — Pertanyaan yang Sering Diajukan
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Ringkasan jawaban singkat soal layanan, tutor, jadwal, progres, dan pembayaran di Edustory.
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {FAQ.map((item) => (
            <article key={item.q} className="rounded-2xl border border-border bg-background p-5">
              <h3 className="text-sm font-semibold leading-snug">{item.q}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{item.a}</p>
            </article>
          ))}
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h2 className="font-display text-2xl tracking-tight md:text-3xl">Bagaimana alur belajar di Edustory?</h2>
            <ol className="mt-5 space-y-4">
              {STEPS.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-[11px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="font-display text-2xl tracking-tight md:text-3xl">Apa yang siswa dan orang tua dapatkan?</h2>
              <ul className="mt-5 space-y-2.5">
                {DELIVERABLES.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground/80">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl tracking-tight md:text-3xl">Siapa yang cocok belajar di sini?</h2>
              <ul className="mt-5 space-y-2.5">
                {AUDIENCE.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground/80">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-background p-5">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Edustory menggabungkan kurasi tutor lima tahap, rencana belajar pekanan, dan laporan progres
            yang bisa dibaca orang tua. Layanan tatap muka tersedia di Yogyakarta, sementara sesi online
            menjangkau seluruh Indonesia. Kode dan catatan teknis proyek ini terbuka di repositori publik
            kami.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://github.com/aresa1801/Edustory_Frontend"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              rel="noopener noreferrer"
            >
              Repositori Edustory <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://github.com/aresa1801"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              rel="noopener noreferrer"
            >
              Profil pengembang <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
