import Link from 'next/link'
import type { Metadata } from 'next'
import Header from '@/components/header'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Blog — EduStory',
  description:
    'Artikel EduStory tentang strategi belajar, persiapan ujian, dan pendampingan belajar anak untuk orang tua dan siswa.',
}

const posts = [
  {
    slug: 'cara-mempersiapkan-utbk',
    title: 'Cara Mempersiapkan UTBK',
    excerpt:
      'Rencana persiapan UTBK yang realistis: cara memetakan materi, menyusun jadwal latihan, dan mengevaluasi progres tanpa kehabisan tenaga.',
    tag: 'Ujian',
    read: '6 menit baca',
  },
  {
    slug: 'pentingnya-komunikasi-pembelajaran-online',
    title: 'Pentingnya Komunikasi dalam Pembelajaran Online',
    excerpt:
      'Kelas daring yang efektif tidak bergantung pada platform, tetapi pada seberapa jelas guru dan siswa menyepakati tujuan tiap sesi.',
    tag: 'Pembelajaran',
    read: '5 menit baca',
  },
  {
    slug: 'tips-belajar-efektif-smp',
    title: 'Tips Belajar Efektif untuk Siswa SMP',
    excerpt:
      'Kebiasaan kecil yang berdampak besar: cara mengatur waktu belajar, mencatat, dan mengulang materi agar tidak cepat lupa.',
    tag: 'Kebiasaan belajar',
    read: '5 menit baca',
  },
]

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="border-b border-border/60 bg-card/40">
          <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 md:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Blog</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight tracking-tight md:text-5xl">
              Catatan tentang cara belajar yang bekerja.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Kami menulis dari pengalaman mendampingi siswa: apa yang benar-benar membantu, dan kebiasaan mana yang
              terlihat produktif tetapi tidak menghasilkan apa-apa.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8 md:py-16">
          <div className="grid gap-4 md:grid-cols-2">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40"
              >
                <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                  <span className="rounded-full border border-border bg-background px-2 py-0.5">{post.tag}</span>
                  <span>{post.read}</span>
                </div>
                <h2 className="mt-3 font-display text-xl leading-snug tracking-tight">
                  <Link href={`/blog/${post.slug}`} className="hover:text-primary">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">{post.excerpt}</p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-4 text-[12.5px] font-semibold text-primary hover:underline"
                >
                  Baca artikel →
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-border bg-card/60 p-6">
            <h2 className="font-display text-xl tracking-tight">Butuh pendampingan langsung?</h2>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Artikel membantu, tetapi kadang siswa butuh tutor yang menyesuaikan pendekatan dengan kondisinya.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/kontak"
                className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Konsultasi gratis
              </Link>
              <Link
                href="/program"
                className="inline-flex h-10 items-center rounded-xl border border-border px-5 text-sm font-semibold transition hover:border-primary/40"
              >
                Lihat program
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
