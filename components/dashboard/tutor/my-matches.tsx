'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/auth'

const STATUS_CONFIG = {
  pending: { label: 'Menunggu', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  matched: { label: '✓ Dikonfirmasi', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  active: { label: 'Aktif Mengajar', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Selesai', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
}

export default function TutorMyMatches() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchedRef = useRef(false)
  const isMounted = useRef(true)

  const fetchMatches = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        if (isMounted.current) setError('Sesi tidak ditemukan. Silakan muat ulang halaman.')
        return
      }

      const response = await fetch('/api/matches', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Gagal memuat pencocokan')
      }

      const data = await response.json()
      const confirmedMatches = data.filter((m: any) => ['matched', 'active', 'completed'].includes(m.status))
      if (isMounted.current) {
        setMatches(confirmedMatches)
        setError(null)
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Gagal memuat pencocokan')
      }
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    fetchMatches()

    return () => {
      isMounted.current = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Anda belum memiliki pencocokan yang dikonfirmasi
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {matches.map(match => {
        const statusConfig = STATUS_CONFIG[match.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
        const student = match.students

        return (
          <Card key={match.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{student?.users_profile?.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Mata Pelajaran: {match.subject}</p>
                  <p className="text-sm text-muted-foreground">Tingkat: {student?.grade_level}</p>
                </div>
                <Badge variant="outline" className={`${statusConfig.color} border`}>
                  {statusConfig.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Frekuensi Pembelajaran</p>
                  <p className="text-sm font-medium">
                    {match.lesson_frequency?.replace('-', ' ').replace(/^./, (m: string) => m.toUpperCase())}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal Mulai</p>
                  <p className="text-sm font-medium">
                    {new Date(match.start_date).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Kontak Siswa</p>
                  <p className="text-sm font-medium">{student?.users_profile?.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email Siswa</p>
                  <p className="text-sm font-medium">{student?.users_profile?.email || '-'}</p>
                </div>
              </div>

              {student?.learning_goals && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Tujuan Pembelajaran</p>
                  <p className="text-sm text-foreground line-clamp-2">
                    {student.learning_goals}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                {match.tutor_confirmed_at && (
                  <span>✓ Dikonfirmasi {new Date(match.tutor_confirmed_at).toLocaleDateString('id-ID')}</span>
                )}
              </div>

              {match.status === 'matched' && (
                <div className="bg-green-50 border border-green-200 rounded p-3 space-y-2">
                  <p className="text-sm font-medium text-green-300">
                    Pencocokan dikonfirmasi! Hubungi siswa untuk mengatur jadwal pembelajaran.
                  </p>
                  {student?.users_profile?.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-300 text-green-300 hover:bg-green-100"
                      onClick={() =>
                        window.open(
                          `https://wa.me/${student.users_profile.phone.replace(/\D/g, '')}`,
                          '_blank'
                        )
                      }
                    >
                      💬 Hubungi via WhatsApp
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}