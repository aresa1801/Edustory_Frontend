'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/auth'
import Link from 'next/link'
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
    color: 'bg-slate-50 text-slate-600 border-slate-200',
    icon: XCircle,
    iconColor: 'text-slate-400',
  },
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    experience_years: '',
    hourly_rate: '',
    qualifications: '',
    specializations: [] as string[],
  })
  const [tutorId, setTutorId] = useState<string | null>(null)
  const [approvalStatus, setApprovalStatus] = useState<string>('pending')
  const [verified, setVerified] = useState(false)

  const isMounted = useRef(true)
  const timeoutId = useRef<NodeJS.Timeout | null>(null)
  const fetchDone = useRef(false)

  const fetchProfile = async () => {
    if (fetchDone.current) return
    fetchDone.current = true

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User tidak ditemukan')
        return
      }

      // Ambil email dari user_profiles (atau dari auth user)
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', user.id)
        .maybeSingle()

      // Ambil semua data tutor dari tabel tutors
      const { data: tutorData, error: tutorErr } = await supabase
        .from('tutors')
        .select('id, full_name, phone, bio, experience_years, hourly_rate, qualifications, specializations, approval_status, verified')
        .eq('user_id', user.id)
        .maybeSingle()

      if (tutorErr && tutorErr.code !== 'PGRST116') {
        console.error('[Profile] Tutor fetch error:', tutorErr)
      }

      setForm({
        full_name: tutorData?.full_name || '',
        email: profileData?.email || user.email || '',
        phone: tutorData?.phone || '',
        bio: tutorData?.bio || '',
        experience_years: tutorData?.experience_years?.toString() || '',
        hourly_rate: tutorData?.hourly_rate?.toString() || '',
        qualifications: tutorData?.qualifications || '',
        specializations: tutorData?.specializations || [],
      })
      setTutorId(tutorData?.id || null)
      setApprovalStatus(tutorData?.approval_status || 'pending')
      setVerified(tutorData?.verified || false)
      setError(null)
    } catch (err) {
      console.error('[Profile] Error:', err)
      setError(err instanceof Error ? err.message : 'Gagal memuat profil')
    } finally {
      if (isMounted.current) {
        setLoading(false)
        if (timeoutId.current) clearTimeout(timeoutId.current)
      }
    }
  }

  useEffect(() => {
    isMounted.current = true
    fetchDone.current = false

    timeoutId.current = setTimeout(() => {
      if (isMounted.current && loading) {
        console.warn('[Profile] ⏱️ Timeout, force loading=false')
        setLoading(false)
      }
    }, 3000)

    fetchProfile()

    return () => {
      isMounted.current = false
      if (timeoutId.current) clearTimeout(timeoutId.current)
    }
  }, [])

  const handleSave = async () => {
  console.log('[Profile] 🔥 handleSave dimulai')
  
  // Reset state
  setError(null)
  setSuccess(null)
  setSaving(true)

  try {
    console.log('[Profile] 1. Membuat Supabase client...')
    const supabase = createClient()
    
    console.log('[Profile] 2. Mendapatkan user...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('[Profile] ❌ User error:', userError)
      throw new Error('Tidak terautentikasi. Silakan login ulang.')
    }
    console.log('[Profile] ✅ User ditemukan:', user.id)

    // Validasi sederhana
    if (!form.full_name.trim()) {
      throw new Error('Nama lengkap wajib diisi')
    }

    console.log('[Profile] 3. Menyimpan data ke tutors...')
    
    // Siapkan data yang akan disimpan
    const tutorData = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      bio: form.bio.trim() || null,
      experience_years: parseInt(form.experience_years) || 0,
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      qualifications: form.qualifications.trim() || null,
      updated_at: new Date().toISOString(),
    }

    let result

    if (tutorId) {
      console.log('[Profile] 🔄 Update tutor ID:', tutorId)
      // Update existing tutor
      const { data, error } = await supabase
        .from('tutors')
        .update(tutorData)
        .eq('id', tutorId)
        .select('id')
        .single()

      if (error) {
        console.error('[Profile] ❌ Update error:', error)
        throw error
      }
      result = data
      console.log('[Profile] ✅ Update berhasil')
    } else {
      console.log('[Profile] 📝 Insert new tutor untuk user:', user.id)
      // Insert new tutor
      const { data, error } = await supabase
        .from('tutors')
        .insert({
          user_id: user.id,
          ...tutorData,
          specializations: [],
          approval_status: 'pending',
          verified: false,
          rating: 0,
          total_reviews: 0,
          verified_grade_levels: [],
          target_grade_level: null,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) {
        console.error('[Profile] ❌ Insert error:', error)
        throw error
      }
      result = data
      console.log('[Profile] ✅ Insert berhasil, ID:', result?.id)
      setTutorId(result?.id || null)
    }

    // Tampilkan pesan sukses
    setSuccess('Profil berhasil disimpan!')
    setTimeout(() => setSuccess(null), 3000)

    // Refresh data setelah simpan (tapi jangan pakai await yang bisa blocking)
    console.log('[Profile] 🔄 Refresh data...')
    fetchDone.current = false
    await fetchProfile()
    console.log('[Profile] ✅ Refresh selesai')

  } catch (err) {
    console.error('[Profile] ❌ Save error:', err)
    setError(err instanceof Error ? err.message : 'Gagal menyimpan profil')
  } finally {
    console.log('[Profile] 🏁 Saving selesai, setSaving(false)')
    setSaving(false)
  }
}

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat profil...</p>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[approvalStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
  const StatusIcon = statusCfg.icon

  const isProfileComplete = !!(
    form.full_name &&
    form.phone &&
    form.experience_years &&
    form.hourly_rate &&
    form.qualifications
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profil Saya</h1>
          <p className="text-slate-500 text-sm mt-1">Lengkapi profil Anda untuk memulai proses menjadi pengajar</p>
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

      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            Status Akun
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-5 h-5 ${statusCfg.iconColor}`} />
              <div>
                <p className="text-sm font-semibold text-slate-800">{statusCfg.label}</p>
                {approvalStatus === 'pending' && (
                  <p className="text-xs text-slate-500">Profil Anda sedang dalam antrian verifikasi (2–3 hari kerja)</p>
                )}
                {approvalStatus === 'approved' && (
                  <p className="text-xs text-slate-500">Anda dapat menerima permintaan siswa</p>
                )}
              </div>
            </div>
            {verified && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                ✓ Terverifikasi
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            Informasi Pribadi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Nama Lengkap</Label>
              <Input
                value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Nama lengkap Anda"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </Label>
              <Input value={form.email} disabled className="bg-slate-50 text-slate-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Phone className="w-3 h-3" /> Nomor WhatsApp
            </Label>
            <Input
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="contoh: 08123456789"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Bio Singkat</Label>
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

      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Informasi Profesional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Pengalaman Mengajar (Tahun)
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
              <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <Banknote className="w-3 h-3" /> Tarif Per Jam (Rp)
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
            <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Kualifikasi & Sertifikasi
            </Label>
            <Textarea
              value={form.qualifications}
              onChange={e => setForm(p => ({ ...p, qualifications: e.target.value }))}
              placeholder="Contoh: S1 Pendidikan Matematika Universitas Indonesia, Sertifikat TOEFL 550, dll."
              rows={4}
              className="resize-none"
            />
          </div>

          {form.specializations.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Mata Pelajaran yang Diajarkan</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                {form.specializations.map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Kelola mata pelajaran di halaman{' '}
                <a href="/dashboard/tutor/teaching-interest" className="text-blue-300 underline">
                  Minat Mengajar
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11"
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