'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth'

export default function MyStudentsPage() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState<string>('')

  useEffect(() => {
    let isMounted = true
    console.log('🚀 MyStudents: useEffect dijalankan')

    const fetchData = async () => {
      try {
        console.log('📡 MyStudents: fetchData mulai')
        setDebug('Mengambil session...')

        const supabase = createClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw new Error('Session error: ' + sessionError.message)
        }

        if (!session) {
          throw new Error('Tidak ada sesi, silakan login ulang')
        }

        console.log('✅ Sesi ditemukan:', session.user.email)
        setDebug('Session OK, mengambil tutor ID...')

        // Ambil tutor ID
        const { data: tutorData, error: tutorError } = await supabase
          .from('tutors')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        if (tutorError) {
          throw new Error('Tutor error: ' + tutorError.message)
        }

        if (!tutorData) {
          throw new Error('Tutor tidak ditemukan untuk user ini')
        }

        console.log('✅ Tutor ID:', tutorData.id)
        setDebug('Tutor ID OK, mengambil matches...')

        // Ambil matches dengan join ke students dan users_profile
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select(`
            id,
            subject,
            lesson_frequency,
            start_date,
            status,
            initiated_by,
            students:student_id (
              id,
              grade_level,
              subjects,
              budget_per_month,
              sessions_per_month,
              preferred_schedule,
              address,
              avatar_url,
              users_profile:user_id (
                full_name,
                phone
              )
            )
          `)
          .eq('tutor_id', tutorData.id)

        if (matchesError) {
          throw new Error('Matches error: ' + matchesError.message)
        }

        console.log(`✅ Matches diterima: ${matchesData?.length || 0}`)
        setDebug(`Matches OK: ${matchesData?.length || 0} data`)

        if (isMounted) {
          setMatches(matchesData || [])
          setError(null)
        }
      } catch (err: any) {
        console.error('❌ Error:', err)
        setError(err.message || 'Terjadi kesalahan')
        setDebug('ERROR: ' + err.message)
      } finally {
        console.log('🏁 fetchData selesai, setLoading(false)')
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // Jalankan fetch dengan timeout safety
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⚠️ Timeout 10 detik, force setLoading(false)')
        setLoading(false)
        setError('Waktu muat habis, silakan refresh halaman')
        setDebug('TIMEOUT')
      }
    }, 10000)

    fetchData()

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      console.log('🧹 Cleanup')
    }
  }, [])

  // Tampilan loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
        {debug && <p className="mt-2 text-xs text-gray-400">Debug: {debug}</p>}
      </div>
    )
  }

  // Tampilan error
  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">❌ {error}</p>
          {debug && <p className="text-xs text-red-500 mt-2">Debug: {debug}</p>}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Halaman
          </button>
        </div>
      </div>
    )
  }

  // Tampilan data mentah untuk debugging
  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Siswa Saya</h1>
      <p className="text-sm text-muted-foreground mb-4">Debug: {debug}</p>

      {matches.length === 0 ? (
        <div className="bg-gray-50 border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Belum ada data matches.</p>
        </div>
      ) : (
        <div>
          <p className="mb-4">Total matches: {matches.length}</p>
          <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
            {JSON.stringify(matches, null, 2)}
          </pre>
        </div>
      )}

      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Refresh
      </button>
    </div>
  )
}