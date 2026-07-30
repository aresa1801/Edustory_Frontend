'use client'

import { useState, useEffect } from 'react'
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
  const { user, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [tutorVerified, setTutorVerified] = useState(false)
  const [tutorId, setTutorId] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugMessages, setDebugMessages] = useState<string[]>([])

  const addDebug = (msg: string) => {
    setDebugMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
    console.log('[StudentOffers]', msg)
  }

  useEffect(() => {
    if (authLoading) {
      addDebug('⏳ Auth loading...')
      return
    }

    if (!user) {
      addDebug('❌ No user from auth context')
      setLoading(false)
      return
    }

    let isMounted = true

    const fetchData = async () => {
      addDebug(`✅ User ditemukan: ${user.id}`)
      try {
        const supabase = createClient()

        // Ambil tutor
        addDebug('📡 Ambil data tutor...')
        const { data: tutor, error: tutorErr } = await supabase
          .from('tutors')
          .select('id, verified')
          .eq('user_id', user.id)
          .maybeSingle()

        if (tutorErr) {
          addDebug(`❌ Error tutor: ${tutorErr.message}`)
        } else if (tutor) {
          setTutorId(tutor.id)
          setTutorVerified(tutor.verified || false)
          addDebug(`✅ Tutor: ID=${tutor.id}, verified=${tutor.verified}`)
        } else {
          addDebug('⚠️ Tutor tidak ditemukan')
        }

        // 🔥 Ambil students (langsung dari Supabase, tanpa API)
        addDebug('📡 Query students...')
        const { data, error: queryErr } = await supabase
          .from('students')
          .select('id, name, grade_level, subjects, budget_per_month, sessions_per_month, preferred_schedule, address, avatar_url')
          .eq('status', 'active')
          .eq('onboarding_complete', true)
          .not('budget_per_month', 'is', null)
          .order('created_at', { ascending: false })

        if (queryErr) {
          addDebug(`❌ Query students error: ${queryErr.message}`)
          setError(queryErr.message)
        } else {
          addDebug(`✅ Query students sukses: ${data?.length || 0} siswa`)
          if (isMounted) {
            setStudents(data || [])
          }
        }
      } catch (err: any) {
        addDebug(`❌ Catch error: ${err.message}`)
        setError(err.message)
      } finally {
        if (isMounted) {
          setLoading(false)
          addDebug('🏁 Loading selesai')
        }
      }
    }

    fetchData()

    // Safety timeout
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        addDebug('⏱️ Force loading false (timeout)')
        setLoading(false)
        setError('Waktu muat habis. Coba refresh.')
      }
    }, 5000)

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [user, authLoading])

  const handleSendOffer = async (studentId: string) => {
    if (!tutorId) {
      alert('Anda belum memiliki profil tutor.')
      return
    }
    if (!tutorVerified) {
      alert('Tutor belum diverifikasi.')
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
      alert('✅ Penawaran berhasil dikirim!')
      setStudents(prev => prev.map(s =>
        s.id === studentId ? { ...s, alreadyApplied: true } : s
      ))
    } catch (err: any) {
      alert('❌ Gagal: ' + err.message)
    } finally {
      setSending(null)
    }
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
      {/* Debug Panel */}
      <div className="bg-gray-100 border border-gray-300 rounded p-3 text-xs font-mono text-gray-700 max-h-48 overflow-auto">
        <strong>🔍 Debug Log:</strong>
        {debugMessages.map((msg, i) => (
          <div key={i} className="border-b border-gray-200 py-0.5">{msg}</div>
        ))}
      </div>

      <div>
        <h1 className="text-2xl font-bold">Daftar Siswa</h1>
        <p className="text-muted-foreground">Temukan siswa & kirim penawaran.</p>

        {!tutorId && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
            <UserCircle className="w-4 h-4 inline mr-1" />
            ⚠️ Profil tutor tidak ditemukan. Pastikan Anda sudah membuat profil tutor.
          </div>
        )}
        {tutorId && !tutorVerified && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-amber-700 text-sm">
            <Lock className="w-4 h-4 inline mr-1" />
            ⚠️ Tutor belum diverifikasi. Kirim penawaran dinonaktifkan.
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
          <p className="text-sm">Pastikan ada siswa dengan status aktif, onboarding_complete, dan budget terisi.</p>
          <p className="text-xs text-muted-foreground mt-2">Lihat debug log di atas untuk detail error.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {students.map(student => {
            const costPerSession = student.budget_per_month && student.sessions_per_month
              ? Math.round(student.budget_per_month / student.sessions_per_month)
              : 0

            return (
              <Card key={student.id} className="border shadow-sm hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {student.avatar_url ? (
                        <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        student.name?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{student.name || 'Siswa'}</h3>
                      {student.grade_level && (
                        <Badge variant="secondary" className="text-xs">{student.grade_level}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="w-4 h-4 mr-1.5 text-green-500" />
                      {costPerSession > 0 ? `Rp ${costPerSession.toLocaleString('id-ID')}/sesi` : 'Belum diatur'}
                    </div>
                    <div className="flex items-start text-muted-foreground">
                      <BookMarked className="w-4 h-4 mr-1.5 mt-0.5 text-purple-400 flex-shrink-0" />
                      <span>{student.subjects?.length > 0 ? student.subjects.join(', ') : 'Belum ada mapel'}</span>
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
                      onClick={() => handleSendOffer(student.id)}
                    >
                      {sending === student.id ? <Spinner className="h-3.5 w-3.5" /> : <Send className="w-3.5 h-3.5" />}
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