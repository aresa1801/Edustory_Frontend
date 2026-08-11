'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/lib/auth-context'
import {
  DollarSign,
  Star,
  Award,
  BookOpen,
  RefreshCw,
  User,
  Calendar,
  XCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Match {
  id: string
  tutor_id: string
  student_id: string
  subject: string
  matched_subjects: string[]
  status: 'pending' | 'matched' | 'active' | 'completed' | 'cancelled'
  initiated_by: 'student' | 'tutor'
  lesson_frequency: string
  start_date: string
  created_at: string
  tutor_full_name: string
  tutor_bio: string
  tutor_experience_years: number
  tutor_hourly_rate: number
  tutor_rating: number
  tutor_total_reviews: number
  tutor_verified_grade_levels: string[]
  tutor_avatar_url?: string | null
}

export default function TutorOffersPage() {
  const { user, loading: authLoading } = useAuth()
  const [offers, setOffers] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<Match | null>(null)
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null)

  const isMounted = useRef(true)
  const fetchDone = useRef(false)

  const fetchData = async () => {
    if (!user) return
    if (fetchDone.current) return
    fetchDone.current = true

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/students/my-matches?user_id=${user.id}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Gagal mengambil penawaran')
      }
      const data = await res.json()
      if (isMounted.current) {
        setOffers(data)
        setError(null)
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message || 'Terjadi kesalahan')
        setOffers([])
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    isMounted.current = true
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    fetchData()
    return () => { isMounted.current = false }
  }, [user?.id, authLoading])

  const handleRefresh = () => {
    if (!isMounted.current) return
    fetchDone.current = false
    fetchData()
  }

  // ========== PERBAIKAN UTAMA ==========
  const handleSchedule = async (offer: Match) => {
  console.log('>>> [handleSchedule] START, offer.id =', offer.id)
  setProcessingId(offer.id)

  try {
    if (offer.status === 'pending') {
      console.log('>>> [handleSchedule] accepting offer...')
      const { createClient } = await import('@/lib/auth')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      const res = await fetch(`/api/matches/${offer.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      })

      console.log('>>> [handleSchedule] fetch response status:', res.status)
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Gagal menyetujui (${res.status}): ${errText}`)
      }
      console.log('>>> [handleSchedule] accept success')
    }

    const redirectUrl = `/dashboard/student/set_schedule?matchId=${offer.id}`
    console.log('>>> [handleSchedule] redirecting to:', redirectUrl)

    // GUNAKAN INI:
    window.location.href = redirectUrl
    console.log('>>> [handleSchedule] after window.location.href (should not appear)')
  } catch (err: any) {
    console.error('>>> [handleSchedule] ERROR:', err)
    alert('❌ ' + err.message)
    setProcessingId(null)
  }
}

  // ========== AKHIR PERBAIKAN ==========

  const handleReject = async (offerId: string) => {
    setProcessingId(offerId)
    try {
      const { createClient } = await import('@/lib/auth')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      const res = await fetch(`/api/matches/${offerId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reject' }),
      })
      if (!res.ok) throw new Error('Gagal menolak penawaran')

      fetchDone.current = false
      await fetchData()
      alert('✅ Penawaran ditolak.')
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setProcessingId(null)
      setShowConfirmDialog(false)
      setSelectedOffer(null)
      setActionType(null)
    }
  }

  const openConfirmDialog = (offer: Match, action: 'accept' | 'reject') => {
    setSelectedOffer(offer)
    setActionType(action)
    setShowConfirmDialog(true)
  }

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="mt-3 text-sm text-muted-foreground">Memuat penawaran...</p>
      </div>
    )
  }

  if (error && offers.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>❌ {error}</AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} className="mt-4">Refresh</Button>
      </div>
    )
  }

  const pendingOffers = offers.filter(o => o.status === 'pending')
  const decidedOffers = offers.filter(o => ['matched', 'active', 'completed', 'cancelled'].includes(o.status))

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Penawaran Tutor</h1>
          <p className="text-muted-foreground">Lihat dan kelola penawaran dari tutor.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Menunggu Keputusan</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingOffers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Sudah Diputuskan</p>
          <p className="text-2xl font-bold text-green-600">{decidedOffers.length}</p>
        </Card>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Belum ada penawaran dari tutor.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {pendingOffers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Menunggu Keputusan Anda</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {pendingOffers.map(offer => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    processing={processingId === offer.id}
                    onSchedule={() => handleSchedule(offer)}
                    onReject={() => openConfirmDialog(offer, 'reject')}
                  />
                ))}
              </div>
            </div>
          )}

          {decidedOffers.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Riwayat</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {decidedOffers.map(offer => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    processing={false}
                    readonly
                    onSchedule={
                      offer.status === 'matched' || offer.status === 'active'
                        ? () => handleSchedule(offer)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Penawaran</DialogTitle>
            <DialogDescription>
              Anda akan menolak penawaran dari{' '}
              <strong>{selectedOffer?.tutor_full_name}</strong>.
              <br /><br />
              Apakah Anda yakin?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedOffer) {
                  handleReject(selectedOffer.id)
                }
              }}
              disabled={processingId !== null}
            >
              {processingId ? <Spinner className="h-4 w-4" /> : 'Ya, Tolak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== KOMPONEN OfferCard (tetap sama) ==========
function OfferCard({
  offer,
  processing,
  onSchedule,
  onReject,
  readonly = false,
}: {
  offer: Match
  processing: boolean
  onSchedule?: () => void
  onReject?: () => void
  readonly?: boolean
}) {
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: 'Menunggu', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30' },
    matched: { label: 'Disetujui', color: 'bg-green-500/20 text-green-700 border-green-500/30' },
    active: { label: 'Aktif', color: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
    completed: { label: 'Selesai', color: 'bg-slate-500/20 text-slate-700 border-slate-500/30' },
    cancelled: { label: 'Ditolak', color: 'bg-red-500/20 text-red-700 border-red-500/30' },
  }
  const status = statusMap[offer.status] || { label: offer.status, color: 'bg-gray-200' }

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow relative">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
            {offer.tutor_avatar_url ? (
              <img src={offer.tutor_avatar_url} alt={offer.tutor_full_name} className="w-full h-full object-cover" />
            ) : (
              offer.tutor_full_name?.charAt(0).toUpperCase() || '?'
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{offer.tutor_full_name || 'Tutor'}</h3>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {offer.tutor_verified_grade_levels?.map((grade, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                  {grade}
                </Badge>
              ))}
            </div>
          </div>
          <Badge className={`${status.color} text-xs border`}>
            {status.label}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="font-medium">Rp {offer.tutor_hourly_rate?.toLocaleString('id-ID') || 0}/jam</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>{offer.tutor_rating || 0} ({offer.tutor_total_reviews || 0} ulasan)</span>
          </div>
          <div className="flex items-start gap-2">
            <Award className="w-4 h-4 text-blue-500 mt-0.5" />
            <span>{offer.tutor_experience_years || 0} tahun pengalaman</span>
          </div>
          {offer.tutor_bio && (
            <div className="flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-purple-500 mt-0.5" />
              <span className="text-muted-foreground line-clamp-2">{offer.tutor_bio}</span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500 mt-0.5" />
            <span>
              <span className="font-medium">Mapel:</span> {offer.matched_subjects?.join(', ') || offer.subject}
            </span>
          </div>
        </div>

        {!readonly && offer.status === 'pending' && (
          <div className="mt-4 flex gap-2">
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              onClick={() => {
                console.log('>>> [Tombol] diklik untuk offer:', offer.id)
                if (onSchedule) {
                  console.log('>>> [Tombol] memanggil onSchedule')
                  onSchedule()
                } else {
                  alert('onSchedule tidak tersedia!')
                }
              }}
              disabled={processing}
            >
              <Calendar className="w-4 h-4" />
              Setuju & Atur Jadwal
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-1.5"
              onClick={() => {
                if (onReject) onReject()
              }}
              disabled={processing}
            >
              <XCircle className="w-4 h-4" />
              Tolak
            </Button>
          </div>
        )}

        {offer.status === 'matched' && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded p-3 space-y-2">
            <p className="text-xs font-medium text-green-700">✓ Penawaran telah disetujui. Atur jadwal belajar sekarang.</p>
            <Button
              size="sm"
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-100 text-xs h-8"
              onClick={() => {
                if (onSchedule) onSchedule()
              }}
              disabled={!onSchedule || processing}
            >
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Atur Jadwal
            </Button>
          </div>
        )}

        {offer.status === 'cancelled' && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
            ✗ Penawaran ditolak.
          </div>
        )}

        {offer.status === 'active' && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
            <p className="text-xs font-medium text-blue-700">✓ Pembelajaran sedang aktif.</p>
            <Button
              size="sm"
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100 text-xs h-8"
              onClick={() => {
                if (onSchedule) onSchedule()
              }}
              disabled={!onSchedule || processing}
            >
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Atur Jadwal
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}