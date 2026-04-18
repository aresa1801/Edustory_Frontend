'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/auth'

export default function StudentProfile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)

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
        .from('students')
        .select(`
          id,
          grade_level,
          subjects,
          learning_goals,
          address,
          status,
          user_profiles:user_id(
            name,
            email,
            phone,
            bio,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      setProfile(data)
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
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Anda harus login terlebih dahulu')

      // Update students table
      const { error } = await supabase
        .from('students')
        .update({
          grade_level: profile.grade_level,
          subjects: profile.subjects,
          learning_goals: profile.learning_goals,
          address: profile.address,
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

  return (
    <div className="max-w-2xl space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

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
                value={profile.user_profiles?.email || ''}
                disabled
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                value={profile.user_profiles?.phone || ''}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="gradeLevel">Tingkat Kelas</Label>
              <Input
                id="gradeLevel"
                value={profile.grade_level || ''}
                onChange={e => setProfile(prev => ({ ...prev, grade_level: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Alamat</Label>
            <Input
              id="address"
              value={profile.address || ''}
              onChange={e => setProfile(prev => ({ ...prev, address: e.target.value }))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Pembelajaran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="subjects">Mata Pelajaran</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.subjects?.map((subject: string) => (
                <div key={subject} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                  {subject}
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="learningGoals">Tujuan Belajar</Label>
            <textarea
              id="learningGoals"
              value={profile.learning_goals || ''}
              onChange={e => setProfile(prev => ({ ...prev, learning_goals: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm"
              rows={4}
              placeholder="Jelaskan tujuan belajar Anda"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <div className="mt-1 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium capitalize">
                {profile.status === 'active' ? '✓ Aktif' : profile.status}
              </p>
            </div>
          </div>
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
