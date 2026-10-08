'use client'

import { SectionCard } from '@/components/dashboard/ui'

export default function AdminStatistics() {
  return (
    <SectionCard title="Statistik Platform" className="rounded-2xl">
      <div className="py-8 text-center">
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
      </div>
    </SectionCard>
  )
}
