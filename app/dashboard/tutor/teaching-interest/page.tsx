'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/auth'
import { CheckCircle2, Save, BookOpen, GraduationCap, Info } from 'lucide-react'

const GRADE_GROUPS = [
  {
    label: 'Sekolah Dasar (SD)',
    levels: ['SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3', 'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6'],
  },
  {
    label: 'Sekolah Menengah Pertama (SMP)',
    levels: ['SMP Kelas 7', 'SMP Kelas 8', 'SMP Kelas 9'],
  },
  {
    label: 'Sekolah Menengah Atas (SMA)',
    levels: ['SMA Kelas 10', 'SMA Kelas 11', 'SMA Kelas 12'],
  },
]

const SUBJECTS_BY_LEVEL: Record<string, string[]> = {
  SD: ['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'Bahasa Inggris', 'PKN', 'Seni Budaya', 'Penjaskes'],
  SMP: ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA', 'IPS', 'PKN', 'Seni Budaya', 'Penjaskes', 'Informatika'],
  SMA: ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Geografi', 'Sejarah', 'Sosiologi', 'Informatika', 'PKN', 'Seni Budaya'],
}

// Fungsi untuk mendapatkan daftar mata pelajaran untuk setiap jenjang yang dipilih
function getSubjectsForLevels(levels: string[]): { sd: string[], smp: string[], sma: string[] } {
  const result = { sd: [] as string[], smp: [] as string[], sma: [] as string[] }
  levels.forEach(lvl => {
    if (lvl.startsWith('SD')) result.sd = SUBJECTS_BY_LEVEL['SD']
    else if (lvl.startsWith('SMP')) result.smp = SUBJECTS_BY_LEVEL['SMP']
    else if (lvl.startsWith('SMA')) result.sma = SUBJECTS_BY_LEVEL['SMA']
  })
  return result
}

export default function TeachingInterestPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tutorId, setTutorId] = useState<string | null>(null)
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  // State untuk mata pelajaran per jenjang
  const [selectedSubjects, setSelectedSubjects] = useState<{ sd: string[], smp: string[], sma: string[] }>({
    sd: [],
    smp: [],
    sma: []
  })

  useEffect(() => {
    let isMounted = true
    const TIMEOUT_MS = 10000

    const fetchData = async () => {
      try {
        const supabase = createClient()
        if (!supabase || typeof supabase.from !== 'function') {
          throw new Error('Supabase client tidak valid')
        }

        // Auth
        const authPromise = supabase.auth.getUser()
        const authResult = await Promise.race([
          authPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout: auth.getUser() terlalu lama')), TIMEOUT_MS)
          ),
        ]) as any

        const { data: { user }, error: userError } = authResult
        if (userError) throw userError
        if (!user) throw new Error('Anda harus login terlebih dahulu')

        // Query tutor dengan kolom baru
        const tutorPromise = supabase
          .from('tutors')
          .select('id, verified_grade_levels, specializations_sd, specializations_smp, specializations_sma')
          .eq('user_id', user.id)
          .maybeSingle()

        const tutorResult = await Promise.race([
          tutorPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout: query tutor terlalu lama')), TIMEOUT_MS)
          ),
        ]) as any

        const { data: tutorData, error: tutorErr } = tutorResult
        if (tutorErr) throw tutorErr

        if (tutorData) {
          if (isMounted) {
            setTutorId(tutorData.id)
            setSelectedLevels(tutorData.verified_grade_levels || [])
            setSelectedSubjects({
              sd: tutorData.specializations_sd || [],
              smp: tutorData.specializations_smp || [],
              sma: tutorData.specializations_sma || [],
            })
          }
        } else {
          if (isMounted) {
            setTutorId(null)
            setSelectedLevels([])
            setSelectedSubjects({ sd: [], smp: [], sma: [] })
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Gagal memuat data minat mengajar')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => { isMounted = false }
  }, [])

  // Toggle tingkat kelas
  const toggleLevel = (level: string) => {
    const newLevels = selectedLevels.includes(level)
      ? selectedLevels.filter(l => l !== level)
      : [...selectedLevels, level]
    setSelectedLevels(newLevels)

    // Jika suatu jenjang tidak dipilih sama sekali, kosongkan mata pelajaran untuk jenjang tersebut
    const hasSD = newLevels.some(l => l.startsWith('SD'))
    const hasSMP = newLevels.some(l => l.startsWith('SMP'))
    const hasSMA = newLevels.some(l => l.startsWith('SMA'))

    setSelectedSubjects(prev => ({
      sd: hasSD ? prev.sd : [],
      smp: hasSMP ? prev.smp : [],
      sma: hasSMA ? prev.sma : [],
    }))
  }

  // Toggle mata pelajaran untuk jenjang tertentu
  const toggleSubject = (levelKey: 'sd' | 'smp' | 'sma', subject: string) => {
    setSelectedSubjects(prev => {
      const current = prev[levelKey]
      const updated = current.includes(subject)
        ? current.filter(s => s !== subject)
        : [...current, subject]
      return { ...prev, [levelKey]: updated }
    })
  }

  // Pilih semua mata pelajaran pada jenjang tertentu
  const toggleAllSubjects = (levelKey: 'sd' | 'smp' | 'sma') => {
    const allSubjects = SUBJECTS_BY_LEVEL[levelKey.toUpperCase()]
    const current = selectedSubjects[levelKey]
    const allSelected = allSubjects.every(s => current.includes(s))
    setSelectedSubjects(prev => ({
      ...prev,
      [levelKey]: allSelected ? [] : allSubjects
    }))
  }

  // Pilih semua tingkat dalam grup
  const toggleAllInGroup = (groupLabel: string, levels: string[]) => {
    const allSelected = levels.every(l => selectedLevels.includes(l))
    if (allSelected) {
      // Hapus semua level di grup ini
      const newLevels = selectedLevels.filter(l => !levels.includes(l))
      setSelectedLevels(newLevels)
      // Kosongkan mata pelajaran untuk jenjang yang dihapus
      const hasSD = newLevels.some(l => l.startsWith('SD'))
      const hasSMP = newLevels.some(l => l.startsWith('SMP'))
      const hasSMA = newLevels.some(l => l.startsWith('SMA'))
      setSelectedSubjects(prev => ({
        sd: hasSD ? prev.sd : [],
        smp: hasSMP ? prev.smp : [],
        sma: hasSMA ? prev.sma : [],
      }))
    } else {
      // Pilih semua level di grup ini
      const newLevels = Array.from(new Set([...selectedLevels, ...levels]))
      setSelectedLevels(newLevels)
    }
  }

  // Hitung total mata pelajaran yang dipilih
  const totalSubjects = selectedSubjects.sd.length + selectedSubjects.smp.length + selectedSubjects.sma.length

  const handleSave = async () => {
  if (selectedLevels.length === 0) {
    setError('Pilih minimal satu kelas yang ingin Anda ajarkan')
    return
  }
  if (totalSubjects === 0) {
    setError('Pilih minimal satu mata pelajaran pada salah satu jenjang')
    return
  }

  setSaving(true)
  setError(null)

  try {
    const supabase = createClient()
    if (!supabase || typeof supabase.from !== 'function') {
      throw new Error('Supabase client tidak valid')
    }

    // --- 1. Auth dengan timeout ---
    const authPromise = supabase.auth.getUser()
    const authResult = await Promise.race([
      authPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: auth.getUser() terlalu lama')), 10000)
      ),
    ]) as any

    const { data: { user }, error: userError } = authResult
    if (userError) throw userError
    if (!user) throw new Error('User tidak ditemukan')

    // --- 2. Kirim data ke API ---
    const response = await fetch('/api/tutors/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        specializations_sd: selectedSubjects.sd,
        specializations_smp: selectedSubjects.smp,
        specializations_sma: selectedSubjects.sma,
        verified_grade_levels: selectedLevels,
      }),
    })

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: 'Gagal menyimpan minat mengajar' }))
      throw new Error(result.error || 'Gagal menyimpan minat mengajar')
    }

    const result = await response.json()
    if (result.data?.id) setTutorId(result.data.id)

    setSuccess('Minat mengajar berhasil disimpan!')
    setTimeout(() => setSuccess(null), 3000)
  } catch (err) {
    console.error('[TeachingInterest] Save error:', err)
    setError(err instanceof Error ? err.message : 'Gagal menyimpan minat mengajar')
  } finally {
    setSaving(false)
  }
}

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
        <p className="ml-2 text-muted-foreground">Memuat...</p>
      </div>
    )
  }

  // Cek jenjang mana yang dipilih
  const hasSD = selectedLevels.some(l => l.startsWith('SD'))
  const hasSMP = selectedLevels.some(l => l.startsWith('SMP'))
  const hasSMA = selectedLevels.some(l => l.startsWith('SMA'))

  const isComplete = selectedLevels.length > 0 && totalSubjects > 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minat Mengajar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pilih kelas dan mata pelajaran yang ingin Anda ajarkan
          </p>
        </div>
        {isComplete ? (
          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5 px-3 py-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sudah Diisi
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground border-border px-3 py-1.5">
            Belum Diisi
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
          <AlertDescription className="text-green-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </AlertDescription>
        </Alert>
      )}

      <Alert className="bg-blue-500/10 border-blue-500/30">
        <AlertDescription className="text-blue-300 text-sm flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Pilihan Anda akan digunakan untuk mencocokkan Anda dengan siswa yang sesuai setelah kurasi selesai.
            Anda dapat mengubah pilihan ini kapan saja sebelum kurasi.
          </span>
        </AlertDescription>
      </Alert>

      {/* Grade Levels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Tingkat Kelas yang Ingin Diajarkan
            <span className="text-muted-foreground font-normal">({selectedLevels.length} dipilih)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {GRADE_GROUPS.map(group => {
            const allGroupSelected = group.levels.every(l => selectedLevels.includes(l))
            return (
              <div key={group.label}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group.label}</p>
                  <button
                    onClick={() => toggleAllInGroup(group.label, group.levels)}
                    className="text-xs text-primary hover:underline"
                  >
                    {allGroupSelected ? 'Hapus Semua' : 'Pilih Semua'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.levels.map(level => {
                    const selected = selectedLevels.includes(level)
                    return (
                      <button
                        key={level}
                        onClick={() => toggleLevel(level)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          selected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background text-foreground border-border hover:border-primary/50 hover:text-primary'
                        }`}
                      >
                        {selected && <span className="mr-1">✓</span>}
                        {level}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Subjects - Per Jenjang */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Mata Pelajaran yang Ingin Diajarkan
            <span className="text-muted-foreground font-normal">({totalSubjects} dipilih)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasSD && !hasSMP && !hasSMA ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Pilih kelas terlebih dahulu untuk melihat mata pelajaran yang tersedia
            </p>
          ) : (
            <>
              {/* SD */}
              {hasSD && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground">SD</h4>
                    <button
                      onClick={() => toggleAllSubjects('sd')}
                      className="text-xs text-primary hover:underline"
                    >
                      {selectedSubjects.sd.length === SUBJECTS_BY_LEVEL['SD'].length ? 'Hapus Semua' : 'Pilih Semua'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS_BY_LEVEL['SD'].map(subject => {
                      const selected = selectedSubjects.sd.includes(subject)
                      return (
                        <button
                          key={subject}
                          onClick={() => toggleSubject('sd', subject)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                            selected
                              ? 'bg-green-600 text-white border-green-600 shadow-sm'
                              : 'bg-background text-foreground border-border hover:border-green-500/50 hover:text-green-600'
                          }`}
                        >
                          {selected && <span className="mr-1">✓</span>}
                          {subject}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SMP */}
              {hasSMP && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground">SMP</h4>
                    <button
                      onClick={() => toggleAllSubjects('smp')}
                      className="text-xs text-primary hover:underline"
                    >
                      {selectedSubjects.smp.length === SUBJECTS_BY_LEVEL['SMP'].length ? 'Hapus Semua' : 'Pilih Semua'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS_BY_LEVEL['SMP'].map(subject => {
                      const selected = selectedSubjects.smp.includes(subject)
                      return (
                        <button
                          key={subject}
                          onClick={() => toggleSubject('smp', subject)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                            selected
                              ? 'bg-green-600 text-white border-green-600 shadow-sm'
                              : 'bg-background text-foreground border-border hover:border-green-500/50 hover:text-green-600'
                          }`}
                        >
                          {selected && <span className="mr-1">✓</span>}
                          {subject}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SMA */}
              {hasSMA && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground">SMA</h4>
                    <button
                      onClick={() => toggleAllSubjects('sma')}
                      className="text-xs text-primary hover:underline"
                    >
                      {selectedSubjects.sma.length === SUBJECTS_BY_LEVEL['SMA'].length ? 'Hapus Semua' : 'Pilih Semua'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS_BY_LEVEL['SMA'].map(subject => {
                      const selected = selectedSubjects.sma.includes(subject)
                      return (
                        <button
                          key={subject}
                          onClick={() => toggleSubject('sma', subject)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                            selected
                              ? 'bg-green-600 text-white border-green-600 shadow-sm'
                              : 'bg-background text-foreground border-border hover:border-green-500/50 hover:text-green-600'
                          }`}
                        >
                          {selected && <span className="mr-1">✓</span>}
                          {subject}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {isComplete && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-primary mb-2">Ringkasan Pilihan Anda</p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Kelas ({selectedLevels.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {selectedLevels.sort().map(l => (
                    <Badge key={l} variant="secondary" className="text-[10px]">
                      {l}
                    </Badge>
                  ))}
                </div>
              </div>
              {selectedSubjects.sd.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SD ({selectedSubjects.sd.length}):</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSubjects.sd.sort().map(s => (
                      <Badge key={s} variant="secondary" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedSubjects.smp.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SMP ({selectedSubjects.smp.length}):</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSubjects.smp.sort().map(s => (
                      <Badge key={s} variant="secondary" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedSubjects.sma.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SMA ({selectedSubjects.sma.length}):</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedSubjects.sma.sort().map(s => (
                      <Badge key={s} variant="secondary" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleSave}
        disabled={saving || !isComplete}
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
            Simpan Minat Mengajar
          </>
        )}
      </Button>
    </div>
  )
}