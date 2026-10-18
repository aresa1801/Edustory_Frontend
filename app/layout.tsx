import type { Metadata, Viewport } from 'next'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL('https://v0-edustory.vercel.app'),
  title: {
    default: 'Edustory — Belajar privat yang terasa personal',
    template: '%s · Edustory',
  },
  description:
    'Platform belajar privat dengan tutor terkurasi, kurikulum terstruktur, dan laporan progres yang jelas. Les privat ke rumah, online, dan semi-privat untuk semua jenjang.',
  generator: 'v0.app',
  keywords: ['les privat', 'les online', 'homeschooling', 'tutor', 'pembelajaran', 'edustory'],
  applicationName: 'Edustory',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/brand/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/brand/edustory-mark.svg', type: 'image/svg+xml' },
    ],
    apple: '/brand/icon-180.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://v0-edustory.vercel.app',
    siteName: 'Edustory',
    title: 'Edustory — Belajar privat yang terasa personal',
    description:
      'Tutor terkurasi, kurikulum terstruktur, dan laporan progres. Belajar privat jadi terasa personal.',
    images: [{ url: '/brand/og-image.png', width: 1200, height: 630, alt: 'Edustory' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Edustory — Belajar privat yang terasa personal',
    description: 'Tutor terkurasi, kurikulum terstruktur, dan laporan progres yang jelas.',
    images: ['/brand/og-image.png'],
  },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0B201C',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${fraunces.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <div>{children}</div>
          </AuthProvider>
        </ThemeProvider>

        <Analytics />
      </body>
    </html>
  )
}