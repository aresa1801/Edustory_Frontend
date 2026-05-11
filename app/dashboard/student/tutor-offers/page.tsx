'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { createClient } from '@/lib/auth'
import {
  Star, BookOpen, Clock, GraduationCap, User, CheckCircle, X,
  Award, MapPin, MessageCircle
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  accepted: 'bg-green-500/20 text-green-300 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu Keputusan',
  accepted: 'Diterima',
  rejected: 'Ditolak',
}

interface TutorOffer {
  id: string
  status: string
  subject: string
  created_at: string
  tutor: {
    id: string
    hourly_rate: number
    experience_years: number
    rating: number
    total_reviews: number
    specializations: string[]
    verified: boolean
    city?: string
    bio?: string
    name: string
    gender: string
  }
}

export default function TutorOffersPage() {
  const [offers, setOffers] = useState<TutorOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOffer, setSelectedOffer] = useState<TutorOffer | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const fetchOffers = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!studentData) {
        setError('Profil siswa tidak ditemukan. Harap lengkapi profil terlebih dahulu.')
        return
      }

      const { data: matchData, error: matchErr } = await supabase
        .from('matches')
        .select(`
          id,
          status,
          subject,
          created_at,
          tutors:tutor_id(
            id,
            hourly_rate,
            experience_years,
            rating,
            total_reviews,
            specializations,
            verified,
            user_profiles:user_id(name, gender, bio)
          )
        `)
        .eq('student_id', studentData.id)
        .eq('initiated_by', 'tutor')
        .order('created_at', { ascending: false })

      if (matchErr) throw matchErr

      const formatted: TutorOffer[] = (matchData || []).map((m: any) => ({
        id: m.id,
        status: m.status,
        subject: m.subject,
        created_at: m.created_at,
        tutor: {
          id: m.tutors?.id,
          hourly_rate: m.tutors?.hourly_rate || 0,
          experience_years: m.tutors?.experience_years || 0,
          rating: m.tutors?.rating || 0,
          total_reviews: m.tutors?.total_reviews || 0,
          specializations: m.tutors?.specializations || [],
          verified: m.tutors?.verified || false,
          bio: m.tutors?.user_profiles?.bio || '',
          name: m.tutors?.user_profiles?.name || 'Tutor',
          gender: m.tutors?.user_profiles?.gender || '',
        },
      }))

      setOffers(formatted)
      setError(null)
    } catch (err) {
      console.error('Failed to load tutor offers:', err)
      // Show empty state instead of blocking the page with an error
      setOffers([])
      setError('Gagal memuat penawaran. Coba muat ulang halaman.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOffers() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = async (offerId: string, action: 'accept' | 'reject') => {
    setActionLoading(offerId)
    try {
      const supabase = createClient()
      const { error: updateErr } = await supabase
        .from('matches')
        .update({ status: action === 'accept' ? 'matched' : 'cancelled' })
        .eq('id', offerId)

      if (updateErr) throw updateErr
      setShowDetail(false)
      setSelectedOffer(null)
      await fetchOffers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const pendingOffers = offers.filter(o => o.status === 'pending')
  const decidedOffers = offers.filter(o => ['matched', 'accepted', 'rejected', 'cancelled'].includes(o.status))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Penawaran Tutor</h1>
        <p className="text-muted-foreground">
          Tutor yang menawarkan diri untuk mengajar Anda. Tinjau profil dan pilih yang paling sesuai.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Penawaran</p>
          <p className="text-2xl font-bold text-foreground">{offers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Menunggu Keputusan</p>
          <p className="text-2xl font-bold text-yellow-300">{pendingOffers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Sudah Diputuskan</p>
          <p className="text-2xl font-bold text-green-300">{decidedOffers.length}</p>
        </Card>
      </div>

      {pendingOffers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            Menunggu Keputusan Anda ({pendingOffers.length})
          </h2>
          <div className="space-y-4">
            {pendingOffers.map(offer => (
              <TutorOfferCard
                key={offer.id}
                offer={offer}
                onView={() => { setSelectedOffer(offer); setShowDetail(true) }}
                onAccept={() => handleAction(offer.id, 'accept')}
                onReject={() => handleAction(offer.id, 'reject')}
                actionLoading={actionLoading === offer.id}
              />
            ))}
          </div>
        </div>
      )}

      {decidedOffers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            Riwayat Penawaran
          </h2>
          <div className="space-y-3">
            {decidedOffers.map(offer => (
              <TutorOfferCard
                key={offer.id}
                offer={offer}
                onView={() => { setSelectedOffer(offer); setShowDetail(true) }}
                actionLoading={false}
              />
            ))}
          </div>
        </div>
      )}

      {offers.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Belum Ada Penawaran Tutor</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Tutor yang sesuai dengan kebutuhan belajar Anda akan muncul di sini setelah deposit Anda dikonfirmasi.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Profil Tutor</DialogTitle>
            <DialogDescription>Tinjau profil lengkap tutor sebelum membuat keputusan</DialogDescription>
          </DialogHeader>
          {selectedOffer && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
                  {selectedOffer.tutor.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground text-lg">{selectedOffer.tutor.name}</h3>
                    {selectedOffer.tutor.verified && (
                      <Badge className="bg-green-500 text-white text-xs">✓ Terverifikasi</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedOffer.tutor.gender === 'male' ? 'Laki-laki' : selectedOffer.tutor.gender === 'female' ? 'Perempuan' : ''}
                  </p>
                  {selectedOffer.tutor.rating > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold">{selectedOffer.tutor.rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({selectedOffer.tutor.total_reviews} ulasan)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Pengalaman</p>
                  <p className="font-semibold text-foreground">{selectedOffer.tutor.experience_years} tahun</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Tarif/Jam</p>
                  <p className="font-semibold text-foreground">
                    Rp {selectedOffer.tutor.hourly_rate.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {selectedOffer.tutor.specializations?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Spesialisasi</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOffer.tutor.specializations.map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedOffer.tutor.bio && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tentang Tutor</p>
                  <p className="text-sm text-foreground leading-relaxed">{selectedOffer.tutor.bio}</p>
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-800">Mata Pelajaran yang Ditawarkan</p>
                <p className="text-sm text-blue-700 font-medium mt-0.5">{selectedOffer.subject}</p>
              </div>

              {selectedOffer.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-500/30 text-red-300 hover:bg-red-500/10"
                    disabled={actionLoading === selectedOffer.id}
                    onClick={() => handleAction(selectedOffer.id, 'reject')}
                  >
                    <X className="w-4 h-4 mr-1" /> Tolak
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={actionLoading === selectedOffer.id}
                    onClick={() => handleAction(selectedOffer.id, 'accept')}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Terima Tutor Ini
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TutorOfferCard({
  offer, onView, onAccept, onReject, actionLoading,
}: {
  offer: TutorOffer
  onView: () => void
  onAccept?: () => void
  onReject?: () => void
  actionLoading: boolean
}) {
  const statusColor = STATUS_COLORS[offer.status] || STATUS_COLORS.pending
  const statusLabel = STATUS_LABELS[offer.status] || offer.status

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-primary/30">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
              {offer.tutor.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground">{offer.tutor.name}</h3>
                {offer.tutor.verified && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">✓ Verified</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {offer.tutor.rating > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    {offer.tutor.rating.toFixed(1)} ({offer.tutor.total_reviews})
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Award className="w-3 h-3" />
                  {offer.tutor.experience_years} thn pengalaman
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="w-3 h-3" />
                  {offer.subject}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm font-semibold text-primary">
                  Rp {offer.tutor.hourly_rate.toLocaleString('id-ID')}/jam
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(offer.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className={`${statusColor} border text-xs`}>
              {statusLabel}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onView}>
            Lihat Profil
          </Button>
          {offer.status === 'pending' && onAccept && onReject && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                onClick={onReject}
                disabled={actionLoading}
              >
                <X className="w-3 h-3 mr-1" /> Tolak
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={onAccept}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-1" />
                ) : (
                  <CheckCircle className="w-3 h-3 mr-1" />
                )}
                Terima
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
