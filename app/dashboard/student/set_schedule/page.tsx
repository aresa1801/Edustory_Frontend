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
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <p className="text-green-700 text-lg">
          <span className="font-semibold">Match ID:</span> {matchId || 'Tidak ada'}
        </p>
        <p className="text-sm text-green-600 mt-2">
          Jika Anda melihat halaman ini, berarti redirect berhasil! 🎉
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