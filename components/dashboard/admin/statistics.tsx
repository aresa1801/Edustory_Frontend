'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminStatistics() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistik Platform</CardTitle>
      </CardHeader>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">
          Dasbor statistik akan segera tersedia. Anda dapat melihat:
        </p>
        <ul className="mt-4 text-left max-w-sm mx-auto space-y-2 text-sm text-muted-foreground">
          <li>• Jumlah siswa dan pengajar aktif</li>
          <li>• Statistik pencocokan</li>
          <li>• Analisis pendapatan</li>
          <li>• Grafik pertumbuhan pengguna</li>
          <li>• Metrik kepuasan pengguna</li>
        </ul>
      </CardContent>
    </Card>
  )
}
