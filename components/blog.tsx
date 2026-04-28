'use client'

import Link from 'next/link'
import { ArrowRight, Calendar } from 'lucide-react'
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
      image: '📚',
      color: 'bg-primary/10',
      slug: 'tips-belajar-efektif-smp',
    },
    {
      id: 2,
      title: 'Cara Mempersiapkan Diri untuk UTBK dengan Tepat',
      excerpt: 'Panduan lengkap persiapan UTBK dari para ahli termasuk tips manajemen waktu dan strategi mengerjakan soal.',
      category: 'Test Prep',
      date: '12 Maret 2024',
      readTime: '7 min',
      image: '✏️',
      color: 'bg-secondary/10',
      slug: 'cara-mempersiapkan-utbk',
    },
    {
      id: 3,
      title: 'Pentingnya Komunikasi dalam Pembelajaran Online',
      excerpt: 'Bagaimana membangun komunikasi yang efektif antara siswa, pengajar, dan orang tua dalam pembelajaran online.',
      category: 'Edukasi',
      date: '10 Maret 2024',
      readTime: '4 min',
      image: '💬',
      color: 'bg-accent/10',
      slug: 'pentingnya-komunikasi-pembelajaran-online',
    },
  ]

  return (
    <section id="blog" className="w-full py-16 md:py-20 lg:py-24 bg-gradient-to-b from-card/50 to-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-primary mb-4">
            Tips & Artikel Pendidikan
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Artikel berkualitas dari para ahli pendidikan untuk membantu perjalanan belajar Anda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-card rounded-xl border border-border hover:border-primary/50 overflow-hidden hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 group flex flex-col transform hover:scale-102 hover:-translate-y-1"
            >
              {/* Image/Icon Area */}
              <div className={`h-48 ${post.color} flex items-center justify-center text-6xl group-hover:scale-105 transition-transform`}>
                {post.image}
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-grow">
                {/* Category & Date */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {post.category}
                  </span>
                  <div className="flex items-center gap-1 text-sm text-slate-300">
                    <Calendar className="w-4 h-4" />
                    {post.date}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>

                {/* Excerpt */}
                <p className="text-slate-300 mb-6 line-clamp-2 flex-grow">
                  {post.excerpt}
                </p>

                {/* Read Time & Link */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    {post.readTime} baca
                  </span>
                  <Link href={`/blog/${post.slug}`}>
                    <Button
                      variant="ghost"
                      className="text-primary hover:text-primary/90 p-0 h-auto font-semibold flex items-center gap-2"
                    >
                      Baca Selengkapnya
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button className="bg-primary hover:bg-primary/90 text-white h-12 px-8 text-base font-semibold">
            Lihat Semua Artikel
          </Button>
        </div>
      </div>
    </section>
  )
}

export default Blog
