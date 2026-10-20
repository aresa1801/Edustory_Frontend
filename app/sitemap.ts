import type { MetadataRoute } from 'next'
import { SUBJECTS, CITIES, abs } from '@/lib/seo-catalog'

const BLOG_SLUGS = [
  'cara-mempersiapkan-utbk',
  'pentingnya-komunikasi-pembelajaran-online',
  'tips-belajar-efektif-smp',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const statics: MetadataRoute.Sitemap = [
    { url: abs('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: abs('/les-privat'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: abs('/blog'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: abs('/register'), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: abs('/login'), lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: abs('/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: abs('/terms'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const subjects: MetadataRoute.Sitemap = SUBJECTS.map((s) => ({
    url: abs(`/les-privat/${s.slug}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const combos: MetadataRoute.Sitemap = SUBJECTS.flatMap((s) =>
    CITIES.map((c) => ({
      url: abs(`/les-privat/${s.slug}/${c.slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  )

  const posts: MetadataRoute.Sitemap = BLOG_SLUGS.map((slug) => ({
    url: abs(`/blog/${slug}`),
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.5,
  }))

  return [...statics, ...subjects, ...combos, ...posts]
}
