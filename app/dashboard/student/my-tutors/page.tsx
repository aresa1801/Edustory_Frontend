'use client'

import { Suspense } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader } from '@/components/dashboard/ui'
import StudentMyMatches from '@/components/dashboard/student/my-matches'

export default function MyTutorsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pengajar"
        title="Pengajar Saya"
        description="Lihat semua pengajar yang sedang atau pernah mengajar Anda."
      />

      <Suspense fallback={
        <div className="flex justify-center items-center py-12">
          <Spinner className="h-8 w-8" />
          <p className="ml-3 text-sm text-muted-foreground">Memuat daftar pengajar...</p>
        </div>
      }>
        <StudentMyMatches />
      </Suspense>
    </div>
  )
}