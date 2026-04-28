'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/auth'
import { Calendar, Clock, User, BookOpen } from 'lucide-react'

interface ScheduleItem {
  id: string
  studentName: string
  subject: string
  gradeLevel: string
  frequency: string
  startDate: string
  status: string
  phone?: string
}

const STATUS_COLORS: Record<string, string> = {
  matched: 'bg-green-500/20 text-green-300 border-green-500/30',
  active: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  completed: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

const STATUS_LABELS: Record<string, string> = {
  matched: 'Dikonfirmasi',
  active: 'Aktif Mengajar',
  pending: 'Menunggu',
  completed: 'Selesai',
}

const FREQUENCY_LABELS: Record<string, string> = {
  'once-a-week': '1× per minggu',
  'twice-a-week': '2× per minggu',
  'three-times-a-week': '3× per minggu',
  daily: 'Setiap hari',
  flexible: 'Fleksibel',
}

export default function SchedulePage() {
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: tutorData } = await supabase
          .from('tutors')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!tutorData) return

        const { data: matches, error: matchError } = await supabase
          .from('matches')
          .select(`
            id,
            subject,
            lesson_frequency,
            start_date,
            status,
            students:student_id(
              grade_level,
              users_profile:user_id(full_name, phone)
            )
          `)
          .eq('tutor_id', tutorData.id)
          .in('status', ['matched', 'active', 'pending'])
          .order('start_date', { ascending: true })

        if (matchError) throw matchError

        const items: ScheduleItem[] = (matches || []).map((m: any) => ({
          id: m.id,
          studentName: m.students?.users_profile?.full_name || 'Siswa',
          subject: m.subject || '-',
          gradeLevel: m.students?.grade_level || '-',
          frequency: m.lesson_frequency || 'flexible',
          startDate: m.start_date,
          status: m.status,
          phone: m.students?.users_profile?.phone,
        }))

        setSchedule(items)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat jadwal')
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

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Jadwal Mengajar</h1>
        <p className="text-muted-foreground">
          Lihat daftar sesi mengajar Anda berdasarkan pencocokan yang aktif.
        </p>
      </div>

      {schedule.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Belum Ada Jadwal</h3>
            <p className="text-muted-foreground">
              Jadwal akan muncul setelah Anda menerima permintaan dari siswa.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedule.map(item => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{item.studentName}</h3>
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <BookOpen className="w-4 h-4" />
                          <span>{item.subject} · Kelas {item.gradeLevel}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{FREQUENCY_LABELS[item.frequency] || item.frequency}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Mulai: {new Date(item.startDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant="outline"
                      className={`${STATUS_COLORS[item.status] || ''} border text-xs`}
                    >
                      {STATUS_LABELS[item.status] || item.status}
                    </Badge>
                    {item.phone && item.status === 'matched' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() =>
                          window.open(
                            `https://wa.me/${item.phone?.replace(/\D/g, '')}`,
                            '_blank'
                          )
                        }
                      >
                        💬 WhatsApp
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
