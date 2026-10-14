'use client'

import { useState, useEffect, useRef } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/auth'
import { User } from 'lucide-react'
import { EmptyState, TonePill } from '@/components/dashboard/ui'

const STATUS_CONFIG = {
  pending: { label: 'Menunggu Konfirmasi', color: 'bg-warning/10 text-warning border-warning/20' },
  matched: { label: 'Terconfirmasi', color: 'bg-success/10 text-success border-success/20' },
  active: { label: 'Aktif', color: 'bg-primary/10 text-primary border-primary/20' },
  completed: { label: 'Selesai', color: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Dibatalkan', color: 'bg-destructive/10 text-destructive border-destructive/20' },
}

const STATUS_TONE: Record<string, 'primary' | 'secondary' | 'accent' | 'danger' | 'muted'> = {
  pending: 'accent',
  matched: 'secondary',
  active: 'primary',
  completed: 'muted',
  cancelled: 'danger',
}

export default function StudentMyMatches() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)
  const fetchDone = useRef(false)
  const timeoutId = useRef<NodeJS.Timeout | null>(null)

  const fetchMatches = async () => {
    if (fetchDone.current) return
    fetchDone.current = true

    setLoading(true)
    setError(null)

    try {
      console.log('[MyMatches] 🔄 Fetching matches...')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.log('[MyMatches] ⚠️ User not found')
        setMatches([])
        return
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (studentError) {
        console.error('[MyMatches] ❌ Student error:', studentError)
        throw studentError
      }

      if (!student) {
        console.log('[MyMatches] ⚠️ No student profile')
        setMatches([])
        return
      }

      const { data, error: matchError } = await supabase
        .from('matches')
        .select(`
          id,
          status,
          subject,
          start_date,
          lesson_frequency,
          student_selected_at,
          tutor_confirmed_at,
          tutors:tutor_id(
            hourly_rate,
            experience_years,
            user_profiles:user_id(name, bio)
          )
        `)
        .eq('student_id', student.id)
        .order('start_date', { ascending: false })

      if (matchError) {
        console.error('[MyMatches] ❌ Match error:', matchError)
        throw matchError
      }

      if (isMounted.current) {
        setMatches(data || [])
        console.log('[MyMatches] ✅ Matches loaded:', data?.length || 0)
      }
    } catch (err: any) {
      console.error('[MyMatches] ❌ Error:', err)
      if (isMounted.current) {
        setError(err.message || 'Gagal memuat data')
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
        console.log('[MyMatches] 🏁 Loading selesai')
      }
    }
  }

  useEffect(() => {
    isMounted.current = true

    timeoutId.current = setTimeout(() => {
      if (isMounted.current && loading) {
        console.warn('[MyMatches] ⏱️ Timeout 3 detik, force loading=false')
        setLoading(false)
        setError('Waktu pengambilan data habis, tampilkan data kosong.')
      }
    }, 3000)

    fetchMatches()

    return () => {
      isMounted.current = false
      if (timeoutId.current) clearTimeout(timeoutId.current)
    }
  }, [])

  // Helper untuk format lesson_frequency
  const formatFrequency = (frequency: string | null | undefined) => {
    if (!frequency) return '-'
    // Ubah '1-per-week' menjadi '1 Per Week' misalnya, tapi kita hanya ubah menjadi huruf kapital di awal kata
    return frequency
      .replace(/-/g, ' ') // ganti semua '-' dengan spasi
      .replace(/\b\w/g, (char) => char.toUpperCase()) // kapitalisasi setiap kata
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
        <p className="mt-3 text-sm text-muted-foreground">Memuat pengajar...</p>
      </div>
    )
  }

  if (error && matches.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="surface">
        <EmptyState
          icon={User}
          title="Anda belum memiliki pengajar. Mulai cari pengajar sekarang!"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {matches.map(match => {
        const statusConfig = STATUS_CONFIG[match.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
        const tutor = match.tutors

        return (
          <div key={match.id} className="surface hover-card overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/25 p-4 pb-3 sm:p-5 sm:pb-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold">{tutor?.user_profiles?.name || 'Tutor'}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Mata Pelajaran: {match.subject || '-'}</p>
              </div>
              <TonePill tone={STATUS_TONE[match.status] || 'muted'} className="flex-shrink-0">
                {statusConfig.label}
              </TonePill>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Frekuensi Pembelajaran</p>
                  <p className="text-sm font-medium">
                    {formatFrequency(match.lesson_frequency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal Mulai</p>
                  <p className="text-sm font-medium">
                    {match.start_date ? new Date(match.start_date).toLocaleDateString('id-ID') : '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tarif</p>
                  <p className="text-sm font-medium">
                    {tutor?.hourly_rate ? `Rp ${tutor.hourly_rate.toLocaleString()}/jam` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pengalaman</p>
                  <p className="text-sm font-medium">{tutor?.experience_years || 0} tahun</p>
                </div>
              </div>

              {tutor?.user_profiles?.bio && (
                <div className="border-t border-border/60 pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Tentang Pengajar</p>
                  <p className="text-sm text-foreground line-clamp-2">
                    {tutor.user_profiles.bio}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                {match.student_selected_at && (
                  <>
                    <span>✓ Dipilih {new Date(match.student_selected_at).toLocaleDateString('id-ID')}</span>
                  </>
                )}
                {match.tutor_confirmed_at && (
                  <>
                    <span>•</span>
                    <span>✓ Dikonfirmasi {new Date(match.tutor_confirmed_at).toLocaleDateString('id-ID')}</span>
                  </>
                )}
              </div>

              {match.status === 'matched' && (
                <div className="rounded-xl border border-success/20 bg-success/10 p-2 text-center">
                  <p className="text-sm font-medium text-success">
                    🎉 Pengajar telah mengkonfirmasi! Silakan hubungi untuk jadwal pembelajaran
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}