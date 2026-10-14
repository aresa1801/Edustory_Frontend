import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default function PaymentSuccessPage() {
  return (
    <div className="mx-auto mt-16 max-w-md p-4 animate-fade-in">
      <div className="surface-gradient p-6 text-center">
        <div className="mb-3 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 ring-1 ring-inset ring-success/20">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Pembayaran Berhasil</h3>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Saldo kamu akan segera bertambah. Kalau belum terlihat, tunggu beberapa detik lalu refresh halaman.
          </p>
          <Link href="/dashboard/student/payment">
            <Button className="w-full">Kembali ke Dompet</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
