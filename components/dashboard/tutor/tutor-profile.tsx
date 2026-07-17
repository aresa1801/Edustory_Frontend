'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/auth'

const STATUS_CONFIG = {
  pending: { label: 'Menunggu Verifikasi', color: 'bg-yellow-900/30 text-yellow-400' },
  approved: { label: 'Terverifikasi', color: 'bg-green-900/30 text-green-400' },
  rejected: { label: 'Ditolak', color: 'bg-red-900/30 text-red-400' },
  suspended: { label: 'Ditangguhkan', color: 'bg-gray-700 text-gray-300' },
}

export default function TutorProfile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [application, setApplication] = useState<any>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Anda harus login terlebih dahulu')
        return
      }

      const { data, error } = await supabase
        .from('tutors')
        .select(`
          id, specializations, qualifications, experience_years, hourly_rate,
          rating, total_reviews, verified, approval_status,
          full_name, phone, bio,
          user_profiles:user_id( email, avatar_url )
        `)
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      setProfile(data)

      // Fetch application info
      const { data: appData } = await supabase
        .from('tutor_applications')
        .select('*')
        .eq('tutor_id', data.id)
        .single()

      setApplication(appData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat profil')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tutors')
        .update({
          qualifications: profile.qualifications,
          experience_years: parseInt(profile.experience_years),
          hourly_rate: parseFloat(profile.hourly_rate),
        })
        .eq('id', profile.id)

      if (error) throw error

      setSuccess('Profil berhasil disimpan!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!profile) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Profil tidak ditemukan</AlertDescription>
      </Alert>
    )
  }

  const statusConfig = STATUS_CONFIG[profile.approval_status as keyof typeof STATUS_CONFIG]

  return (
    <div className="max-w-2xl space-y-6">
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

      {application?.status === 'rejected' && (
        <Alert variant="destructive">
          <AlertDescription>
            Aplikasi Anda ditolak. Alasan: {application?.rejection_reason}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Status Verifikasi</CardTitle>
            </div>
            <Badge className={`${statusConfig?.color} border-0`}>
              {statusConfig?.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {profile.approval_status === 'pending' && (
            <p className="text-sm text-muted-foreground">
              Profil Anda sedang dalam proses verifikasi oleh tim kami. Anda akan diberitahu melalui email dalam waktu 2-3 hari kerja.
            </p>
          )}
          {profile.approval_status === 'approved' && (
            <p className="text-sm text-green-300">
              Profil Anda telah diverifikasi dan disetujui! Anda sekarang dapat menerima permintaan dari siswa.
            </p>
          )}
          {profile.verified && (
            <Badge variant="outline" className="bg-green-50 text-green-300 border-green-200 mt-2">
              ✓ Terverifikasi
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Pribadi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                value={profile.user_profiles?.name || ''}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile.users_profile?.email || ''}
                disabled
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Nomor Telepon</Label>
            <Input
              id="phone"
              value={profile.users_profile?.phone || ''}
              disabled
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Profesional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Spesialisasi</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.specializations?.map((spec: string) => (
                <Badge key={spec} variant="secondary" className="text-sm">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="experience">Pengalaman Mengajar (Tahun)</Label>
              <Input
                id="experience"
                type="number"
                value={profile.experience_years || ''}
                onChange={e => setProfile(prev => ({ ...prev, experience_years: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="hourlyRate">Tarif Per Jam (Rp)</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="1000"
                value={profile.hourly_rate || ''}
                onChange={e => setProfile(prev => ({ ...prev, hourly_rate: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="qualifications">Sertifikasi/Kualifikasi</Label>
            <textarea
              id="qualifications"
              value={profile.qualifications || ''}
              onChange={e => setProfile(prev => ({ ...prev, qualifications: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm"
              rows={4}
              placeholder="Deskripsikan sertifikasi dan kualifikasi Anda"
            />
          </div>

          {profile.rating > 0 && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Rating Rata-rata</p>
              <p className="text-lg font-bold text-yellow-500">
                ★ {profile.rating} ({profile.total_reviews} ulasan)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSaveProfile}
        disabled={saving}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {saving ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Menyimpan...
          </>
        ) : (
          'Simpan Perubahan'
        )}
      </Button>
    </div>
  )
}
