'use client'

import { SectionCard } from '@/components/dashboard/ui'

export default function AdminUsersManagement() {
  return (
    <SectionCard title="Kelola Pengguna" className="rounded-2xl">
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          Fitur manajemen pengguna akan segera tersedia. Di sini Anda dapat:
        </p>
        <ul className="mt-4 text-left max-w-sm mx-auto space-y-2 text-sm text-muted-foreground">
          <li>• Melihat daftar semua siswa dan pengajar</li>
          <li>• Menangguhkan atau melarang pengguna</li>
          <li>• Mengelola data pengguna</li>
          <li>• Melihat aktivitas pengguna</li>
        </ul>
      </div>
    </SectionCard>
  )
}
