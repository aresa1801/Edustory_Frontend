'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/auth'
import {
  DollarSign,
  MapPin,
  School,
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
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [tutorVerified, setTutorVerified] = useState(false)
  const [tutorId, setTutorId] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // Cek data tutor (verified)
        const { data: tutor } = await supabase
          .from('tutors')
          .select('id, verified')
          .eq('user_id', user.id)
          .single()

        if (tutor) {
          setTutorId(tutor.id)
          setTutorVerified(tutor.verified || false)
        }

        // Ambil semua siswa aktif & onboarding_complete
        const { data: studentsData, error } = await supabase
          .from('students')
          .select(`
            id,
            name,
            grade_level,
            subjects,
            budget_per_month,
            sessions_per_month,
            preferred_schedule,
            address,
            avatar_url
          `)
          .eq('status', 'active')
          .eq('onboarding_complete', true)
          .not('budget_per_month', 'is', null)
          .order('created_at', { ascending: false })

        if (error) throw error
        setStudents(studentsData || [])
      } catch (err) {
        console.error('Error fetching students:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSendOffer = async (studentId: string) => {
    if (!tutorId) {
      alert('Anda belum memiliki profil tutor. Silakan lengkapi profil terlebih dahulu.')
      return
    }
    if (!tutorVerified) {
      alert('Anda belum lulus kurasi. Silakan selesaikan kurasi terlebih dahulu.')
      return
    }

    const student = students.find(s => s.id === studentId)
    if (!student) return
    const subject = student.subjects?.[0] || 'Umum'

    setSending(studentId)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('matches').insert({
        tutor_id: tutorId,
        student_id: studentId,
        subject: subject,
        status: 'pending',
        initiated_by: 'tutor',
        lesson_frequency: 'flexible',
        start_date: new Date().toISOString().split('T')[0],
      })

      if (error) throw error
      alert('Penawaran berhasil dikirim!')
      // Refresh data agar tombol berubah status (opsional)
      window.location.reload()
    } catch (err) {
      alert('Gagal mengirim penawaran: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSending(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Daftar Siswa</h1>
        <p className="text-muted-foreground">
          Temukan siswa yang membutuhkan bimbingan dan kirim penawaran Anda.
        </p>
        {!tutorVerified && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Anda belum lulus kurasi. Kirim penawaran hanya bisa dilakukan setelah kurasi selesai.
          </div>
        )}
      </div>

      {students.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Belum ada siswa yang terdaftar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {students.map((student) => {
            const costPerSession = student.budget_per_month && student.sessions_per_month
              ? Math.round(student.budget_per_month / student.sessions_per_month)
              : 0

            return (
              <Card key={student.id} className="border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-5">
                  {/* Avatar + Nama */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {student.avatar_url ? (
                        <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        student.name?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{student.name || 'Siswa'}</h3>
                      {student.grade_level && (
                        <Badge variant="secondary" className="text-xs">
                          {student.grade_level}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Detail */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="w-4 h-4 mr-1.5 text-green-500" />
                      {costPerSession > 0 ? (
                        <span>Rp {costPerSession.toLocaleString('id-ID')}/sesi</span>
                      ) : (
                        <span className="text-muted-foreground">Belum diatur</span>
                      )}
                    </div>
                    <div className="flex items-start text-muted-foreground">
                      <BookMarked className="w-4 h-4 mr-1.5 mt-0.5 text-purple-400 flex-shrink-0" />
                      <span>
                        {student.subjects?.length > 0 ? student.subjects.join(', ') : 'Belum ada mata pelajaran'}
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

                  {/* Tombol kirim penawaran */}
                  <div className="mt-4">
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                      disabled={!tutorVerified || sending === student.id}
                      onClick={() => handleSendOffer(student.id)}
                    >
                      {sending === student.id ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Kirim Penawaran
                    </Button>
                    {!tutorVerified && (
                      <p className="text-[10px] text-muted-foreground mt-1 text-center">
                        * Kurasi diperlukan untuk mengirim penawaran
                      </p>
                    )}
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