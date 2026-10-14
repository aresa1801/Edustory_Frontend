import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'

export default function PaymentErrorPage() {
  return (
    <div className="mx-auto mt-16 max-w-md p-4 animate-fade-in">
      <div className="surface-gradient p-6 text-center">
        <div className="mb-3 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-inset ring-destructive/20">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Pembayaran Gagal</h3>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Pembayaran gagal diproses. Silakan coba lagi dengan metode pembayaran lain.
          </p>
          <Link href="/dashboard/student/payment">
            <Button className="w-full">Coba Lagi</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
