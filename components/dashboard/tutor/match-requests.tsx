'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { createClient } from '@/lib/auth'

export default function TutorMatchRequests() {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('Sesi tidak ditemukan. Silakan muat ulang halaman.')
        return
      }

      const response = await fetch('/api/matches', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Gagal memuat permintaan')
      }

      const data = await response.json()
      const pendingMatches = data.filter((m: any) => m.status === 'pending')
      setMatches(pendingMatches)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat permintaan')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmMatch = async (matchId: string, action: 'confirm' | 'reject') => {
    setConfirmingId(matchId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        alert('Sesi tidak ditemukan. Silakan muat ulang halaman.')
        return
      }

      const response = await fetch(`/api/matches/${matchId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        throw new Error(`Gagal ${action === 'confirm' ? 'menerima' : 'menolak'} permintaan`)
      }

      setShowConfirmDialog(false)
      setSelectedMatch(null)
      await fetchMatches()

      if (action === 'confirm') {
        alert('Anda telah mengkonfirmasi pencocokan! Simbol ✓ akan muncul di dashboard siswa.')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setConfirmingId(null)
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
            Belum ada permintaan dari siswa saat ini
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800">
          Anda memiliki {matches.length} permintaan baru dari siswa. Terima atau tolak permintaan untuk melanjutkan.
        </AlertDescription>
      </Alert>

      {matches.map(match => {
        const student = match.students

        return (
          <Card key={match.id} className="overflow-hidden border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{student?.users_profile?.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Mata Pelajaran: <span className="font-medium">{match.subject}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tingkat: {student?.grade_level}
                  </p>
                </div>
                <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                  ⏳ Menunggu Konfirmasi
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Frekuensi yang Diinginkan</p>
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

              {student?.users_profile?.email && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Email Siswa</p>
                    <p className="text-sm font-medium">{student.users_profile.email}</p>
                  </div>
                  {student?.users_profile?.phone && (
                    <div>
                      <p className="text-xs text-muted-foreground">Telepon</p>
                      <p className="text-sm font-medium">{student.users_profile.phone}</p>
                    </div>
                  )}
                </div>
              )}

              {student?.learning_goals && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Tujuan Pembelajaran Siswa</p>
                  <p className="text-sm text-foreground line-clamp-2">
                    {student.learning_goals}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={confirmingId === match.id}
                  onClick={() => {
                    setSelectedMatch(match)
                    setShowConfirmDialog(true)
                  }}
                >
                  Tolak
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={confirmingId === match.id}
                  onClick={() => handleConfirmMatch(match.id, 'confirm')}
                >
                  {confirmingId === match.id ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Loading...
                    </>
                  ) : (
                    '✓ Terima'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Reject Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Permintaan Siswa</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menolak permintaan dari{' '}
              <span className="font-medium">
                {selectedMatch?.students?.users_profile?.full_name}
              </span>{' '}
              untuk mata pelajaran <span className="font-medium">{selectedMatch?.subject}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowConfirmDialog(false)
                setSelectedMatch(null)
              }}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={confirmingId === selectedMatch?.id}
              onClick={() => handleConfirmMatch(selectedMatch?.id, 'reject')}
            >
              {confirmingId === selectedMatch?.id ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Loading...
                </>
              ) : (
                'Ya, Tolak'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

