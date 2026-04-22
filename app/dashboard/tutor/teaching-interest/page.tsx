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
    levels: [
      'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3',
      'SD Kelas 4', 'SD Kelas 5', 'SD Kelas 6',
    ],
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
  SD: [
    'Matematika', 'Bahasa Indonesia', 'IPA', 'IPS',
    'Bahasa Inggris', 'PKN', 'Seni Budaya', 'Penjaskes',
  ],
  SMP: [
    'Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA',
    'IPS', 'PKN', 'Seni Budaya', 'Penjaskes', 'Informatika',
  ],
  SMA: [
    'Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'Fisika',
    'Kimia', 'Biologi', 'Ekonomi', 'Geografi', 'Sejarah',
    'Sosiologi', 'Informatika', 'PKN', 'Seni Budaya',
  ],
}

function getSubjectsForLevels(levels: string[]): string[] {
  const subjects = new Set<string>()
  levels.forEach(lvl => {
    if (lvl.startsWith('SD')) SUBJECTS_BY_LEVEL['SD'].forEach(s => subjects.add(s))
    else if (lvl.startsWith('SMP')) SUBJECTS_BY_LEVEL['SMP'].forEach(s => subjects.add(s))
    else if (lvl.startsWith('SMA')) SUBJECTS_BY_LEVEL['SMA'].forEach(s => subjects.add(s))
  })
  return Array.from(subjects).sort()
}

export default function TeachingInterestPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tutorId, setTutorId] = useState<string | null>(null)
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: tutorData } = await supabase
        .from('tutors')
        .select('id, specializations, verified_grade_levels, target_grade_level')
        .eq('user_id', user.id)
        .single()

      if (tutorData) {
        setTutorId(tutorData.id)
        const savedLevels: string[] = tutorData.verified_grade_levels || []
        const savedSubjects: string[] = tutorData.specializations || []
        setSelectedLevels(savedLevels)
        setSelectedSubjects(savedSubjects)
      }
    } catch (err) {
      setError('Gagal memuat data minat mengajar')
    } finally {
      setLoading(false)
    }
  }

  const toggleLevel = (level: string) => {
    const newLevels = selectedLevels.includes(level)
      ? selectedLevels.filter(l => l !== level)
      : [...selectedLevels, level]
    setSelectedLevels(newLevels)
    // Remove subjects that are no longer applicable after level change
    const availableSubjects = getSubjectsForLevels(newLevels)
    setSelectedSubjects(prev => prev.filter(s => availableSubjects.includes(s)))
  }

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    )
  }

  const toggleAllInGroup = (group: string, levels: string[]) => {
    const allSelected = levels.every(l => selectedLevels.includes(l))
    if (allSelected) {
      setSelectedLevels(prev => prev.filter(l => !levels.includes(l)))
      const remainingLevels = selectedLevels.filter(l => !levels.includes(l))
      const availableSubjects = getSubjectsForLevels(remainingLevels)
      setSelectedSubjects(prev => prev.filter(s => availableSubjects.includes(s)))
    } else {
      setSelectedLevels(prev => Array.from(new Set([...prev, ...levels])))
    }
  }

  const handleSave = async () => {
    if (selectedLevels.length === 0) {
      setError('Pilih minimal satu kelas yang ingin Anda ajarkan')
      return
    }
    if (selectedSubjects.length === 0) {
      setError('Pilih minimal satu mata pelajaran')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: updateErr } = await supabase
        .from('tutors')
        .update({
          specializations: selectedSubjects,
          verified_grade_levels: selectedLevels,
        })
        .eq('id', tutorId)

      if (updateErr) throw updateErr

      setSuccess('Minat mengajar berhasil disimpan!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan minat mengajar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const availableSubjects = getSubjectsForLevels(selectedLevels)
  const isComplete = selectedLevels.length > 0 && selectedSubjects.length > 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minat Mengajar</h1>
          <p className="text-slate-500 text-sm mt-1">
            Pilih kelas dan mata pelajaran yang ingin Anda ajarkan
          </p>
        </div>
        {isComplete ? (
          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5 px-3 py-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sudah Diisi
          </Badge>
        ) : (
          <Badge variant="outline" className="text-slate-500 border-slate-200 px-3 py-1.5">
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

      {/* Info */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800 text-sm flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Pilihan Anda akan digunakan untuk mencocokkan Anda dengan siswa yang sesuai setelah kurasi selesai.
            Anda dapat mengubah pilihan ini kapan saja sebelum kurasi.
          </span>
        </AlertDescription>
      </Alert>

      {/* Grade Levels */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Tingkat Kelas yang Ingin Diajarkan
            <span className="text-slate-400 font-normal">({selectedLevels.length} dipilih)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {GRADE_GROUPS.map(group => {
            const allGroupSelected = group.levels.every(l => selectedLevels.includes(l))
            const someGroupSelected = group.levels.some(l => selectedLevels.includes(l))

            return (
              <div key={group.label}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{group.label}</p>
                  <button
                    onClick={() => toggleAllInGroup(group.label, group.levels)}
                    className="text-xs text-blue-600 hover:underline"
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
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
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

      {/* Subjects */}
      <Card className={`border shadow-sm transition-opacity ${selectedLevels.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Mata Pelajaran yang Ingin Diajarkan
            <span className="text-slate-400 font-normal">({selectedSubjects.length} dipilih)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedLevels.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Pilih kelas terlebih dahulu untuk melihat mata pelajaran yang tersedia
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
                {availableSubjects.map(subject => {
                  const selected = selectedSubjects.includes(subject)
                  return (
                    <button
                      key={subject}
                      onClick={() => toggleSubject(subject)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        selected
                          ? 'bg-green-600 text-white border-green-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-green-300 hover:text-green-600'
                      }`}
                    >
                      {selected && <span className="mr-1">✓</span>}
                      {subject}
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSelectedSubjects(availableSubjects)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300 text-xs">|</span>
                <button
                  onClick={() => setSelectedSubjects([])}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Hapus Semua
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {isComplete && (
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-blue-700 mb-2">Ringkasan Pilihan Anda</p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-blue-600 mb-1">Kelas ({selectedLevels.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {selectedLevels.sort().map(l => (
                    <Badge key={l} className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                      {l}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-blue-600 mb-1">Mata Pelajaran ({selectedSubjects.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {selectedSubjects.sort().map(s => (
                    <Badge key={s} className="text-[10px] bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving || !isComplete}
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
            Simpan Minat Mengajar
          </>
        )}
      </Button>
    </div>
  )
}
