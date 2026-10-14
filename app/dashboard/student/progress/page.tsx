'use client'

import { useState, useEffect, useRef } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/auth'
import { BookOpen, TrendingUp, Users, Calendar } from 'lucide-react'
import { PageHeader, StatCard, SectionCard, EmptyState, TonePill } from '@/components/dashboard/ui'

export default function StudentProgressPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const isMounted = useRef(true)
  const fetchDone = useRef(false)
  const timeoutId = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (fetchDone.current) return
    fetchDone.current = true
    isMounted.current = true

    // ⏱️ TIMEOUT 3 DETIK - PASTIKAN LOADING BERHENTI
    timeoutId.current = setTimeout(() => {
      if (isMounted.current && loading) {
        console.warn('[Progress] ⏱️ Timeout 3 detik, force loading=false')
        setLoading(false)
        setError('Waktu pengambilan data habis, tampilkan data kosong.')
      }
    }, 3000)

    const fetchData = async () => {
      try {
        console.log('[Progress] 🔄 Fetching data...')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          console.log('[Progress] ⚠️ User not found')
          setProfile(null)
          setMatches([])
          return
        }

        // ✅ Pakai maybeSingle() biar tidak error jika belum ada profil
        const { data: profileData, error: profileError } = await supabase
          .from('students')
          .select(`
            id,
            grade_level,
            subjects,
            learning_goals,
            status,
            user_profiles:user_id(name, email)
          `)
          .eq('user_id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('[Progress] ❌ Profile error:', profileError)
          throw profileError
        }

        if (!profileData) {
          console.log('[Progress] ⚠️ No student profile yet')
          setProfile(null)
          setMatches([])
          return
        }

        setProfile(profileData)

        // Ambil matches jika ada student id
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select(`
            id,
            status,
            subject,
            start_date,
            lesson_frequency,
            tutors:tutor_id(
              experience_years,
              rating,
              user_profiles:user_id(name)
            )
          `)
          .eq('student_id', profileData.id)
          .order('start_date', { ascending: false })

        if (matchError) {
          console.error('[Progress] ❌ Match error:', matchError)
          throw matchError
        }

        if (isMounted.current) {
          setMatches(matchData || [])
          setError(null)
          console.log('[Progress] ✅ Data loaded:', matchData?.length || 0, 'matches')
        }
      } catch (err) {
        console.error('[Progress] ❌ Fetch error:', err)
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Gagal memuat data')
          // Set data kosong agar UI tetap tampil
          setProfile(null)
          setMatches([])
        }
      } finally {
        if (isMounted.current) {
          setLoading(false)
          console.log('[Progress] 🏁 Loading selesai')
        }
      }
    }

    fetchData()

    return () => {
      isMounted.current = false
      if (timeoutId.current) clearTimeout(timeoutId.current)
    }
  }, [])

  // RENDER LOADING
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner className="h-10 w-10 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat progres belajar...</p>
      </div>
    )
  }

  // Hitung statistik (aman meskipun data null)
  const activeMatches = (matches || []).filter(m => ['matched', 'active'].includes(m.status))
  const completedMatches = (matches || []).filter(m => m.status === 'completed')
  const pendingMatches = (matches || []).filter(m => m.status === 'pending')
  const totalMatches = (matches || []).length
  const completionRate = totalMatches > 0 ? Math.round((completedMatches.length / totalMatches) * 100) : 0
  const subjects = profile?.subjects || []

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Progres"
        title="Progres Belajar"
        description="Pantau perkembangan belajar dan histori sesi Anda."
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <StatCard label="Pengajar Aktif" value={activeMatches.length} icon={Users} tone="primary" />
        <StatCard label="Sesi Selesai" value={completedMatches.length} icon={TrendingUp} tone="secondary" />
        <StatCard label="Menunggu Konfirmasi" value={pendingMatches.length} icon={Calendar} tone="accent" />
        <StatCard label="Total Pencocokan" value={totalMatches} icon={BookOpen} tone="muted" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Completion Rate */}
        <SectionCard title="Tingkat Penyelesaian">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sesi selesai vs total</span>
              <span className="font-medium">{completedMatches.length}/{totalMatches}</span>
            </div>
            <Progress value={completionRate} className="h-3" />
            <p className="text-sm text-muted-foreground">{completionRate}% sesi berhasil diselesaikan</p>
          </div>
        </SectionCard>

        {/* Subjects */}
        <SectionCard title="Mata Pelajaran">
          <div>
            {subjects.length === 0 ? (
              <EmptyState title="Belum ada mata pelajaran terdaftar" className="py-6" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject: string) => (
                  <TonePill key={subject} tone="secondary">
                    {subject}
                  </TonePill>
                ))}
              </div>
            )}
            {profile?.grade_level && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <p className="text-sm text-muted-foreground">Tingkat Kelas</p>
                <p className="text-sm font-medium mt-1">{profile.grade_level}</p>
              </div>
            )}
            {profile?.learning_goals && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <p className="text-sm text-muted-foreground">Tujuan Belajar</p>
                <p className="text-sm mt-1">{profile.learning_goals}</p>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Match History */}
      <SectionCard title="Histori Pencocokan">
        <div>
          {matches.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Belum ada histori pencocokan"
              description="Mulai cari pengajar sekarang!"
            />
          ) : (
            <div className="space-y-3">
              {matches.map(match => {
                const statusMap: Record<string, { label: string; tone: 'primary' | 'secondary' | 'accent' | 'danger' | 'muted' }> = {
                  pending: { label: 'Menunggu', tone: 'accent' },
                  matched: { label: 'Dikonfirmasi', tone: 'secondary' },
                  active: { label: 'Aktif', tone: 'primary' },
                  completed: { label: 'Selesai', tone: 'muted' },
                  cancelled: { label: 'Dibatalkan', tone: 'danger' },
                }
                const status = statusMap[match.status] || { label: match.status, tone: 'muted' as const }

                return (
                  <div
                    key={match.id}
                    className="surface hover-card flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">{match.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        Pengajar: {match.tutors?.user_profiles?.name || '-'}
                      </p>
                      {match.start_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Mulai: {new Date(match.start_date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                    <TonePill tone={status.tone}>
                      {status.label}
                    </TonePill>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}