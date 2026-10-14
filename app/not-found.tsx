import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="surface w-full max-w-md p-8 text-center sm:p-10">
        <div className="mb-8">
          <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Search className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-gradient font-display text-7xl font-extrabold tracking-tight">
            404
          </h1>
          <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-foreground">
            Halaman Tidak Ditemukan
          </h2>
          <p className="mt-3 text-muted-foreground">
            Halaman yang Anda cari mungkin telah dipindahkan, dihapus, atau tidak pernah ada.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/">
            <Button className="h-12 w-full gap-2 rounded-xl px-8 text-base font-semibold">
              <Home className="h-5 w-5" />
              Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
