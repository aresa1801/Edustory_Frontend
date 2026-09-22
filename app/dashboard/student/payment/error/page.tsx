import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'

export default function PaymentErrorPage() {
  return (
    <div className="max-w-md mx-auto mt-16 p-4">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <XCircle className="w-16 h-16 text-red-500" />
          </div>
          <CardTitle>Pembayaran Gagal</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Pembayaran gagal diproses. Silakan coba lagi dengan metode pembayaran lain.
          </p>
          <Link href="/dashboard/student/payment">
            <Button className="w-full">Coba Lagi</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}