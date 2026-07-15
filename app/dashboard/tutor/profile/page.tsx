'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import {
  UserCircle,
  Save,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Banknote,
  BookOpen,
} from 'lucide-react'

const STATUS_CONFIG = {
  pending: {
    label: 'Menunggu Verifikasi',
    icon: Clock,
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    iconColor: 'text-amber-500',
  },
  approved: {
    label: 'Disetujui',
    icon: CheckCircle2,
    color: 'bg-green-500/20 text-green-300 border-green-500/30',
    iconColor: 'text-green-500',
  },
  rejected: {
    label: 'Ditolak',
    icon: XCircle,
    color: 'bg-red-500/20 text-red-300 border-red-500/30',
    iconColor: 'text-red-500',
  },
  suspended: {
    label: 'Ditangguhkan',
    icon: XCircle,
    color: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    iconColor: 'text-slate-400',
  },
}

export default function TutorProfilePage() {
  const router = useRouter()
  const { user: authUser, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ============================================================
  // STATE FORM – semua data disimpan di tabel tutors
  // ============================================================
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    experience_years: '',
    hourly_rate: '',
    qualifications: '',
  })

  // State tambahan dari tabel tutors
  const [tutorId, setTutorId] = useState<string | null>(null)
  const [approvalStatus, setApprovalStatus] = useState<string>('pending')
  const [verified, setVerified] = useState(false)
  const [specializations, setSpecializations] = useState<string[]>([])

  // ============================================================
  // FUNGSI LOAD DATA – SAMA SEPERTI ONBOARDING STUDENT
  // ============================================================
  const loadTutorData = async (uid: string) => {
    console.log('[TutorProfile] 🔍 loadTutorData untuk uid:', uid)
    try {
      const supabase = createClient()

      // 1. Ambil email dari user_profiles
      const { data: profileData, error: profileErr } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', uid)
        .maybeSingle()

      if (profileErr) {
        console.warn('[TutorProfile] ⚠️ Error load user_profiles:', profileErr)
      }

      const email = profileData?.email || ''

      // 2. Ambil data tutor
      const { data: tutorData, error: tutorErr } = await supabase
        .from('tutors')
        .select('id, name, phone, bio, experience_years, hourly_rate, qualifications, specializations, approval_status, verified')
        .eq('user_id', uid)
        .maybeSingle()

      if (tutorErr) {
        console.warn('[TutorProfile] ⚠️ Error load tutor:', tutorErr)
        return
      }

      if (tutorData) {
        console.log('[TutorProfile] ✅ Data tutor ditemukan:', tutorData)
        setForm({
          name: tutorData.name || '',
          email: email,
          phone: tutorData.phone || '',
          bio: tutorData.bio || '',
          experience_years: tutorData.experience_years?.toString() || '',
          hourly_rate: tutorData.hourly_rate?.toString() || '',
          qualifications: tutorData.qualifications || '',
        })
        setTutorId(tutorData.id)
        setApprovalStatus(tutorData.approval_status || 'pending')
        setVerified(tutorData.verified || false)
        setSpecializations(tutorData.specializations || [])
      } else {
        console.log('[TutorProfile] ℹ️ Belum ada data tutor')
        setForm({
          name: '',
          email: email,
          phone: '',
          bio: '',
          experience_years: '',
          hourly_rate: '',
          qualifications: '',
        })
        setTutorId(null)
        setApprovalStatus('pending')
        setVerified(false)
        setSpecializations([])
      }
    } catch (err) {
      console.error('[TutorProfile] ❌ Load data error:', err)
    }
  }

  // ============================================================
  // INISIALISASI – SAMA SEPERTI ONBOARDING STUDENT
  // ============================================================
  useEffect(() => {
    const init = async () => {
      if (authLoading) return

      if (!authUser) {
        router.push('/auth/login')
        return
      }

      setLoading(true)
      await loadTutorData(authUser.id)
      setLoading(false)
    }

    init()
  }, [authUser, authLoading, router])

  // ============================================================
  // HANDLE SAVE – SIMPAN KE TABEL tutors
  // ============================================================
  const handleSave = async () => {
    // Validasi
    if (!form.name.trim()) {
      setError('Nama lengkap wajib diisi')
      return
    }
    if (!form.phone.trim()) {
      setError('Nomor telepon/WA wajib diisi')
      return
    }
    if (!form.experience_years || parseInt(form.experience_years) < 0) {
      setError('Pengalaman mengajar harus diisi dengan angka ≥ 0')
      return
    }
    if (!form.hourly_rate || parseFloat(form.hourly_rate) <= 0) {
      setError('Tarif per jam harus diisi dengan angka > 0')
      return
    }
    if (!form.qualifications.trim()) {
      setError('Kualifikasi & sertifikasi wajib diisi')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('User tidak ditemukan')

      // Payload untuk tutors
      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim() || null,
        experience_years: parseInt(form.experience_years) || 0,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
        qualifications: form.qualifications.trim(),
      }

      console.log('[TutorProfile] 📦 Payload:', payload)

      let result
      if (tutorId) {
        // UPDATE existing
        const { data, error } = await supabase
          .from('tutors')
          .update(payload)
          .eq('id', tutorId)
          .select('id')
          .single()

        if (error) throw error
        result = data
        console.log('[TutorProfile] ✅ Update berhasil')
      } else {
        // INSERT baru
        const { data, error } = await supabase
          .from('tutors')
          .insert({
            ...payload,
            specializations: [],
            approval_status: 'pending',
            verified: false,
            rating: 0,
            total_reviews: 0,
            verified_grade_levels: [],
            target_grade_level: null,
          })
          .select('id')
          .single()

        if (error) throw error
        result = data
        setTutorId(result.id)
        console.log('[TutorProfile] ✅ Insert berhasil')
      }

      setSuccess('Profil berhasil disimpan!')
      setTimeout(() => setSuccess(null), 3000)

      // Refresh data agar status terbaru
      await loadTutorData(user.id)

    } catch (err) {
      console.error('[TutorProfile] ❌ Save error:', err)
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil')
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat profil...</p>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[approvalStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon
  const isProfileComplete = !!(form.name && form.phone && form.experience_years && form.hourly_rate && form.qualifications)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profil Saya</h1>
          <p className="text-muted-foreground text-sm mt-1">Lengkapi profil Anda untuk memulai proses menjadi pengajar</p>
        </div>
        {isProfileComplete ? (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 gap-1.5 px-3 py-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Profil Lengkap
          </Badge>
        ) : (
          <Badge variant="outline" className="text-amber-300 border-amber-200 bg-amber-50 gap-1.5 px-3 py-1.5">
            <Clock className="w-3.5 h-3.5" />
            Belum Lengkap
          </Badge>
        )}
      </div>

      {/* Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-300">{success}</AlertDescription>
        </Alert>
      )}

      {/* Status Akun */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            Status Akun
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-5 h-5 ${statusCfg.iconColor}`} />
              <div>
                <p className="text-sm font-semibold">{statusCfg.label}</p>
                {approvalStatus === 'pending' && (
                  <p className="text-xs text-muted-foreground">Profil Anda sedang dalam antrian verifikasi (2–3 hari kerja)</p>
                )}
                {approvalStatus === 'approved' && (
                  <p className="text-xs text-muted-foreground">Anda dapat menerima permintaan siswa</p>
                )}
              </div>
            </div>
            {verified && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">✓ Terverifikasi</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informasi Pribadi */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            Informasi Pribadi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Nama Lengkap <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Nama lengkap Anda"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </Label>
              <Input value={form.email} disabled className="bg-muted/40 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" /> Nomor WhatsApp <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="contoh: 08123456789"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Bio Singkat</Label>
            <Textarea
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              placeholder="Ceritakan sedikit tentang diri Anda kepada siswa..."
              rows={3}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Informasi Profesional */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Informasi Profesional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Pengalaman Mengajar (Tahun) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={form.experience_years}
                onChange={e => setForm(p => ({ ...p, experience_years: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Banknote className="w-3 h-3" /> Tarif Per Jam (Rp) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="10000"
                min="0"
                value={form.hourly_rate}
                onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))}
                placeholder="50000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Kualifikasi & Sertifikasi <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={form.qualifications}
              onChange={e => setForm(p => ({ ...p, qualifications: e.target.value }))}
              placeholder="Contoh: S1 Pendidikan Matematika Universitas Indonesia, Sertifikat TOEFL 550, dll."
              rows={4}
              className="resize-none"
            />
          </div>

          {specializations.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Mata Pelajaran yang Diajarkan</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border">
                {specializations.map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Kelola mata pelajaran di halaman{' '}
                <a href="/dashboard/tutor/teaching-interest" className="text-primary underline">
                  Minat Mengajar
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tombol Simpan */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full gap-2 h-11"
      >
        {saving ? (
          <>
            <Spinner className="h-4 w-4" />
            Menyimpan...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Simpan Profil
          </>
        )}
      </Button>
    </div>
  )
}