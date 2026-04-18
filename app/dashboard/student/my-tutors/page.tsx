'use client'

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

      <StudentMyMatches />
    </div>
  )
}
