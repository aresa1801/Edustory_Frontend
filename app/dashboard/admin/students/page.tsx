'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, Users, User, Phone, MapPin, BookOpen, Calendar, GraduationCap, Mail } from 'lucide-react'

interface Student {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string
  education_level: string
  subjects_interested: string[]
  location: string
  status: 'active' | 'inactive'
  created_at: string
  // extended fields shown in detail
  grade_level?: string
  learning_goals?: string
  preferred_schedule?: string
  sessions_per_month?: number
  budget_per_month?: number
  school_name?: string
  school_type?: string
  school_city?: string
  parent_name?: string
  parent_phone?: string
  parent_email?: string
  bio?: string
  gender?: string
  birth_date?: string
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const supabase = createClient()
        let query = supabase
          .from('students')
          .select(`
            *,
            user:users_profile(email, full_name)
          `)

        if (filterStatus !== 'all') {
          query = query.eq('status', filterStatus)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error

        // Map data to include email
        const mappedStudents = data?.map((student: any) => ({
          ...student,
          email: student.user?.email || '',
          full_name: student.full_name || student.user?.full_name || 'Unknown',
        })) || []

        setStudents(mappedStudents)
      } catch (err) {
        console.error('Error loading students:', err)
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [filterStatus])

  const filteredStudents = students.filter((student) =>
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.phone?.includes(searchTerm)
  )

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-green-500/20 text-green-300 hover:bg-green-500/30">
        Aktif
      </Badge>
    ) : (
      <Badge variant="outline">
        Tidak Aktif
      </Badge>
    )
  }

  if (loading) {
    return <div>Memuat...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Daftar Siswa Aktif</h1>
        <p className="text-muted-foreground">Kelola data siswa yang terdaftar di platform</p>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama, email, atau nomor telepon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border/30 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg border border-border/30 bg-card text-foreground focus:outline-none focus:border-primary/50"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Tidak Aktif</option>
        </select>
      </div>

      {/* Students Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border/30 bg-primary/5">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Nama</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Telepon</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Tingkat Pendidikan</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Lokasi</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Mata Pelajaran</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4 text-sm text-foreground">{student.full_name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{student.email}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{student.phone}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{student.education_level}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{student.location}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-1 flex-wrap">
                      {student.subjects_interested?.slice(0, 2).map((subject, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                      {student.subjects_interested?.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{student.subjects_interested.length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{getStatusBadge(student.status)}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
                    >
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Tidak ada siswa yang ditemukan
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Siswa</p>
          <p className="text-2xl font-bold text-foreground">{students.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Siswa Aktif</p>
          <p className="text-2xl font-bold text-green-300">{students.filter(s => s.status === 'active').length}</p>
        </Card>
      </div>

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Detail Siswa
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 text-sm">
              {/* Identity */}
              <div className="rounded-lg border border-border/30 p-4 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4" /> Identitas Siswa
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs">Nama Lengkap</p>
                    <p className="font-medium">{selectedStudent.full_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Status</p>
                    {getStatusBadge(selectedStudent.status)}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Email</p>
                    <p className="font-medium">{selectedStudent.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Telepon</p>
                    <p className="font-medium">{selectedStudent.phone || '—'}</p>
                  </div>
                  {selectedStudent.gender && (
                    <div>
                      <p className="text-muted-foreground text-xs">Jenis Kelamin</p>
                      <p className="font-medium">{selectedStudent.gender}</p>
                    </div>
                  )}
                  {selectedStudent.birth_date && (
                    <div>
                      <p className="text-muted-foreground text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Tanggal Lahir</p>
                      <p className="font-medium">{selectedStudent.birth_date}</p>
                    </div>
                  )}
                  {selectedStudent.location && (
                    <div>
                      <p className="text-muted-foreground text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> Lokasi</p>
                      <p className="font-medium">{selectedStudent.location}</p>
                    </div>
                  )}
                  {selectedStudent.bio && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Bio</p>
                      <p className="font-medium">{selectedStudent.bio}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* School */}
              {(selectedStudent.school_name || selectedStudent.education_level) && (
                <div className="rounded-lg border border-border/30 p-4 space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" /> Data Sekolah
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedStudent.school_name && (
                      <div>
                        <p className="text-muted-foreground text-xs">Nama Sekolah</p>
                        <p className="font-medium">{selectedStudent.school_name}</p>
                      </div>
                    )}
                    {selectedStudent.school_type && (
                      <div>
                        <p className="text-muted-foreground text-xs">Jenis Sekolah</p>
                        <p className="font-medium">{selectedStudent.school_type}</p>
                      </div>
                    )}
                    {selectedStudent.school_city && (
                      <div>
                        <p className="text-muted-foreground text-xs">Kota Sekolah</p>
                        <p className="font-medium">{selectedStudent.school_city}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs">Tingkat Pendidikan</p>
                      <p className="font-medium">{selectedStudent.education_level || selectedStudent.grade_level || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Learning */}
              <div className="rounded-lg border border-border/30 p-4 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Minat & Rencana Belajar
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Mata Pelajaran</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedStudent.subjects_interested?.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                      )) || <span>—</span>}
                    </div>
                  </div>
                  {selectedStudent.learning_goals && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Tujuan Belajar</p>
                      <p className="font-medium">{selectedStudent.learning_goals}</p>
                    </div>
                  )}
                  {selectedStudent.preferred_schedule && (
                    <div>
                      <p className="text-muted-foreground text-xs">Jadwal Belajar</p>
                      <p className="font-medium">{selectedStudent.preferred_schedule}</p>
                    </div>
                  )}
                  {selectedStudent.sessions_per_month != null && (
                    <div>
                      <p className="text-muted-foreground text-xs">Sesi per Bulan</p>
                      <p className="font-medium">{selectedStudent.sessions_per_month}×</p>
                    </div>
                  )}
                  {selectedStudent.budget_per_month != null && (
                    <div>
                      <p className="text-muted-foreground text-xs">Budget/Bulan</p>
                      <p className="font-medium">Rp {selectedStudent.budget_per_month?.toLocaleString('id-ID')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Parent */}
              {(selectedStudent.parent_name || selectedStudent.parent_phone) && (
                <div className="rounded-lg border border-border/30 p-4 space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" /> Data Orang Tua
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedStudent.parent_name && (
                      <div>
                        <p className="text-muted-foreground text-xs">Nama Orang Tua</p>
                        <p className="font-medium">{selectedStudent.parent_name}</p>
                      </div>
                    )}
                    {selectedStudent.parent_phone && (
                      <div>
                        <p className="text-muted-foreground text-xs">Telepon Orang Tua</p>
                        <p className="font-medium">{selectedStudent.parent_phone}</p>
                      </div>
                    )}
                    {selectedStudent.parent_email && (
                      <div>
                        <p className="text-muted-foreground text-xs">Email Orang Tua</p>
                        <p className="font-medium">{selectedStudent.parent_email}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Terdaftar: {new Date(selectedStudent.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
