import { shards, xmlEscape } from '@/lib/sitemap-data'

export const revalidate = 3600

const SITE = 'https://edustory.online'

/**
 * Sitemap index. Shards are listed here so a crawler finds every URL without
 * downloading one enormous file, and so a single shard can be refreshed on its
 * own instead of rebuilding the whole map.
 */
export async function GET() {
  const body = shards()
    .map(
      (s) =>
        `<sitemap><loc>${SITE}/sitemaps/${s.name}.xml</loc><lastmod>${new Date()
          .toISOString()
          .slice(0, 10)}</lastmod></sitemap>`,
    )
    .join('')

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`,
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  )
}

export const dynamic = 'force-static'
