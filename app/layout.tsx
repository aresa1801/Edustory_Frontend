import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'EduStory - Platform Pembelajaran Privat Terpercaya',
  description: 'Platform pembelajaran privat dengan pengajar profesional, fleksibel, dan personalized untuk semua usia. Les privat ke rumah, les online, kelas semi-privat, dan homeschooling.',
  generator: 'v0.app',
  keywords: ['les privat', 'les online', 'homeschooling', 'tutor', 'pembelajaran'],
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#00D4FF',
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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

        <Analytics />
      </body>
    </html>
  )
}