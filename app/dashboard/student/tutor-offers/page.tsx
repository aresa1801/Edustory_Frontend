'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/auth'
import {
  DollarSign,
  Star,
  Award,
  BookOpen,
  Clock,
  CheckCircle,
  Trash2,
  RefreshCw,
  User,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth-context'

interface TutorOffer {
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
  // statis tutor
  tutor_full_name: string
  tutor_bio: string
  tutor_experience_years: number
  tutor_hourly_rate: number
  tutor_rating: number
  tutor_total_reviews: number
  tutor_verified_grade_levels: string[]
}

export default function TutorOffersPage() {
  const { user, loading: authLoading } = useAuth()
  const [offers, setOffers] = useState<TutorOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<TutorOffer | null>(null)
  const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null)

  const isMounted = useRef(true)

  const fetchOffers = async () => {
    if (!user) return
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      // Ambil student_id
      const { data: studentData, error: studentErr } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (studentErr || !studentData) {
        throw new Error('Data siswa tidak ditemukan')
      }

      const studentId = studentData.id

      // Ambil token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      const res = await fetch(`/api/matches?student_id=${studentId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) throw new Error('Gagal mengambil penawaran')
      const data = await res.json()

      // Filter hanya yang initiated_by tutor
      const tutorOffers = data.filter((m: any) => m.initiated_by === 'tutor')
      if (isMounted.current) {
        setOffers(tutorOffers)
        setError(null)
      }
    } catch (err: any) {
      if (isMounted.current) setError(err.message || 'Terjadi kesalahan')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    fetchOffers()
    return () => { isMounted.current = false }
  }, [user?.id, authLoading])

  const handleAction = async (offerId: string, action: 'accept' | 'reject') => {
    setProcessingId(offerId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      const res = await fetch(`/api/matches/${offerId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Gagal memperbarui status')

      await fetchOffers()
      alert(action === 'accept' ? '✅ Penawaran diterima!' : '✅ Penawaran ditolak.')
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setProcessingId(null)
      setShowConfirmDialog(false)
      setSelectedOffer(null)
      setActionType(null)
    }
  }

  const openConfirmDialog = (offer: TutorOffer, action: 'accept' | 'reject') => {
    setSelectedOffer(offer)
    setActionType(action)
    setShowConfirmDialog(true)
  }

  const handleRefresh = () => {
    if (!isMounted.current) return
    fetchOffers()
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="ml-3">Memuat penawaran...</p>
      </div>
    )
  }

  if (error) {
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

      {/* Stats */}
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

      {offers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Belum ada penawaran dari tutor.</p>
          </CardContent>
        </Card>
      )}

      {/* Pending Offers */}
      {pendingOffers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Menunggu Keputusan Anda</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pendingOffers.map(offer => (
              <OfferCard
                key={offer.id}
                offer={offer}
                processing={processingId === offer.id}
                onAccept={() => openConfirmDialog(offer, 'accept')}
                onReject={() => openConfirmDialog(offer, 'reject')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Decided Offers */}
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
              />
            ))}
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'accept' ? 'Setuju Penawaran' : 'Tolak Penawaran'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'accept'
                ? 'Anda akan menyetujui penawaran dari '
                : 'Anda akan menolak penawaran dari '}
              <strong>{selectedOffer?.tutor_full_name}</strong>.
              {actionType === 'accept' && ' Setelah disetujui, Anda dapat mengatur jadwal.'}
              <br /><br />
              Apakah Anda yakin?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Batal
            </Button>
            <Button
              variant={actionType === 'accept' ? 'default' : 'destructive'}
              onClick={() => {
                if (selectedOffer && actionType) {
                  handleAction(selectedOffer.id, actionType)
                }
              }}
              disabled={processingId !== null}
            >
              {processingId ? <Spinner className="h-4 w-4" /> : (actionType === 'accept' ? 'Ya, Setuju' : 'Ya, Tolak')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ====================================================================
// KOMPONEN CARD
// ====================================================================
function OfferCard({
  offer,
  processing,
  onAccept,
  onReject,
  readonly = false,
}: {
  offer: TutorOffer
  processing: boolean
  onAccept?: () => void
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
        {/* Tombol trash (hanya untuk pending) */}
        {!readonly && offer.status === 'pending' && (
          <button
            className="absolute top-3 right-3 text-gray-400 hover:text-red-600 transition-colors"
            onClick={onReject}
            disabled={processing}
            title="Tolak penawaran"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}

        {/* Header: Avatar (inisial) + Nama + Status */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {offer.tutor_full_name?.charAt(0).toUpperCase() || '?'}
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

        {/* Detail Tutor */}
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
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-orange-500 mt-0.5" />
            <span>Frekuensi: {offer.lesson_frequency || 'flexible'}</span>
          </div>
        </div>

        {/* Tombol Aksi (hanya untuk pending) */}
        {!readonly && offer.status === 'pending' && (
          <div className="mt-4">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white gap-1.5"
              onClick={onAccept}
              disabled={processing}
            >
              {processing ? <Spinner className="h-3.5 w-3.5" /> : <CheckCircle className="w-4 h-4" />}
              Setuju & Atur Jadwal
            </Button>
          </div>
        )}

        {/* Jika sudah matched, tampilkan pesan dan tombol "Atur Jadwal" (disabled) */}
        {offer.status === 'matched' && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
            <p className="text-xs font-medium text-green-700">
              ✓ Penawaran telah disetujui. Silakan atur jadwal dengan tutor.
            </p>
            <Button size="sm" variant="outline" className="mt-2 border-green-300 text-green-700 hover:bg-green-100 text-xs h-8" disabled>
              Atur Jadwal (belum aktif)
            </Button>
          </div>
        )}
        {offer.status === 'cancelled' && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
            ✗ Penawaran ditolak.
          </div>
        )}
      </CardContent>
    </Card>
  )
}