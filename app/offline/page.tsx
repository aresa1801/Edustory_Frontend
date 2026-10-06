import Link from 'next/link'
import { BookOpen, WifiOff } from 'lucide-react'

export const metadata = { title: 'Tidak ada koneksi' }

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Kamu sedang offline</h1>
        <p className="mt-3 text-muted-foreground">
          Koneksi internet terputus. Periksa jaringanmu, lalu coba lagi — halaman yang sudah pernah dibuka tetap bisa
          diakses dari perangkat ini.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
        >
          <BookOpen className="h-4 w-4" />
          Coba lagi
        </Link>
      </div>
    </main>
  )
}
