import { SUBJECTS, CITIES, abs } from '@/lib/seo-catalog'

/**
 * Sitemap source of truth.
 *
 * Rules that keep this scalable to tens of thousands of URLs:
 *  - One entry list, chunked into shards of SHARD_SIZE. A sitemap file must stay
 *    under 50,000 URLs / 50MB, and smaller shards regenerate faster.
 *  - No <changefreq> or <priority>: Google ignores both since 2023 and they only
 *    bloat the file.
 *  - <lastmod> is a stable content date, never `now`. A lastmod that changes on
 *    every deploy teaches the crawler to ignore the field entirely.
 */

/** Bump this when the catalog or the static copy actually changes. */
export const CONTENT_UPDATED = new Date('2026-11-08T00:00:00+07:00')

export const SHARD_SIZE = 5000

const BLOG = [
  { slug: 'cara-mempersiapkan-utbk', updated: '2026-10-20' },
  { slug: 'pentingnya-komunikasi-pembelajaran-online', updated: '2026-10-24' },
  { slug: 'tips-belajar-efektif-smp', updated: '2026-10-28' },
]

const STATIC_PATHS = [
  '/',
  '/les-privat',
  '/les-online',
  '/kelas-semi-privat',
  '/homeschooling',
  '/corporate-training',
  '/layanan',
  '/program',
  '/kurasi',
  '/cara-kerja',
  '/faq',
  '/kontak',
  '/blog',
  '/register',
  '/privacy',
  '/terms',
]

export type Entry = { loc: string; lastmod: string }

const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString())

export function coreEntries(): Entry[] {
  const out: Entry[] = STATIC_PATHS.map((p) => ({ loc: abs(p), lastmod: iso(CONTENT_UPDATED) }))

  for (const s of SUBJECTS) {
    out.push({ loc: abs(`/les-privat/${s.slug}`), lastmod: iso(CONTENT_UPDATED) })
  }

  for (const post of BLOG) {
    out.push({ loc: abs(`/blog/${post.slug}`), lastmod: iso(post.updated) })
  }

  return out
}

export function cityEntries(): Entry[] {
  const out: Entry[] = []
  for (const s of SUBJECTS) {
    for (const c of CITIES) {
      out.push({ loc: abs(`/les-privat/${s.slug}/${c.slug}`), lastmod: iso(CONTENT_UPDATED) })
    }
  }
  return out
}

export function shards(): { name: string; entries: Entry[] }[] {
  const list: { name: string; entries: Entry[] }[] = [{ name: 'core', entries: coreEntries() }]
  const cities = cityEntries()
  for (let i = 0; i < cities.length; i += SHARD_SIZE) {
    list.push({ name: `kota-${i / SHARD_SIZE + 1}`, entries: cities.slice(i, i + SHARD_SIZE) })
  }
  return list
}

export function shardByName(name: string) {
  return shards().find((s) => s.name === name) ?? null
}

export function allEntries(): Entry[] {
  return shards().flatMap((s) => s.entries)
}

export function xmlEscape(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function urlset(entries: Entry[]): string {
  const body = entries
    .map((e) => `<url><loc>${xmlEscape(e.loc)}</loc><lastmod>${e.lastmod}</lastmod></url>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`
}
