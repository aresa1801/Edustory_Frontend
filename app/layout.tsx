import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import ServiceWorkerRegister from '@/components/service-worker-register'
import './globals.css'

export const dynamic = 'force-dynamic'

const APP_NAME = 'EduStory'
const APP_DESCRIPTION =
  'Platform pembelajaran privat dengan pengajar profesional, fleksibel, dan personal untuk semua usia — les privat ke rumah, les online, kelas semi-privat, dan homeschooling.'

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: 'EduStory — Platform Pembelajaran Privat Terpercaya',
    template: '%s · EduStory',
  },
  description: APP_DESCRIPTION,
  generator: 'v0.app',
  keywords: ['les privat', 'les online', 'homeschooling', 'tutor', 'pembelajaran', 'bimbel'],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: 'EduStory — Platform Pembelajaran Privat Terpercaya',
    description: APP_DESCRIPTION,
    locale: 'id_ID',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBFBFE' },
    { media: '(prefers-color-scheme: dark)', color: '#070B15' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  const snapUrl = isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js'

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <div>{children}</div>
          </AuthProvider>
        </ThemeProvider>

        {/* Midtrans Snap.js */}
        <Script
          src={snapUrl}
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="afterInteractive"
        />

        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  )
}
