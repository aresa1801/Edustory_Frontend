'use client'

import { Suspense } from 'react'
import { Spinner } from '@/components/ui/spinner'
import StudentBrowseTutors from '@/components/dashboard/student/browse-tutors'

export default function FindTutorsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Cari Pengajar</h1>
        <p className="text-muted-foreground">
          Temukan pengajar terbaik yang sesuai dengan kebutuhan belajar Anda.
        </p>
      </div>

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