'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth'

export default function MyStudentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        console.log('1️⃣ Mulai fetchData')
        const supabase = createClient()

        // Ambil user
        console.log('2️⃣ Ambil user...')
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('User error: ' + userError?.message)
        }
        console.log('✅ User:', user.email)

        // Ambil tutor ID
        console.log('3️⃣ Ambil tutor...')
        const { data: tutor, error: tutorError } = await supabase
          .from('tutors')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (tutorError || !tutor) {
          throw new Error('Tutor error: ' + tutorError?.message)
        }
        console.log('✅ Tutor ID:', tutor.id)

        // Ambil semua matches
        console.log('4️⃣ Ambil matches...')
        const { data: matches, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .eq('tutor_id', tutor.id)

        if (matchesError) {
          throw new Error('Matches error: ' + matchesError.message)
        }
        console.log('✅ Matches:', matches)

        if (!matches || matches.length === 0) {
          setData({ matches: [], students: [] })
          setLoading(false)
          return
        }

        // Ambil semua student_id dari matches
        const studentIds = matches.map(m => m.student_id)
        console.log('5️⃣ Student IDs:', studentIds)

        // Ambil data student
        console.log('6️⃣ Ambil students...')
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .in('id', studentIds)

        if (studentsError) {
          throw new Error('Students error: ' + studentsError.message)
        }
        console.log('✅ Students:', students)

        if (isMounted) {
          setData({ matches, students })
          setError(null)
        }
      } catch (err: any) {
        console.error('❌ Error:', err)
        if (isMounted) {
          setError(err.message || 'Terjadi kesalahan')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
          console.log('7️⃣ Selesai, loading false')
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3">Memuat...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">❌ Error:</p>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Data</h1>
      <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-[70vh]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}