import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AppProvider } from '@/components/app-provider'
import './globals.css'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'EduStory - Platform Pembelajaran Privat Terpercaya',
  description: 'Platform pembelajaran privat dengan pengajar profesional, fleksibel, dan personalized untuk semua usia. Les privat ke rumah, les online, kelas semi-privat, dan homeschooling.',
  generator: 'v0.app',
  keywords: ['les privat', 'les online', 'homeschooling', 'tutor', 'pembelajaran'],
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2E7D8C',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <AppProvider>
          <div className="font-sans antialiased">
            {children}
          </div>
        </AppProvider>
        <Analytics />
      </body>
    </html>
  )
}
