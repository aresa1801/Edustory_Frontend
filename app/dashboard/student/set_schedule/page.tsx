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
        <p className="text-green-800">
          <span className="font-bold">Match ID:</span> {matchId || 'Tidak ada'}
        </p>
        <p className="text-sm text-green-700 mt-2">
          Selamat! Halaman ini berhasil diakses. 🎉
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Kembali
        </button>
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