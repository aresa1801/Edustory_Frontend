// app/dashboard/student/set_schedule/page.tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SetScheduleContent() {
  const searchParams = useSearchParams()
  const matchId = searchParams.get('matchId')

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">📅 Atur Jadwal</h1>
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-blue-700">
          <span className="font-semibold">Match ID:</span> {matchId || 'Tidak ada'}
        </p>
        <p className="text-sm text-blue-600 mt-2">
          Halaman ini sedang dalam pengembangan. Jika Anda melihat ini, redirect berhasil! 🎉
        </p>
      </div>
    </div>
  )
}

export default function SetSchedulePage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <SetScheduleContent />
    </Suspense>
  )
}