'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/auth'
import { Label } from '@/components/ui/label'

export default function StudentBrowseTutors() {
  const [tutors, setTutors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTutor, setSelectedTutor] = useState<any>(null)
  const [showMatchDialog, setShowMatchDialog] = useState(false)
  const [searchSubject, setSearchSubject] = useState('')
  const [matchData, setMatchData] = useState({
    subject: '',
    lessonFrequency: '',
    startDate: '',
  })

  useEffect(() => {
    fetchTutors()
  }, [searchSubject])

  const fetchTutors = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
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
          user_profiles:user_id(name, avatar_url, bio, phone)
        `)
        .eq('approval_status', 'approved')
        .order('rating', { ascending: false })

      if (error) throw error

      let filtered = data || []
      if (searchSubject) {
        filtered = filtered.filter(tutor =>
          tutor.specializations?.some((spec: string) =>
            spec.toLowerCase().includes(searchSubject.toLowerCase())
          )
        )
      }

      setTutors(filtered)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengajar')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTutor = (tutor: any) => {
    setSelectedTutor(tutor)
    setShowMatchDialog(true)
  }

  const handleCreateMatch = async () => {
    if (!matchData.subject || !matchData.lessonFrequency || !matchData.startDate) {
      alert('Lengkapi semua data terlebih dahulu')
      return
    }

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        alert('Anda harus login terlebih dahulu')
        return
      }

      const response = await fetch('/api/matches', {
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

      if (!response.ok) {
        throw new Error('Gagal membuat pencocokan')
      }

      alert('Anda telah memilih pengajar! Silakan tunggu konfirmasi dari pengajar.')
      setShowMatchDialog(false)
      setMatchData({ subject: '', lessonFrequency: '', startDate: '' })
      setSelectedTutor(null)
      fetchTutors()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Input
          placeholder="Cari berdasarkan mata pelajaran..."
          value={searchSubject}
          onChange={e => setSearchSubject(e.target.value)}
          className="flex-1"
        />
        <Button onClick={() => fetchTutors()} variant="outline">
          Cari
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {tutors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Tidak ada pengajar yang tersedia</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tutors.map(tutor => (
            <Card key={tutor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {tutor.user_profiles?.name}
                    </CardTitle>
                    {tutor.verified && (
                      <Badge variant="outline" className="mt-1 bg-green-50 text-green-700 border-green-200">
                        Terverifikasi
                      </Badge>
                    )}
                  </div>
                  {tutor.rating > 0 && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-500">★ {tutor.rating}</div>
                      <div className="text-xs text-muted-foreground">({tutor.total_reviews})</div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Spesialisasi:</p>
                  <div className="flex flex-wrap gap-2">
                    {tutor.specializations?.map((spec: string) => (
                      <Badge key={spec} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Pengalaman: {tutor.experience_years} tahun</p>
                  <p className="text-sm text-muted-foreground">Tarif: Rp {tutor.hourly_rate?.toLocaleString()}/jam</p>
                </div>

                {tutor.user_profiles?.bio && (
                  <p className="text-sm text-foreground line-clamp-2">{tutor.user_profiles.bio}</p>
                )}

                <Button
                  onClick={() => handleSelectTutor(tutor)}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Pilih Pengajar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Match Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pilih {selectedTutor?.user_profiles?.name}</DialogTitle>
            <DialogDescription>
              Lengkapi detail pembelajaran Anda
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Mata Pelajaran</Label>
              <Select value={matchData.subject} onValueChange={value => setMatchData(prev => ({ ...prev, subject: value }))}>
                <SelectTrigger id="subject" className="mt-1">
                  <SelectValue placeholder="Pilih mata pelajaran" />
                </SelectTrigger>
                <SelectContent>
                  {selectedTutor?.specializations?.map((spec: string) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="frequency">Frekuensi Pembelajaran</Label>
              <Select value={matchData.lessonFrequency} onValueChange={value => setMatchData(prev => ({ ...prev, lessonFrequency: value }))}>
                <SelectTrigger id="frequency" className="mt-1">
                  <SelectValue placeholder="Pilih frekuensi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-per-week">1x per minggu</SelectItem>
                  <SelectItem value="2-per-week">2x per minggu</SelectItem>
                  <SelectItem value="3-per-week">3x per minggu</SelectItem>
                  <SelectItem value="4-per-week">4x per minggu</SelectItem>
                  <SelectItem value="daily">Setiap hari</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">Tanggal Mulai</Label>
              <Input
                id="startDate"
                type="date"
                value={matchData.startDate}
                onChange={e => setMatchData(prev => ({ ...prev, startDate: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowMatchDialog(false)} className="flex-1">
                Batal
              </Button>
              <Button onClick={handleCreateMatch} className="flex-1 bg-primary hover:bg-primary/90">
                Konfirmasi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
