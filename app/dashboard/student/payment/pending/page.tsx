import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

export default function PaymentPendingPage() {
  return (
    <div className="mx-auto mt-16 max-w-md p-4 animate-fade-in">
      <div className="surface-gradient p-6 text-center">
        <div className="mb-3 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/10 ring-1 ring-inset ring-warning/20">
            <Clock className="h-8 w-8 text-warning" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Pembayaran Tertunda</h3>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Kamu belum menyelesaikan pembayaran, atau pembayaran masih diproses.
            Kalau kamu memilih metode seperti Virtual Account atau QRIS, selesaikan sesuai instruksi.
          </p>
          <Link href="/dashboard/student/payment">
            <Button className="w-full">Kembali ke Dompet</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
