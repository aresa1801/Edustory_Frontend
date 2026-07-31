'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth-context'
import {
  DollarSign,
  MapPin,
  BookMarked,
  Clock,
  Send,
  Lock,
  UserCircle,
  AlertTriangle,
  UserPlus,
  Filter,
  RefreshCw,
} from 'lucide-react'

interface Student {
  id: string
  name: string
  grade_level: string
  subjects: string[]
  budget_per_month: number
  sessions_per_month: number
  preferred_schedule: string
  address: string
  avatar_url: string | null
}

interface TutorProfile {
  id: string
  full_name: string
  phone: string
  bio: string
  experience_years: number
  hourly_rate: number
  qualifications: string
  approval_status: string
  verified: boolean
  specializations_sd: string[]
  specializations_smp: string[]
  specializations_sma: string[]
  verified_grade_levels: string[]
}

type FilterOption = 'all' | 1 | 2 | 3

export default function StudentOffersPage() {
  const router = useRouter()
  const { user: authUser, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterOption, setFilterOption] = useState<FilterOption>('all')

  const listRef = useRef<HTMLDivElement>(null)
  const isMounted = useRef(true)
  const fetchAbortController = useRef<AbortController | null>(null)

  // Fungsi fetch data dengan cache bypass total
  const fetchData = async () => {
  if (!authUser) return

  try {
    setLoading(true)
    setError(null)

    // Fetch tutor
    const tutorRes = await fetch(`/api/tutors/profile?user_id=${authUser.id}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    })
    if (tutorRes.ok) {
      const result = await tutorRes.json()
      if (isMounted.current) setTutorProfile(result.tutor)
    }

    // Fetch students
    const res = await fetch('/api/tutors/students', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    })
    if (!res.ok) throw new Error('Gagal mengambil data siswa')
    const data = await res.json()
    if (isMounted.current) {
      setStudents([...(data.students || [])])
    }
  } catch (err: any) {
    if (isMounted.current) setError(err.message)
  } finally {
    if (isMounted.current) setLoading(false)
  }
}

  // Fetch awal
  useEffect(() => {
    isMounted.current = true
    if (authLoading) return
    if (!authUser) {
      setLoading(false)
      return
    }

    fetchData()

    return () => {
      isMounted.current = false
      if (fetchAbortController.current) {
        fetchAbortController.current.abort()
      }
    }
  }, [authUser?.id, authLoading])

  // Refresh manual
  const handleRefresh = () => {
    fetchData()
  }

  // Fungsi hitung kesamaan
  const calculateMatchCount = (student: Student, tutor: TutorProfile): number => {
    const tutorSubjects = new Set<string>()
    ;(tutor.specializations_sd || []).forEach(s => tutorSubjects.add(s))
    ;(tutor.specializations_smp || []).forEach(s => tutorSubjects.add(s))
    ;(tutor.specializations_sma || []).forEach(s => tutorSubjects.add(s))

    let matchCount = 0
    ;(student.subjects || []).forEach(subj => {
      if (tutorSubjects.has(subj)) matchCount++
    })

    const studentGrade = student.grade_level || ''
    const tutorGrades = tutor.verified_grade_levels || []
    const gradeMatch = tutorGrades.some(g => {
      const lowerStudent = studentGrade.toLowerCase()
      const lowerGrade = g.toLowerCase()
      return (
        (lowerStudent.includes('sd') && lowerGrade.includes('sd')) ||
        (lowerStudent.includes('smp') && lowerGrade.includes('smp')) ||
        (lowerStudent.includes('sma') && lowerGrade.includes('sma'))
      )
    })
    if (gradeMatch) matchCount += 1
    return matchCount
  }

  // Filter
  const filteredStudents = (() => {
    if (filterOption === 'all' || !tutorProfile) {
      return students
    }
    return students.filter(student => {
      const count = calculateMatchCount(student, tutorProfile)
      return count >= filterOption
    })
  })()

  // Cek kelengkapan profil
  const isProfileComplete = (profile: TutorProfile | null): boolean => {
    if (!profile) return false
    const hasSpec =
      (profile.specializations_sd && profile.specializations_sd.length > 0) ||
      (profile.specializations_smp && profile.specializations_smp.length > 0) ||
      (profile.specializations_sma && profile.specializations_sma.length > 0)
    return !!(
      profile.full_name?.trim() &&
      profile.phone?.trim() &&
      profile.experience_years > 0 &&
      profile.hourly_rate > 0 &&
      profile.qualifications?.trim() &&
      hasSpec
    )
  }

  const isVerified = tutorProfile?.verified === true
  const profileComplete = isProfileComplete(tutorProfile)
  const canSendOffer = profileComplete && isVerified

  const handleFilter = (option: FilterOption) => {
    setFilterOption(option)
    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="ml-3">Memuat...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daftar Siswa</h1>
          <p className="text-muted-foreground">Temukan siswa & kirim penawaran.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </Button>
      </div>

      {/* Peringatan profil tutor */}
      {!tutorProfile && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Anda belum memiliki profil tutor. Silakan lengkapi profil Anda terlebih dahulu.
            <Button
              variant="link"
              className="p-0 h-auto font-semibold text-blue-600"
              onClick={() => router.push('/dashboard/tutor/profile')}
            >
              <UserPlus className="w-4 h-4 inline mr-1" />
              Lengkapi Profil
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {tutorProfile && !profileComplete && (
        <Alert className="mt-4 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700">
            Profil tutor belum lengkap. Pastikan Anda mengisi nama, nomor HP, pengalaman, tarif, kualifikasi, dan minimal satu spesialisasi.
            <Button
              variant="link"
              className="p-0 h-auto font-semibold text-blue-600"
              onClick={() => router.push('/dashboard/tutor/profile')}
            >
              Lengkapi Profil
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {tutorProfile && profileComplete && !isVerified && (
        <Alert className="mt-4 border-amber-200 bg-amber-50">
          <Lock className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700">
            Akun tutor Anda belum diverifikasi. Anda belum bisa mengirim penawaran. Tunggu proses verifikasi admin.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>❌ {error}</AlertDescription>
        </Alert>
      )}

      {/* Filter */}
      {tutorProfile && profileComplete && students.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 py-2 border-t border-b border-gray-200">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <Button
            variant={filterOption === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilter('all')}
          >
            Semua
          </Button>
          <Button
            variant={filterOption === 1 ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilter(1)}
          >
            1 Kategori Sama
          </Button>
          <Button
            variant={filterOption === 2 ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilter(2)}
          >
            2 Kategori Sama
          </Button>
          <Button
            variant={filterOption === 3 ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilter(3)}
          >
            3 Kategori Sama
          </Button>
          <span className="text-sm text-gray-500 ml-2">
            Menampilkan {filteredStudents.length} dari {students.length} siswa
          </span>
        </div>
      )}

      {/* Daftar Student */}
      <div ref={listRef}>
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UserCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Tidak ada siswa yang sesuai dengan filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredStudents.map((student) => {
              const costPerSession =
                student.budget_per_month && student.sessions_per_month
                  ? Math.round(student.budget_per_month / student.sessions_per_month)
                  : 0

              const matchCount = tutorProfile ? calculateMatchCount(student, tutorProfile) : 0

              return (
                <Card key={student.id} className="border shadow-sm hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                        {student.avatar_url ? (
                          <img
                            src={student.avatar_url}
                            alt={student.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          student.name?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{student.name || 'Siswa'}</h3>
                        {student.grade_level && (
                          <Badge variant="secondary" className="text-xs">
                            {student.grade_level}
                          </Badge>
                        )}
                        {tutorProfile && matchCount > 0 && (
                          <Badge variant="outline" className="ml-1 text-xs border-green-300 text-green-700">
                            {matchCount} kesamaan
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <DollarSign className="w-4 h-4 mr-1.5 text-green-500" />
                        {costPerSession > 0
                          ? `Rp ${costPerSession.toLocaleString('id-ID')}/sesi`
                          : 'Belum diatur'}
                      </div>
                      <div className="flex items-start text-muted-foreground">
                        <BookMarked className="w-4 h-4 mr-1.5 mt-0.5 text-purple-400 flex-shrink-0" />
                        <span>
                          {student.subjects?.length > 0
                            ? student.subjects.join(', ')
                            : 'Belum ada mapel'}
                        </span>
                      </div>
                      <div className="flex items-start text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
                        <span>{student.address || 'Alamat belum diisi'}</span>
                      </div>
                      <div className="flex items-start text-muted-foreground">
                        <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400 flex-shrink-0" />
                        <span>{student.preferred_schedule || 'Jadwal belum ditentukan'}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Button
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                        disabled={!canSendOffer || sending === student.id}
                        onClick={async () => {
                          if (!canSendOffer) {
                            if (!profileComplete) {
                              alert('Lengkapi profil tutor Anda terlebih dahulu.')
                            } else if (!isVerified) {
                              alert('Tutor belum diverifikasi.')
                            }
                            return
                          }

                          const subject = student.subjects?.[0] || 'Umum'
                          setSending(student.id)
                          try {
                            const res = await fetch('/api/matches', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                tutor_id: tutorProfile!.id,
                                student_id: student.id,
                                subject,
                                status: 'pending',
                                initiated_by: 'tutor',
                                lesson_frequency: 'flexible',
                                start_date: new Date().toISOString().split('T')[0],
                              }),
                            })
                            if (!res.ok) {
                              const err = await res.json()
                              throw new Error(err.error || 'Gagal')
                            }
                            alert('✅ Penawaran berhasil dikirim!')
                          } catch (err: any) {
                            alert('❌ Gagal: ' + err.message)
                          } finally {
                            setSending(null)
                          }
                        }}
                      >
                        {sending === student.id ? (
                          <Spinner className="h-3.5 w-3.5" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Kirim Penawaran
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}