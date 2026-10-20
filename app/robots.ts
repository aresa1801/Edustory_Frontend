import type { MetadataRoute } from 'next'
import { abs } from '@/lib/seo-catalog'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/curation/', '/auth/', '/maintenance'],
      },
    ],
    sitemap: abs('/sitemap.xml'),
    host: abs('/'),
  }
}
