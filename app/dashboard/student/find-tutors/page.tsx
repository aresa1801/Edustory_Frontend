'use client'

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

      <StudentBrowseTutors />
    </div>
  )
}
