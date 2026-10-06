'use client'

import Link from 'next/link'
import { ArrowRight, CalendarDays, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

const Blog = () => {
  const posts = [
    {
      id: 1,
      title: 'Tips Belajar Efektif untuk Siswa SMP',
      excerpt: 'Strategi dan teknik terbukti untuk meningkatkan efektivitas belajar dan hasil akademik Anda di tingkat SMP.',
      category: 'Belajar',
      date: '15 Maret 2024',
      readTime: '5 min',
      emoji: '📚',
      slug: 'tips-belajar-efektif-smp',
    },
    {
      id: 2,
      title: 'Cara Mempersiapkan Diri untuk UTBK dengan Tepat',
      excerpt: 'Panduan lengkap persiapan UTBK dari para ahli termasuk tips manajemen waktu dan strategi mengerjakan soal.',
      category: 'Test Prep',
      date: '12 Maret 2024',
      readTime: '7 min',
      emoji: '✏️',
      slug: 'cara-mempersiapkan-utbk',
    },
    {
      id: 3,
      title: 'Pentingnya Komunikasi dalam Pembelajaran Online',
      excerpt: 'Bagaimana membangun komunikasi yang efektif antara siswa, pengajar, dan orang tua dalam pembelajaran online.',
      category: 'Edukasi',
      date: '10 Maret 2024',
      readTime: '4 min',
      emoji: '💬',
      slug: 'pentingnya-komunikasi-pembelajaran-online',
    },
  ]

  return (
    <section id="blog" className="section-pad bg-muted/40">
      <div className="container-page">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <span className="eyebrow">Blog</span>
            <h2 className="mt-4">Tips &amp; artikel pendidikan</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Wawasan dari para ahli untuk menemani perjalanan belajarmu.
            </p>
          </div>
          <Button asChild variant="outline" className="w-fit rounded-xl">
            <Link href="/blog">
              Lihat semua artikel
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article key={post.id} className="surface hover-card group flex flex-col overflow-hidden">
              <Link href={`/blog/${post.slug}`} className="block">
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-primary/10 via-card to-accent/10 text-5xl transition-transform duration-300 group-hover:scale-[1.02]">
                  <span aria-hidden>{post.emoji}</span>
                </div>
              </Link>

              <div className="flex flex-1 flex-col p-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {post.date}
                  </span>
                </div>

                <h3 className="text-lg font-bold leading-snug">
                  <Link href={`/blog/${post.slug}`} className="transition-colors group-hover:text-primary">
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">{post.excerpt}</p>

                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {post.readTime} baca
                  </span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary"
                  >
                    Baca
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Blog
