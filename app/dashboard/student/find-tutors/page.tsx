'use client'

import { Suspense } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader } from '@/components/dashboard/ui'
import StudentBrowseTutors from '@/components/dashboard/student/browse-tutors'

export default function FindTutorsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pengajar"
        title="Cari Pengajar"
        description="Temukan pengajar terbaik yang sesuai dengan kebutuhan belajar Anda."
      />

      <Suspense fallback={
        <div className="flex justify-center items-center py-12">
          <Spinner className="h-8 w-8" />
          <p className="ml-3 text-sm text-muted-foreground">Memuat daftar pengajar...</p>
        </div>
      }>
        <StudentBrowseTutors />
      </Suspense>
    </div>
  )
}