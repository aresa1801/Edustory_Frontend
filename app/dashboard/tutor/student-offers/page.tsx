'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import {
  DollarSign,
  MapPin,
  BookMarked,
  Clock,
  Send,
  Lock,
  UserCircle,
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

export default function StudentOffersPage() {
  const { user: authUser, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [tutorVerified, setTutorVerified] = useState(false)
  const [tutorId, setTutorId] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Guard untuk mencegah fetch ganda
  const fetchedRef = useRef(false)

  useEffect(() => {
    // Jangan jalankan jika auth masih loading
    if (authLoading) return

    // Jika tidak ada user, set loading selesai
    if (!authUser) {
      setLoading(false)
      return
    }

    // Cegah fetch berulang
    if (fetchedRef.current) return
    fetchedRef.current = true

    let isMounted = true
    const supabase = createClient()

    const fetchData = async () => {
      try {
        // 1. Cek tutor (opsional, hanya untuk tombol)
        const { data: tutor } = await supabase
          .from('tutors')
          .select('id, verified')
          .eq('user_id', authUser.id)
          .maybeSingle()

        if (isMounted && tutor) {
          setTutorId(tutor.id)
          setTutorVerified(tutor.verified || false)
        }

        // 2. Ambil SEMUA students (tanpa filter)
        const { data, error: studentsErr } = await supabase
          .from('students')
          .select('id, name, grade_level, subjects, budget_per_month, sessions_per_month, preferred_schedule, address, avatar_url')
          .order('created_at', { ascending: false })

        if (studentsErr) throw studentsErr

        if (isMounted) {
          setStudents(data || [])
        }
      } catch (err: any) {
        if (isMounted) setError(err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [authUser, authLoading]) // Dependensi hanya authUser dan authLoading

  // Jika auth atau data masih loading, tampilkan spinner
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
        <p className="ml-3">Memuat...</p>
      </div>
    )
  }

  // Render utama
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daftar Siswa</h1>
        <p className="text-muted-foreground">Temukan siswa & kirim penawaran.</p>

        {!tutorId && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
            <UserCircle className="w-4 h-4 inline mr-1" />
            Anda belum terdaftar sebagai tutor. Daftar untuk bisa mengirim penawaran.
          </div>
        )}
        {tutorId && !tutorVerified && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-amber-700 text-sm">
            <Lock className="w-4 h-4 inline mr-1" />
            Tutor belum diverifikasi. Penawaran tidak bisa dikirim.
          </div>
        )}
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            ❌ {error}
          </div>
        )}
      </div>

      {students.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Belum ada siswa yang terdaftar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {students.map((student) => {
            const costPerSession =
              student.budget_per_month && student.sessions_per_month
                ? Math.round(student.budget_per_month / student.sessions_per_month)
                : 0

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
                      disabled={!tutorVerified || sending === student.id || !tutorId}
                      onClick={async () => {
                        if (!tutorId) return alert('Profil tutor tidak ditemukan.')
                        if (!tutorVerified) return alert('Tutor belum diverifikasi.')

                        const subject = student.subjects?.[0] || 'Umum'
                        setSending(student.id)
                        try {
                          const supabase = createClient()
                          const { error } = await supabase.from('matches').insert({
                            tutor_id: tutorId,
                            student_id: student.id,
                            subject,
                            status: 'pending',
                            initiated_by: 'tutor',
                            lesson_frequency: 'flexible',
                            start_date: new Date().toISOString().split('T')[0],
                          })
                          if (error) throw error
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
  )
}