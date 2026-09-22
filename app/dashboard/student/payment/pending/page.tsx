import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

export default function PaymentPendingPage() {
  return (
    <div className="max-w-md mx-auto mt-16 p-4">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Clock className="w-16 h-16 text-yellow-500" />
          </div>
          <CardTitle>Pembayaran Tertunda</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Kamu belum menyelesaikan pembayaran, atau pembayaran masih diproses.
            Kalau kamu memilih metode seperti Virtual Account atau QRIS, selesaikan sesuai instruksi.
          </p>
          <Link href="/dashboard/student/payment">
            <Button className="w-full">Kembali ke Dompet</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}