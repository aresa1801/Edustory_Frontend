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
      // Bot mesin AI: dibuka untuk halaman materi agar Edustory bisa dikutip
      // di ChatGPT, Perplexity, Gemini, dan Copilot (GEO/AEO).
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Claude-Web',
          'Claude-User',
          'anthropic-ai',
          'PerplexityBot',
          'Perplexity-User',
          'Google-Extended',
          'Applebot-Extended',
          'Bingbot',
          'CCBot',
          'Meta-ExternalAgent',
          'cohere-ai',
        ],
        allow: ['/', '/les-privat/', '/les-online', '/kelas-semi-privat', '/homeschooling', '/program', '/faq', '/blog', '/llms.txt', '/kurasi', '/cara-kerja'],
        disallow: ['/api/', '/dashboard/', '/curation/', '/auth/'],
      },
    ],
    sitemap: abs('/sitemap.xml'),
    host: abs('/'),
  }
}
