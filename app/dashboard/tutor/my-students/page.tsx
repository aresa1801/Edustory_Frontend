'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/auth'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

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
        setDebug('1️⃣ useEffect berjalan')
        setLoading(true)
        setError(null)

        // Cek auth
        if (authLoading) {
          setDebug('2️⃣ authLoading = true, menunggu...')
          return
        }

        if (!authUser) {
          setDebug('3️⃣ authUser = null')
          setError('User tidak ditemukan, silakan login')
          setLoading(false)
          return
        }

        setDebug(`4️⃣ authUser ditemukan: ${authUser.email}`)

        // Buat Supabase client
        const supabase = createClient()
        setDebug('5️⃣ Supabase client dibuat')

        // Ambil tutor ID
        setDebug('6️⃣ Mencari tutor...')
        const { data: tutorData, error: tutorError } = await supabase
          .from('tutors')
          .select('id')
          .eq('user_id', authUser.id)
          .single()

        if (tutorError) {
          setDebug(`7️⃣ ❌ Tutor error: ${tutorError.message}`)
          throw new Error(`Gagal ambil tutor: ${tutorError.message}`)
        }

        if (!tutorData) {
          setDebug('7️⃣ ❌ Tutor tidak ditemukan')
          throw new Error('Tutor tidak ditemukan untuk user ini')
        }

        const tutorId = tutorData.id
        setDebug(`8️⃣ ✅ Tutor ditemukan: ${tutorId}`)

        // Ambil semua matches untuk tutor ini
        setDebug('9️⃣ Mengambil matches...')
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .eq('tutor_id', tutorId)

        if (matchesError) {
          setDebug(`🔟 ❌ Matches error: ${matchesError.message}`)
          throw new Error(`Gagal ambil matches: ${matchesError.message}`)
        }

        setDebug(`1️⃣1️⃣ ✅ Matches ditemukan: ${matchesData?.length || 0}`)

        if (!matchesData || matchesData.length === 0) {
          setDebug('1️⃣2️⃣ Tidak ada match, selesai')
          setData([])
          setLoading(false)
          return
        }

        // Ambil data student untuk setiap match
        setDebug('1️⃣3️⃣ Mengambil data siswa...')
        const enriched = []

        for (let i = 0; i < matchesData.length; i++) {
          const match = matchesData[i]
          setDebug(`1️⃣4️⃣ Ambil student ${i+1}/${matchesData.length} (ID: ${match.student_id})`)

          const { data: studentData, error: studentError } = await supabase
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

          if (studentError) {
            setDebug(`1️⃣5️⃣ ⚠️ Gagal ambil student ${match.student_id}: ${studentError.message}`)
            enriched.push({ ...match, student: null })
          } else {
            enriched.push({ ...match, student: studentData })
          }
        }

        setDebug(`1️⃣6️⃣ ✅ Selesai, ${enriched.length} data diproses`)
        setData(enriched)
        setError(null)

      } catch (err: any) {
        setDebug(`❌ ERROR: ${err.message}`)
        setError(err.message)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // Jalankan fetch setelah auth selesai
    if (authLoading) {
      setDebug('⏳ Auth masih loading...')
      return
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [authUser?.id, authLoading])

  const handleRefresh = () => {
    window.location.reload()
  }

  // Tampilan loading
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

  // Tampilan error
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>
            <p className="font-semibold">❌ Terjadi kesalahan:</p>
            <p className="mt-1">{error}</p>
            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono break-all">
              {debug}
            </div>
          </AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} className="mt-4">
          Refresh Halaman
        </Button>
      </div>
    )
  }

  // Tampilkan data mentah jika sukses
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Siswa Saya - Debug Mode</h1>
      <div className="mb-4 p-2 bg-green-100 dark:bg-green-900/30 rounded">
        <p className="text-sm font-medium text-green-700 dark:text-green-300">✅ Data berhasil dimuat</p>
        <p className="text-xs font-mono mt-1">{debug}</p>
      </div>

      {data && data.length === 0 ? (
        <p className="text-muted-foreground">Belum ada data match.</p>
      ) : (
        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-xs overflow-auto max-h-[70vh]">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}

      <Button onClick={handleRefresh} variant="outline" className="mt-4">
        Refresh
      </Button>
    </div>
  )
}