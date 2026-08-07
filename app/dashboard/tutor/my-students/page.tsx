'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/auth'
import { Spinner } from '@/components/ui/spinner'

export default function MyStudentsPage() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [debug, setDebug] = useState<string>('⏳ Menunggu...')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        console.log('🔍 [DEBUG] Step 1: useEffect dijalankan')
        setDebug('1️⃣ useEffect berjalan')
        setLoading(true)
        setError(null)

        if (authLoading) {
          console.log('⏳ [DEBUG] authLoading true, return')
          setDebug('2️⃣ authLoading = true, menunggu...')
          return
        }

        if (!authUser) {
          console.log('❌ [DEBUG] authUser null')
          setDebug('3️⃣ authUser = null')
          setError('User tidak ditemukan')
          setLoading(false)
          return
        }

        console.log('✅ [DEBUG] authUser:', authUser.email)
        setDebug(`4️⃣ authUser: ${authUser.email}`)

        const supabase = createClient()
        console.log('✅ [DEBUG] Supabase client dibuat')
        setDebug('5️⃣ Supabase client dibuat')

        // ---- COBA AKSES LANGSUNG KE TABEL tutors ----
        console.log('🔍 [DEBUG] Step 6: Mencoba SELECT tutors...')
        setDebug('6️⃣ Mencoba SELECT tutors...')

        // Gunakan .then/.catch untuk menangkap error lebih jelas
        const tutorPromise = supabase
          .from('tutors')
          .select('id')
          .eq('user_id', authUser.id)
          .single()

        // Tambahkan timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout 5 detik')), 5000)
        )

        const result = await Promise.race([tutorPromise, timeoutPromise])
        console.log('📦 [DEBUG] Hasil tutor:', result)

        const { data: tutorData, error: tutorError } = result as any

        if (tutorError) {
          console.error('❌ [DEBUG] Tutor error:', tutorError)
          setDebug(`7️⃣ ❌ Tutor error: ${tutorError.message}`)
          throw new Error(`Gagal ambil tutor: ${tutorError.message}`)
        }

        if (!tutorData) {
          console.error('❌ [DEBUG] Tutor tidak ditemukan')
          setDebug('7️⃣ ❌ Tutor tidak ditemukan')
          throw new Error('Tutor tidak ditemukan')
        }

        const tutorId = tutorData.id
        console.log('✅ [DEBUG] Tutor ID:', tutorId)
        setDebug(`8️⃣ ✅ Tutor ID: ${tutorId}`)

        // Ambil matches
        console.log('🔍 [DEBUG] Step 9: Mengambil matches...')
        setDebug('9️⃣ Mengambil matches...')

        const matchesPromise = supabase
          .from('matches')
          .select('*')
          .eq('tutor_id', tutorId)

        const matchesResult = await Promise.race([matchesPromise, timeoutPromise])
        console.log('📦 [DEBUG] Hasil matches:', matchesResult)

        const { data: matchesData, error: matchesError } = matchesResult as any

        if (matchesError) {
          console.error('❌ [DEBUG] Matches error:', matchesError)
          setDebug(`🔟 ❌ Matches error: ${matchesError.message}`)
          throw new Error(`Gagal ambil matches: ${matchesError.message}`)
        }

        setDebug(`1️⃣1️⃣ ✅ Matches: ${matchesData?.length || 0}`)
        console.log('✅ [DEBUG] Matches ditemukan:', matchesData?.length)

        // Ambil student data
        const enriched = []
        if (matchesData && matchesData.length > 0) {
          for (let i = 0; i < matchesData.length; i++) {
            const match = matchesData[i]
            console.log(`🔍 [DEBUG] Ambil student ${i+1}: ${match.student_id}`)
            setDebug(`1️⃣2️⃣ Ambil student ${i+1}/${matchesData.length}`)

            const studentPromise = supabase
              .from('students')
              .select(`
                id,
                grade_level,
                subjects,
                budget_per_month,
                sessions_per_month,
                preferred_schedule,
                address,
                avatar_url,
                user_profiles:user_id (
                  full_name,
                  phone
                )
              `)
              .eq('id', match.student_id)
              .single()

            const studentResult = await Promise.race([studentPromise, timeoutPromise])
            const { data: studentData, error: studentError } = studentResult as any

            if (studentError) {
              console.warn(`⚠️ [DEBUG] Gagal ambil student ${match.student_id}:`, studentError)
              enriched.push({ ...match, student: null })
            } else {
              enriched.push({ ...match, student: studentData })
            }
          }
        }

        console.log('✅ [DEBUG] Enriched data:', enriched)
        setDebug(`1️⃣3️⃣ ✅ Selesai, ${enriched.length} data`)
        setData(enriched)
        setError(null)

      } catch (err: any) {
        console.error('💥 [DEBUG] Catch error:', err)
        setDebug(`❌ ERROR: ${err.message}`)
        setError(err.message)
      } finally {
        if (isMounted) {
          setLoading(false)
          console.log('🏁 [DEBUG] setLoading(false)')
        }
      }
    }

    if (authLoading) {
      console.log('⏳ [DEBUG] authLoading true, return')
      setDebug('⏳ Auth loading...')
      return
    }

    fetchData()

    return () => {
      isMounted = false
      console.log('🧹 [DEBUG] Cleanup')
    }
  }, [authUser?.id, authLoading])

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <Spinner className="h-8 w-8" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-lg w-full">
          <p className="text-xs font-mono break-all">{debug}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">❌ Error: {error}</p>
          <p className="text-xs text-red-500 mt-2">Debug: {debug}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Siswa Saya</h1>
      <div className="mb-4 p-2 bg-green-100 rounded">
        <p className="text-sm text-green-700">✅ Data berhasil dimuat</p>
        <p className="text-xs font-mono mt-1">{debug}</p>
      </div>
      {data && data.length === 0 ? (
        <p className="text-muted-foreground">Belum ada data match.</p>
      ) : (
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-[70vh]">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Refresh
      </button>
    </div>
  )
}