import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default function PaymentSuccessPage() {
  return (
    <div className="max-w-md mx-auto mt-16 p-4">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle>Pembayaran Berhasil</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Saldo kamu akan segera bertambah. Kalau belum terlihat, tunggu beberapa detik lalu refresh halaman.
          </p>
          <Link href="/dashboard/student/payment">
            <Button className="w-full">Kembali ke Dompet</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}