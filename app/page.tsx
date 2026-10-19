import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CalendarClock,
  ChartNoAxesCombined,
  Check,
  ClipboardCheck,
  GraduationCap,
  LineChart,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'

const pillars = [
  {
    icon: BadgeCheck,
    title: 'Tutor terkurasi, bukan sekadar terdaftar',
    body: 'Setiap pengajar melewati lima tahap seleksi: akademik, psikologi, microteaching, tulisan tangan, dan wawancara.',
  },
  {
    icon: BookOpenCheck,
    title: 'Kurikulum yang punya arah',
    body: 'Target belajar disusun per pekan bersama tutor. Tidak ada sesi yang berjalan tanpa tujuan yang jelas.',
  },
  {
    icon: LineChart,
    title: 'Progres yang bisa dilihat',
    body: 'Laporan hasil belajar, catatan sesi, dan analitik nilai tersimpan rapi untuk siswa maupun orang tua.',
  },

]

const programs = [
  {
    name: 'Reguler',
    tag: 'Paling populer',
    featured: true,
    body: 'Ritme belajar stabil untuk siswa SD–SMA yang ingin naik level secara konsisten.',
    points: ['2 sesi per pekan', 'Online atau di rumah', 'Laporan progres mingguan'],
  },
  {
    name: 'Intensif',
    tag: 'Ujian & UTBK',
    featured: false,
    body: 'Persiapan terarah untuk ujian sekolah, UTBK, dan olimpiade dengan target terukur.',
    points: ['3–4 sesi per pekan', 'Latihan soal terarah', 'Evaluasi tiap pekan'],
  },
  {
    name: 'Privat',
    tag: 'Fleksibel',
    featured: false,
    body: 'Jadwal menyesuaikan kebutuhan keluarga, cocok untuk pendampingan personal.',
    points: ['Jadwal fleksibel', 'Fokus satu mapel', 'Tutor pilihan sendiri'],
  },
]

const steps = [
  { icon: MessageCircle, title: 'Konsultasi', body: 'Ceritakan target, kendala, dan jadwal belajar siswa.' },
  { icon: ClipboardCheck, title: 'Rencana belajar', body: 'Kami susun rencana per pekan bersama tutor yang cocok.' },
  { icon: Users, title: 'Sesi pertama', body: 'Mulai belajar dengan ruang diskusi dan catatan sesi.' },
  { icon: ChartNoAxesCombined, title: 'Evaluasi', body: 'Progres diukur dan dilaporkan setiap pekan.' },
]

const articles = [
  {
    href: '/blog/tips-belajar-efektif-smp',
    title: 'Tips belajar efektif untuk siswa SMP',
    body: 'Kebiasaan kecil yang membuat belajar 30 menit lebih berarti daripada 3 jam tanpa arah.',
  },
  {
    href: '/blog/cara-mempersiapkan-utbk',
    title: 'Cara mempersiapkan UTBK dari nol',
    body: 'Urutan materi, strategi tryout, dan cara menjaga ritme belajar tanpa kelelahan.',
  },
  {
    href: '/blog/pentingnya-komunikasi-pembelajaran-online',
    title: 'Komunikasi dalam pembelajaran online',
    body: 'Mengapa sesi online bisa tetap hangat dan personal bila komunikasinya tepat.',
  },
]


