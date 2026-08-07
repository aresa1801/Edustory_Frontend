'use client'

import { useState, useEffect } from 'react'
import { Spinner } from '@/components/ui/spinner'

export default function MyStudentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('🔵 useEffect dijalankan')
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="ml-3">Memuat...</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Halaman Siswa Saya</h1>
      <p>Jika ini terlihat, maka useEffect berjalan dan loading selesai.</p>
    </div>
  )
}