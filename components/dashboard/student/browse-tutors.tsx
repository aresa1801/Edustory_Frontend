'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createClient } from '@/lib/auth'
import { Label } from '@/components/ui/label'
import { Filter, Star, Clock, CheckCircle, User } from 'lucide-react'
import { EmptyState, TonePill } from '@/components/dashboard/ui'

const PAYMENT_METHODS = [
  { id: 'gopay', label: 'GoPay', icon: '💚', account: '0895-1370-0000' },
  { id: 'ovo', label: 'OVO', icon: '💜', account: '0812-3456-7890' },
  { id: 'dana', label: 'DANA', icon: '💙', account: '0812-3456-7890' },
  { id: 'bca', label: 'Transfer BCA', icon: '🏦', account: '1234567890 a/n EduStory' },
  { id: 'bni', label: 'Transfer BNI', icon: '🏦', account: '0987654321 a/n EduStory' },
  { id: 'mandiri', label: 'Transfer Mandiri', icon: '🏦', account: '1122334455 a/n EduStory' },
]

export default function StudentBrowseTutors() {
  const [tutors, setTutors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTutor, setSelectedTutor] = useState<any>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [dialogStep, setDialogStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Filters
  const [searchSubject, setSearchSubject] = useState('')
  const [genderFilter, setGenderFilter] = useState('all')
  const [maxRate, setMaxRate] = useState('')
  const [minExperience, setMinExperience] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Enrollment form
  const [matchData, setMatchData] = useState({ subject: '', lessonFrequency: '', startDate: '' })
  const [selectedPayment, setSelectedPayment] = useState('')
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null)

  // ============================================================
  // REFS UNTUK STABILITAS
  // ============================================================
  const isMounted = useRef(true)
  const fetchDone = useRef(false)

  // ============================================================
  // FETCH TUTORS (dibungkus useCallback)
  // ============================================================
  const fetchTutors = useCallback(async () => {
    // Cegah fetch ganda
    if (fetchDone.current) {
      console.log('[BrowseTutors] ⏭️ Sudah pernah fetch, skip')
      return
    }
    fetchDone.current = true

    setLoading(true)
    setError(null)

    try {
      console.log('[BrowseTutors] 🔄 Fetching tutors...')
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('tutors')
        .select(`
          id,
          user_id,
          specializations,
          qualifications,
          experience_years,
          hourly_rate,
          rating,
          total_reviews,
          verified,
          user_profiles:user_id(name, avatar_url, bio, phone, gender)
        `)
        .eq('approval_status', 'approved')
        .order('rating', { ascending: false })

      if (fetchError) throw fetchError

      let filtered: any[] = data || []

      if (searchSubject.trim()) {
        filtered = filtered.filter(tutor =>
          tutor.specializations?.some((spec: string) =>
            spec.toLowerCase().includes(searchSubject.toLowerCase())
          )
        )
      }
      if (genderFilter !== 'all') {
        filtered = filtered.filter(tutor =>
          tutor.user_profiles?.gender === genderFilter
        )
      }
      if (maxRate) {
        filtered = filtered.filter(tutor => tutor.hourly_rate <= Number(maxRate))
      }
      if (minExperience) {
        filtered = filtered.filter(tutor => tutor.experience_years >= Number(minExperience))
      }

      if (isMounted.current) {
        setTutors(filtered)
        setError(null)
        console.log('[BrowseTutors] ✅ Tutors loaded:', filtered.length)
      }
    } catch (err: any) {
      console.error('[BrowseTutors] ❌ Error:', err)
      if (isMounted.current) {
        setTutors([])
        setError(err.message || 'Gagal memuat pengajar')
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
        console.log('[BrowseTutors] 🏁 Loading selesai')
      }
    }
  }, [searchSubject, genderFilter, maxRate, minExperience])

  // ============================================================
  // EFFECT: FETCH TUTORS (hanya sekali)
  // ============================================================
  useEffect(() => {
    isMounted.current = true
    fetchDone.current = false

    fetchTutors()

    return () => {
      isMounted.current = false
    }
  }, [fetchTutors]) // ✅ fetchTutors stabil dengan useCallback

  // ============================================================
  // FUNGSI LAIN
  // ============================================================
  const applyFilters = () => {
    fetchDone.current = false // Izinkan fetch ulang
    fetchTutors()
  }

  const resetFilters = () => {
    setSearchSubject('')
    setGenderFilter('all')
    setMaxRate('')
    setMinExperience('')
    fetchDone.current = false
    fetchTutors()
  }

  const handleSelectTutor = (tutor: any) => {
    setSelectedTutor(tutor)
    setDialogStep(1)
    setMatchData({ subject: '', lessonFrequency: '', startDate: '' })
    setSelectedPayment('')
    setCreatedMatchId(null)
    setShowDialog(true)
  }

  const handleNextStep = async () => {
    if (dialogStep === 1) {
      if (!matchData.subject || !matchData.lessonFrequency || !matchData.startDate) {
        alert('Lengkapi semua data terlebih dahulu')
        return
      }
      setDialogStep(2)
      return
    }

    if (dialogStep === 2) {
      if (!selectedPayment) {
        alert('Pilih metode pembayaran terlebih dahulu')
        return
      }
      await handleCreateMatch()
    }
  }

  const handleCreateMatch = async () => {
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        alert('Anda harus login terlebih dahulu')
        return
      }

      const matchRes = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tutorId: selectedTutor.id,
          subject: matchData.subject,
          lessonFrequency: matchData.lessonFrequency,
          startDate: matchData.startDate,
        }),
      })

      if (!matchRes.ok) throw new Error('Gagal mendaftar belajar')

      const matchResult = await matchRes.json()
      setCreatedMatchId(matchResult.id)

      // Record payment deposit (best-effort)
      await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          matchId: matchResult.id,
          tutorId: selectedTutor.id,
          amount: (selectedTutor.hourly_rate || 0) * 2,
          paymentMethod: selectedPayment,
        }),
      }).catch(() => {
        // Ignore payment recording errors; match is already created
      })

      setDialogStep(3)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseDialog = () => {
    setShowDialog(false)
    if (createdMatchId) {
      fetchDone.current = false
      fetchTutors()
    }
  }

  const depositAmount = (selectedTutor?.hourly_rate || 0) * 2
  const selectedPaymentMethod = PAYMENT_METHODS.find(m => m.id === selectedPayment)

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search & Filters */}
      <div className="surface p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Cari berdasarkan mata pelajaran..."
            value={searchSubject}
            onChange={e => setSearchSubject(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button onClick={applyFilters} className="flex-1 bg-primary hover:bg-primary/90 sm:flex-none">Cari</Button>
            <Button onClick={() => setShowFilters(!showFilters)} variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-border/70 bg-muted/30 p-4 sm:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Jenis Kelamin Pengajar</Label>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="laki-laki">Laki-laki</SelectItem>
                  <SelectItem value="perempuan">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Tarif Maksimal (Rp/jam)</Label>
              <Input
                type="number"
                placeholder="Contoh: 150000"
                value={maxRate}
                onChange={e => setMaxRate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Pengalaman Minimal (tahun)</Label>
              <Input
                type="number"
                placeholder="Contoh: 2"
                value={minExperience}
                onChange={e => setMinExperience(e.target.value)}
              />
            </div>
            <div className="sm:col-span-3 flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetFilters}>Reset</Button>
              <Button size="sm" onClick={applyFilters} className="bg-primary hover:bg-primary/90">Terapkan Filter</Button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && <p className="text-sm text-muted-foreground">{tutors.length} pengajar ditemukan</p>}

      {tutors.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={User}
            title={error ? 'Belum ada tutor tersedia. Coba lagi nanti.' : 'Tidak ada pengajar yang sesuai filter Anda'}
            action={
              error ? (
                <Button variant="outline" size="sm" onClick={() => { fetchDone.current = false; fetchTutors() }}>Coba Lagi</Button>
              ) : (
                <Button variant="outline" size="sm" onClick={resetFilters}>Reset Filter</Button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tutors.map(tutor => (
            <div key={tutor.id} className="surface hover-card flex flex-col">
              <div className="p-4 pb-3 sm:p-5 sm:pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 text-lg font-bold text-primary ring-1 ring-inset ring-primary/10">
                      {tutor.user_profiles?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold leading-tight">{tutor.user_profiles?.name}</h3>
                      {tutor.user_profiles?.gender && (
                        <span className="text-xs capitalize text-muted-foreground">{tutor.user_profiles.gender}</span>
                      )}
                      {tutor.verified && (
                        <div className="mt-1">
                          <TonePill tone="secondary">
                            ✓ Terverifikasi
                          </TonePill>
                        </div>
                      )}
                    </div>
                  </div>
                  {tutor.rating > 0 && (
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-1 text-sm font-bold text-accent-foreground">
                        <Star className="h-3 w-3 fill-accent text-accent" />
                        {Number(tutor.rating).toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">({tutor.total_reviews})</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Spesialisasi:</p>
                  <div className="flex flex-wrap gap-1">
                    {tutor.specializations?.slice(0, 3).map((spec: string) => (
                      <TonePill key={spec} tone="primary" className="text-xs">{spec}</TonePill>
                    ))}
                    {(tutor.specializations?.length ?? 0) > 3 && (
                      <TonePill tone="muted" className="text-xs">+{tutor.specializations.length - 3}</TonePill>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {tutor.experience_years} thn pengalaman
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  Rp {tutor.hourly_rate?.toLocaleString('id-ID')}<span className="font-normal text-muted-foreground">/jam</span>
                </p>

                {tutor.user_profiles?.bio && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{tutor.user_profiles.bio}</p>
                )}

                <Button
                  onClick={() => handleSelectTutor(tutor)}
                  className="mt-auto w-full bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  Daftar Belajar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enrollment Dialog (sama seperti sebelumnya) */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogStep === 1 && `Daftar Belajar — ${selectedTutor?.user_profiles?.name}`}
              {dialogStep === 2 && 'Pilih Metode Pembayaran Deposit'}
              {dialogStep === 3 && '🎉 Pendaftaran Berhasil!'}
            </DialogTitle>
            <DialogDescription>
              {dialogStep === 1 && 'Isi detail rencana pembelajaran Anda'}
              {dialogStep === 2 && `Deposit 2 sesi pertama: Rp ${depositAmount.toLocaleString('id-ID')}`}
              {dialogStep === 3 && 'Pengajar akan segera mengkonfirmasi dalam 24 jam'}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          {dialogStep < 3 && (
            <div className="flex items-center gap-2 mb-1">
              {[1, 2].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <div className={`h-0.5 w-8 ${dialogStep > 1 ? 'bg-primary' : 'bg-muted'}`} />}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    s < dialogStep ? 'bg-success text-white' :
                    s === dialogStep ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {s < dialogStep ? '✓' : s}
                  </div>
                </div>
              ))}
              <span className="text-xs text-muted-foreground ml-1">
                {dialogStep === 1 ? 'Detail Pembelajaran' : 'Pembayaran Deposit'}
              </span>
            </div>
          )}

          {/* Step 1: Learning details */}
          {dialogStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Mata Pelajaran *</Label>
                <Select value={matchData.subject} onValueChange={v => setMatchData(p => ({ ...p, subject: v }))}>
                  <SelectTrigger id="subject" className="mt-1">
                    <SelectValue placeholder="Pilih mata pelajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTutor?.specializations?.map((spec: string) => (
                      <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="frequency">Frekuensi Per Minggu *</Label>
                <Select value={matchData.lessonFrequency} onValueChange={v => setMatchData(p => ({ ...p, lessonFrequency: v }))}>
                  <SelectTrigger id="frequency" className="mt-1">
                    <SelectValue placeholder="Pilih frekuensi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-per-week">1× per minggu</SelectItem>
                    <SelectItem value="2-per-week">2× per minggu</SelectItem>
                    <SelectItem value="3-per-week">3× per minggu</SelectItem>
                    <SelectItem value="4-per-week">4× per minggu</SelectItem>
                    <SelectItem value="daily">Setiap hari</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Tanggal Mulai *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={matchData.startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setMatchData(p => ({ ...p, startDate: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div className="space-y-1 rounded-xl border border-border/70 bg-muted/40 p-3 text-sm">
                <p className="font-medium text-foreground">Rincian Biaya</p>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tarif per jam</span>
                  <span>Rp {selectedTutor?.hourly_rate?.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-semibold text-primary border-t border-border pt-1 mt-1">
                  <span>Deposit (2 sesi @ 1 jam)</span>
                  <span>Rp {depositAmount.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Payment */}
          {dialogStep === 2 && (
            <div className="space-y-3">
              <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment}>
                {PAYMENT_METHODS.map(method => (
                  <div
                    key={method.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200 ease-out ${
                      selectedPayment === method.id
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/70 hover:border-primary/30 hover:bg-muted/30'
                    }`}
                    onClick={() => setSelectedPayment(method.id)}
                  >
                    <RadioGroupItem value={method.id} id={method.id} />
                    <span className="text-xl">{method.icon}</span>
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={method.id} className="font-medium cursor-pointer">{method.label}</Label>
                      {selectedPayment === method.id && (
                        <p className="text-xs text-muted-foreground truncate">{method.account}</p>
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
                💡 Deposit dikembalikan jika pengajar tidak mengkonfirmasi dalam 24 jam.
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {dialogStep === 3 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>
              <div className="space-y-2">
                <p className="font-medium text-base">Pendaftaran Dikirim!</p>
                <p className="text-sm text-muted-foreground">
                  Silakan transfer deposit <strong>Rp {depositAmount.toLocaleString('id-ID')}</strong> melalui{' '}
                  <strong>{selectedPaymentMethod?.label}</strong>
                </p>
                <div className="rounded-xl border border-border/70 bg-muted p-3 text-sm">
                  <p className="text-muted-foreground text-xs">Nomor tujuan transfer:</p>
                  <p className="font-semibold mt-0.5">{selectedPaymentMethod?.account}</p>
                </div>
              </div>
              <div className="rounded-xl border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
                ⏳ Konfirmasi akan dikirim setelah pembayaran terverifikasi.
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            {dialogStep === 1 && (
              <>
                <Button variant="outline" onClick={handleCloseDialog} className="flex-1">Batal</Button>
                <Button onClick={handleNextStep} className="flex-1 bg-primary hover:bg-primary/90">Lanjutkan →</Button>
              </>
            )}
            {dialogStep === 2 && (
              <>
                <Button variant="outline" onClick={() => setDialogStep(1)} className="flex-1">← Kembali</Button>
                <Button onClick={handleNextStep} disabled={submitting} className="flex-1 bg-primary hover:bg-primary/90">
                  {submitting ? <><Spinner className="mr-2 h-4 w-4" />Memproses...</> : 'Konfirmasi & Daftar'}
                </Button>
              </>
            )}
            {dialogStep === 3 && (
              <Button onClick={handleCloseDialog} className="w-full bg-primary hover:bg-primary/90">Selesai</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}