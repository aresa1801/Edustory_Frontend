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
  Sparkles,
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

  // Fungsi fetch data
  const fetchData = async () => {
    if (!authUser) return

    try {
      setLoading(true)
      setError(null)

      const tutorRes = await fetch(`/api/tutors/profile?user_id=${authUser.id}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      })
      if (tutorRes.ok) {
        const result = await tutorRes.json()
        if (isMounted.current) setTutorProfile(result.tutor)
      }

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

  const handleRefresh = () => {
    fetchData()
  }

  // === HELPER: hitung harga per sesi student ===
  const getStudentRate = (student: Student): number => {
    if (student.budget_per_month && student.sessions_per_month && student.sessions_per_month > 0) {
      return Math.round(student.budget_per_month / student.sessions_per_month)
    }
    return 0
  }

  // === HELPER: cek kecocokan grade ===
  const isGradeMatched = (student: Student, tutor: TutorProfile): boolean => {
    const studentGrade = student.grade_level || ''
    const tutorGrades = tutor.verified_grade_levels || []
    return tutorGrades.some(g => {
      const lowerStudent = studentGrade.toLowerCase()
      const lowerGrade = g.toLowerCase()
      return (
        (lowerStudent.includes('sd') && lowerGrade.includes('sd')) ||
        (lowerStudent.includes('smp') && lowerGrade.includes('smp')) ||
        (lowerStudent.includes('sma') && lowerGrade.includes('sma'))
      )
    })
  }

  // === HELPER: cek kecocokan tarif ===
  const isRateMatched = (student: Student, tutor: TutorProfile): boolean => {
    const studentRate = getStudentRate(student)
    const tutorRate = tutor.hourly_rate || 0
    return studentRate > 0 && tutorRate > 0 && studentRate === tutorRate
  }

  // === HELPER: daftar mata pelajaran yang match ===
  const getMatchedSubjects = (student: Student, tutor: TutorProfile): string[] => {
    const tutorSubjects = new Set<string>()
    ;(tutor.specializations_sd || []).forEach(s => tutorSubjects.add(s))
    ;(tutor.specializations_smp || []).forEach(s => tutorSubjects.add(s))
    ;(tutor.specializations_sma || []).forEach(s => tutorSubjects.add(s))

    return (student.subjects || []).filter(subj => tutorSubjects.has(subj))
  }

  // === Hitung total kesamaan ===
  const calculateMatchCount = (student: Student, tutor: TutorProfile): number => {
    let count = 0
    // Mata pelajaran yang match
    count += getMatchedSubjects(student, tutor).length
    // Grade match
    if (isGradeMatched(student, tutor)) count += 1
    // Tarif match
    if (isRateMatched(student, tutor)) count += 1
    return count
  }

  // Filter + Sorting
  const filteredAndSortedStudents = (() => {
    if (!tutorProfile) return students

    let result = students
    if (filterOption !== 'all') {
      result = result.filter(student => {
        const count = calculateMatchCount(student, tutorProfile)
        return count >= filterOption
      })
    }

    return [...result].sort((a, b) => {
      const countA = calculateMatchCount(a, tutorProfile)
      const countB = calculateMatchCount(b, tutorProfile)
      return countB - countA
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
            Menampilkan {filteredAndSortedStudents.length} dari {students.length} siswa
          </span>
        </div>
      )}

      {/* Daftar Student */}
      <div ref={listRef}>
        {filteredAndSortedStudents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UserCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Tidak ada siswa yang sesuai dengan filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredAndSortedStudents.map((student) => {
              const studentRate = getStudentRate(student)
              const matchCount = tutorProfile ? calculateMatchCount(student, tutorProfile) : 0
              const gradeMatched = tutorProfile ? isGradeMatched(student, tutorProfile) : false
              const rateMatched = tutorProfile ? isRateMatched(student, tutorProfile) : false
              const matchedSubjects = tutorProfile ? getMatchedSubjects(student, tutorProfile) : []

              // Badge "Recommended!" jika matchCount >= 3
              const isRecommended = matchCount >= 3

              return (
                <Card key={student.id} className="border shadow-sm hover:shadow-md relative overflow-hidden">
                  {/* Badge Recommended! - mewah */}
                  {isRecommended && (
                    <div className="absolute top-3 left-3 z-10">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-amber-500/30 border border-white/20 animate-pulse">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        Recommended!
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  )}

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
                        {/* Badge Kelas */}
                        {student.grade_level && (
                          <Badge
                            variant="secondary"
                            className={`
                              text-xs
                              ${gradeMatched
                                ? 'bg-amber-100 text-amber-800 border-amber-300 font-semibold shadow-sm ring-1 ring-amber-400/50'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                              }
                            `}
                          >
                            {student.grade_level}
                          </Badge>
                        )}
                        {/* Badge kesamaan */}
                        {tutorProfile && matchCount > 0 && (
                          <Badge variant="outline" className="ml-1 text-xs border-green-300 text-green-700">
                            {matchCount} kesamaan
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      {/* Tarif – dengan highlight emas jika match */}
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1.5 text-green-500" />
                        <span
                          className={
                            rateMatched
                              ? 'text-amber-600 font-semibold bg-amber-50 px-1 rounded'
                              : 'text-muted-foreground'
                          }
                        >
                          {studentRate > 0
                            ? `Rp ${studentRate.toLocaleString('id-ID')}/jam`
                            : 'Belum diatur'}
                        </span>
                      </div>

                      {/* Mata Pelajaran – yang tidak match tetap normal */}
                      <div className="flex items-start">
                        <BookMarked className="w-4 h-4 mr-1.5 mt-0.5 text-purple-400 flex-shrink-0" />
                        <span className="text-muted-foreground">
                          {student.subjects?.length > 0 ? (
                            student.subjects.map((subj, idx) => {
                              const isMatched = matchedSubjects.includes(subj)
                              return (
                                <span key={idx}>
                                  <span
                                    className={
                                      isMatched
                                        ? 'text-amber-600 font-semibold bg-amber-50 px-1 rounded'
                                        : 'text-muted-foreground'
                                    }
                                  >
                                    {subj}
                                  </span>
                                  {idx < student.subjects.length - 1 && ', '}
                                </span>
                              )
                            })
                          ) : (
                            'Belum ada mapel'
                          )}
                        </span>
                      </div>

                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 mr-1.5 mt-0.5 text-blue-400 flex-shrink-0" />
                        <span className="text-muted-foreground">{student.address || 'Alamat belum diisi'}</span>
                      </div>

                      <div className="flex items-start">
                        <Clock className="w-4 h-4 mr-1.5 mt-0.5 text-orange-400 flex-shrink-0" />
                        <span className="text-muted-foreground">{student.preferred_schedule || 'Jadwal belum ditentukan'}</span>
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