'use client'

import { Suspense } from 'react'
import { Spinner } from '@/components/ui/spinner'
import StudentMyMatches from '@/components/dashboard/student/my-matches'

export default function MyTutorsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Pengajar Saya</h1>
        <p className="text-muted-foreground">
          Lihat semua pengajar yang sedang atau pernah mengajar Anda.
        </p>
      </div>

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