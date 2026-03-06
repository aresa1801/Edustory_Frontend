'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/auth'

export default function AdminTutorCuration() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('Anda harus login terlebih dahulu')
        return
      }

      const response = await fetch('/api/admin/tutor-applications', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Gagal memuat aplikasi')
      }

      const data = await response.json()
      // Filter only pending applications
      const pendingApps = data.filter((app: any) => app.status === 'pending')
      setApplications(pendingApps)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat aplikasi')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (applicationId: string) => {
    setProcessingId(applicationId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        alert('Anda harus login terlebih dahulu')
        return
      }

      const response = await fetch('/api/admin/tutor-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          applicationId,
          status: 'approved',
        }),
      })

      if (!response.ok) {
        throw new Error('Gagal menyetujui aplikasi')
      }

      alert('Pengajar telah disetujui!')
      await fetchApplications()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectClick = (app: any) => {
    setSelectedApp(app)
    setShowRejectionDialog(true)
  }

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      alert('Berikan alasan penolakan')
      return
    }

    setProcessingId(selectedApp.id)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        alert('Anda harus login terlebih dahulu')
        return
      }

      const response = await fetch('/api/admin/tutor-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          applicationId: selectedApp.id,
          status: 'rejected',
          rejectionReason,
        }),
      })

      if (!response.ok) {
        throw new Error('Gagal menolak aplikasi')
      }

      alert('Aplikasi ditolak dan pengajar akan diberitahu')
      setShowRejectionDialog(false)
      setRejectionReason('')
      setSelectedApp(null)
      await fetchApplications()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setProcessingId(null)
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

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Tidak ada aplikasi pengajar yang menunggu verifikasi
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800">
          Ada {applications.length} aplikasi pengajar yang menunggu verifikasi. Pastikan untuk memeriksa kualifikasi dan latar belakang mereka.
        </AlertDescription>
      </Alert>

      {applications.map(app => {
        const tutor = app.tutors
        const user = tutor?.users_profile

        return (
          <Card key={app.id} className="overflow-hidden border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{user?.full_name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Email: <span className="font-medium">{user?.email}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Telepon: <span className="font-medium">{user?.phone}</span>
                  </p>
                </div>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  Dalam Review
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Pengalaman</p>
                  <p className="text-sm font-medium">{tutor?.experience_years} tahun</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tarif Per Jam</p>
                  <p className="text-sm font-medium">Rp {tutor?.hourly_rate?.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Spesialisasi</p>
                <div className="flex flex-wrap gap-2">
                  {tutor?.specializations?.map((spec: string) => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Latar Belakang Pendidikan</p>
                  <p className="text-sm text-foreground">{app.education_background}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mengapa Mereka Ingin Mengajar</p>
                  <p className="text-sm text-foreground">{app.why_teach}</p>
                </div>

                {app.tutor_references && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Referensi</p>
                    <p className="text-sm text-foreground">{app.tutor_references}</p>
                  </div>
                )}

                {tutor?.qualifications && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Kualifikasi Tambahan</p>
                    <p className="text-sm text-foreground">{tutor.qualifications}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={processingId === app.id}
                  onClick={() => handleRejectClick(app)}
                >
                  Tolak
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={processingId === app.id}
                  onClick={() => handleApprove(app.id)}
                >
                  {processingId === app.id ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Loading...
                    </>
                  ) : (
                    '✓ Setujui'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Aplikasi Pengajar</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan untuk {selectedApp?.tutors?.users_profile?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Alasan Penolakan</Label>
              <textarea
                id="reason"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm"
                rows={4}
                placeholder="Jelaskan mengapa aplikasi ini ditolak..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectionDialog(false)
                  setRejectionReason('')
                  setSelectedApp(null)
                }}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectSubmit}
                disabled={processingId === selectedApp?.id}
                className="flex-1"
              >
                {processingId === selectedApp?.id ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Loading...
                  </>
                ) : (
                  'Tolak Aplikasi'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
