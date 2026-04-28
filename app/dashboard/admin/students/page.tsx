'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Users } from 'lucide-react'

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
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

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
          full_name: student.user?.full_name || 'Unknown',
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
    student.phone.includes(searchTerm)
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
                    <button className="px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium">
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
    </div>
  )
}
