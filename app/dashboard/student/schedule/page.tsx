'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/auth'
import { Calendar, Clock, User, BookOpen, MapPin } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  matched: 'bg-green-500/20 text-green-300 border-green-500/30',
  active: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  completed: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
}

const STATUS_LABELS: Record<string, string> = {
  matched: 'Dikonfirmasi',
  active: 'Aktif Belajar',
  pending: 'Menunggu',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const FREQUENCY_LABELS: Record<string, string> = {
  'once-a-week': '1× per minggu',
  'twice-a-week': '2× per minggu',
  'three-times-a-week': '3× per minggu',
  daily: 'Setiap hari',
  flexible: 'Fleksibel',
}

interface ScheduleItem {
  id: string
  status: string
  subject: string
  frequency: string
  startDate: string
  tutorName: string
  tutorRating: number
  gradeLevel: string
}

export default function StudentSchedulePage() {
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [studentProfile, setStudentProfile] = useState<any>(null)

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: studentData, error: studentErr } = await supabase
          .from('students')
          .select('id, grade_level, preferred_schedule, sessions_per_month, budget_per_month')
          .eq('user_id', user.id)
          .single()

        // PGRST116 = no rows returned; treat as new student with no schedule
        if (studentErr && studentErr.code !== 'PGRST116') throw studentErr

        setStudentProfile(studentData)

        if (studentData?.id) {
          const { data: matches, error: matchErr } = await supabase
            .from('matches')
            .select(`
              id,
              status,
              subject,
              lesson_frequency,
              start_date,
              tutors:tutor_id(
                rating,
                user_profiles:user_id(name)
              )
            `)
            .eq('student_id', studentData.id)
            .in('status', ['matched', 'active', 'pending', 'completed'])
            .order('start_date', { ascending: true })

          if (matchErr && matchErr.code !== 'PGRST116') throw matchErr

          const items: ScheduleItem[] = (matches || []).map((m: any) => ({
            id: m.id,
            status: m.status,
            subject: m.subject || '-',
            frequency: m.lesson_frequency || 'flexible',
            startDate: m.start_date,
            tutorName: m.tutors?.user_profiles?.name || 'Tutor',
            tutorRating: m.tutors?.rating || 0,
            gradeLevel: studentData.grade_level || '-',
          }))

          setSchedule(items)
        }
      } catch (err) {
        console.error('Failed to load schedule:', err)
        // Show empty state instead of error page
      } finally {
        setLoading(false)
      }
    }

    fetchSchedule()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  // error is retained in state but we render empty state instead

  const activeSchedule = schedule.filter(s => ['matched', 'active'].includes(s.status))
  const pendingSchedule = schedule.filter(s => s.status === 'pending')
  const completedSchedule = schedule.filter(s => s.status === 'completed')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Jadwal Belajar</h1>
        <p className="text-muted-foreground">
          Jadwal sesi belajar Anda bersama tutor yang telah dikonfirmasi.
        </p>
      </div>

      {/* Learning Plan Summary */}
      {studentProfile && (
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Rencana Belajar Anda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {studentProfile.grade_level && (
                <div>
                  <p className="text-xs text-muted-foreground">Tingkat Kelas</p>
                  <p className="text-sm font-semibold text-foreground">{studentProfile.grade_level}</p>
                </div>
              )}
              {studentProfile.preferred_schedule && (
                <div>
                  <p className="text-xs text-muted-foreground">Jadwal Diinginkan</p>
                  <p className="text-sm font-semibold text-foreground">{studentProfile.preferred_schedule}</p>
                </div>
              )}
              {studentProfile.sessions_per_month && (
                <div>
                  <p className="text-xs text-muted-foreground">Pertemuan/Bulan</p>
                  <p className="text-sm font-semibold text-foreground">{studentProfile.sessions_per_month}× sesi</p>
                </div>
              )}
              {studentProfile.budget_per_month && (
                <div>
                  <p className="text-xs text-muted-foreground">Budget/Bulan</p>
                  <p className="text-sm font-semibold text-foreground">
                    Rp {Number(studentProfile.budget_per_month).toLocaleString('id-ID')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Aktif</p>
          <p className="text-2xl font-bold text-blue-300">{activeSchedule.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Menunggu</p>
          <p className="text-2xl font-bold text-yellow-300">{pendingSchedule.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Selesai</p>
          <p className="text-2xl font-bold text-green-300">{completedSchedule.length}</p>
        </Card>
      </div>

      {schedule.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Belum Ada Jadwal Belajar</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Jadwal akan muncul setelah Anda menerima penawaran dari tutor atau setelah tutor mengkonfirmasi permintaan Anda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedule.map(item => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{item.tutorName}</h3>
                      <div className="space-y-1 mt-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <BookOpen className="w-4 h-4" />
                          <span>{item.subject} · {item.gradeLevel}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{FREQUENCY_LABELS[item.frequency] || item.frequency}</span>
                        </div>
                        {item.startDate && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Mulai: {new Date(item.startDate).toLocaleDateString('id-ID', {
                                day: 'numeric', month: 'long', year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                        {item.tutorRating > 0 && (
                          <div className="flex items-center gap-1 text-sm text-yellow-300">
                            <span>★</span>
                            <span className="font-medium">{item.tutorRating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${STATUS_COLORS[item.status] || ''} border text-xs flex-shrink-0`}
                  >
                    {STATUS_LABELS[item.status] || item.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
