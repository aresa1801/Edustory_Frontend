'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/auth'

const STATUS_CONFIG = {
  pending: { label: 'Menunggu Konfirmasi', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  matched: { label: 'Terconfirmasi', color: 'bg-green-50 text-green-700 border-green-200' },
  active: { label: 'Aktif', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Selesai', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-50 text-red-700 border-red-200' },
}

export default function StudentMyMatches() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('Anda harus login terlebih dahulu')
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
      setMatches(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pencocokan')
    } finally {
      setLoading(false)
    }
  }

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
            Anda belum memiliki pencocokan. Mulai cari pengajar sekarang!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {matches.map(match => {
        const statusConfig = STATUS_CONFIG[match.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
        const tutor = match.tutors

        return (
          <Card key={match.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{tutor?.users_profile?.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Mata Pelajaran: {match.subject}</p>
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
                    {match.lesson_frequency?.replace('-', ' ').replace(/^./, m => m.toUpperCase())}
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
                  <p className="text-xs text-muted-foreground">Tarif</p>
                  <p className="text-sm font-medium">
                    Rp {tutor?.hourly_rate?.toLocaleString()}/jam
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pengalaman</p>
                  <p className="text-sm font-medium">{tutor?.experience_years} tahun</p>
                </div>
              </div>

              {tutor?.users_profile?.bio && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Tentang Pengajar</p>
                  <p className="text-sm text-foreground line-clamp-2">
                    {tutor.users_profile.bio}
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
                <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
                  <p className="text-sm font-medium text-green-700">
                    🎉 Pengajar telah mengkonfirmasi! Silakan hubungi untuk jadwal pembelajaran
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