export default function Home() {
  return (
    <div className="w-full bg-background pb-24 md:pb-0">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(42rem 22rem at 78% -8%, color-mix(in oklab, var(--brand-mint) 22%, transparent), transparent 70%), radial-gradient(34rem 20rem at 8% 10%, color-mix(in oklab, var(--brand-amber) 16%, transparent), transparent 65%)',
            }}
          />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-10 sm:px-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pb-20 md:pt-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Tutor terkurasi
              </span>

              <h1 className="mt-5 font-display text-[2.15rem] leading-[1.05] tracking-tight sm:text-5xl md:text-[3.4rem]">
                Belajar yang terasa personal.
                <span className="block text-primary">Hasil yang terukur.</span>
              </h1>

              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                Tutor terpilih, rencana belajar yang jelas, dan progres yang bisa dilihat setiap pekan.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
                >
                  Mulai belajar <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#cara-kerja"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition hover:border-primary/40"
                >
                  Kenali cara kerjanya
                </Link>
              </div>

              <dl className="mt-8 grid max-w-lg grid-cols-3 gap-3">
                {[
                  { label: 'Jenjang', value: 'SD–SMA' },
                  { label: 'Mode', value: 'Online & rumah' },
                  { label: 'Laporan', value: 'Tiap pekan' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-card/70 px-3 py-2.5">
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</dt>
                    <dd className="mt-0.5 text-sm font-semibold">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Progress card */}
            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" />
              <div className="relative rounded-[1.6rem] border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/12 text-sm font-bold text-primary">
                      AR
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Rencana belajar</p>
                      <p className="text-[11px] text-muted-foreground">Kelas 9 · Matematika & Inggris</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-accent/30 bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
                    Aktif
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {[
                    { name: 'Matematika', value: 78, note: 'Fungsi kuadrat' },
                    { name: 'Bahasa Inggris', value: 64, note: 'Reading comprehension' },
                    { name: 'Fisika', value: 52, note: 'Gerak lurus' },
                  ].map((item) => (
                    <div key={item.name}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">{item.value}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${item.value}%` }} />
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">Fokus: {item.note}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-background/60 px-3.5 py-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Sesi berikutnya</p>
                    <p className="text-sm font-semibold">Selasa, 16.00 · 60 menit</p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/12 text-primary">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Tutor terkurasi · laporan otomatis tiap sesi
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-b border-border/60 bg-card/50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:px-8">
            <span className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /> Kurasi lima tahap</span>
            <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" /> SD · SMP · SMA · UTBK</span>
            <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> Jadwal fleksibel</span>
            <span className="flex items-center gap-2"><LineChart className="h-4 w-4 text-primary" /> Laporan progres</span>
          </div>
        </section>

        {/* Pillars */}
        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Mengapa Edustory</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
              Standar yang jelas, bukan janji kosong.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Kualitas belajar ditentukan oleh kualitas pendampingnya. Seleksi, kurikulum, dan pelaporan dibuat terukur.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="rounded-2xl border border-border bg-card p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/12 text-primary">
                  <pillar.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold leading-snug">{pillar.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{pillar.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Programs */}
        <section id="program" className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Program</p>
              <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">Pilih cara belajar yang paling pas.</h2>
            </div>
            <Link href="/auth/login" className="text-sm font-semibold text-primary hover:underline">
              Konsultasi gratis →
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {programs.map((program) => (
              <div
                key={program.name}
                className={`relative flex flex-col rounded-2xl border p-5 ${
                  program.featured ? 'border-primary/40 bg-card shadow-sm' : 'border-border bg-card'
                }`}
              >
                {program.featured ? (
                  <span className="absolute right-4 top-4 rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
                    {program.tag}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {program.tag}
                  </span>
                )}
                <h3 className="mt-2 font-display text-xl">{program.name}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{program.body}</p>
                <ul className="mt-4 space-y-2">
                  {program.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-[12.5px] text-foreground/80">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/login"
                  className={`mt-5 inline-flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition ${
                    program.featured
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'border border-border bg-background hover:border-primary/40'
                  }`}
                >
                  Mulai dari sini
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="cara-kerja" className="border-y border-border/60 bg-card/50">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Cara kerja</p>
            <h2 className="mt-2 max-w-2xl font-display text-3xl tracking-tight md:text-4xl">
              Dari konsultasi ke sesi pertama, tanpa proses berbelit.
            </h2>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-border bg-background p-5">
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/12 text-primary">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-2xl text-border">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Articles */}
        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Catatan belajar</p>
              <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">Bacaan untuk siswa & orang tua.</h2>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.href}
                href={article.href}
                className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Artikel</p>
                <h3 className="mt-2 font-display text-lg leading-snug group-hover:text-primary">{article.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{article.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Baca <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ */}
        {/* CTA */}
        <section id="kontak" className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
          <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-primary px-6 py-10 text-primary-foreground sm:px-10">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  'radial-gradient(28rem 14rem at 85% 0%, rgba(255,255,255,0.35), transparent 70%)',
              }}
            />
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-xl">
                <h2 className="font-display text-3xl leading-tight tracking-tight md:text-4xl">
                  Mulai dari satu percakapan.
                </h2>
                <p className="mt-2 text-sm text-primary-foreground/80">
                  Ceritakan kebutuhan belajarnya. Kami bantu carikan tutor dan susun rencananya — tanpa biaya
                  konsultasi.
                </p>
              </div>
              <Link
                href="/auth/login"
                className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-background px-6 text-sm font-semibold text-foreground transition hover:opacity-90"
              >
                Daftar sekarang <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="flex gap-2">
          <Link
            href="/auth/login"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-border text-sm font-semibold"
          >
            Masuk
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            Mulai belajar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
