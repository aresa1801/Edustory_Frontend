'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth'

export default function MyStudentsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const testSupabase = async () => {
      try {
        console.log('🔍 Test Supabase mulai')
        const supabase = createClient()
        console.log('✅ Supabase client created')

        // Ambil semua tutors (tanpa filter) untuk test
        const { data: tutors, error } = await supabase
          .from('tutors')
          .select('*')
          .limit(1)

        if (error) {
          throw new Error('Supabase error: ' + error.message)
        }

        console.log('✅ Tutors:', tutors)
        if (isMounted) setData(tutors)
        setError(null)
      } catch (err: any) {
        console.error('❌ Error:', err)
        if (isMounted) setError(err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    testSupabase()

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">❌ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test Supabase</h1>
      <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}