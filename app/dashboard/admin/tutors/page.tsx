'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface Tutor {
  id: string
  user_id: string
  full_name: string
  email: string
  subjects: string[]
  experience_years: number
  status: 'pending_curation' | 'approved' | 'rejected' | 'active' | 'inactive'
  hourly_rate: number
  rating: number
  created_at: string
}

export default function AdminTutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    const loadTutors = async () => {
      try {
        const supabase = createClient()
        let query = supabase
          .from('tutors')
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
        const mappedTutors = data?.map((tutor: any) => ({
          ...tutor,
          email: tutor.user?.email || '',
          full_name: tutor.user?.full_name || 'Unknown',
        })) || []

        setTutors(mappedTutors)
      } catch (err) {
        console.error('Error loading tutors:', err)
      } finally {
        setLoading(false)
      }
    }

    loadTutors()
  }, [filterStatus])

  const filteredTutors = tutors.filter((tutor) =>
    tutor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tutor.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_curation':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" /> Menunggu Review
          </Badge>
        )
      case 'approved':
        return (
          <Badge className="bg-green-500/20 text-green-300 hover:bg-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Disetujui
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-500/20 text-red-300 hover:bg-red-500/30">
            <XCircle className="w-3 h-3 mr-1" /> Ditolak
          </Badge>
        )
      case 'active':
        return (
          <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30">
            Aktif
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return <div>Memuat...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Daftar Tutor</h1>
        <p className="text-muted-foreground">Kelola dan verifikasi data tutor di platform</p>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
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
          <option value="pending_curation">Menunggu Review</option>
          <option value="approved">Disetujui</option>
          <option value="active">Aktif</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      {/* Tutors Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border/30 bg-primary/5">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Nama</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Mata Pelajaran</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Pengalaman</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Rating</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Tarif/Jam</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredTutors.map((tutor) => (
                <tr key={tutor.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4 text-sm text-foreground">{tutor.full_name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{tutor.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-1 flex-wrap">
                      {tutor.subjects?.slice(0, 2).map((subject, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                      {tutor.subjects?.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{tutor.subjects.length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{tutor.experience_years} tahun</td>
                  <td className="px-6 py-4 text-sm text-foreground">{tutor.rating?.toFixed(1)}/5</td>
                  <td className="px-6 py-4 text-sm text-foreground">Rp {tutor.hourly_rate?.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 text-sm">{getStatusBadge(tutor.status)}</td>
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

        {filteredTutors.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Tidak ada tutor yang ditemukan
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Tutor</p>
          <p className="text-2xl font-bold text-foreground">{tutors.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Menunggu Review</p>
          <p className="text-2xl font-bold text-yellow-300">{tutors.filter(t => t.status === 'pending_curation').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Aktif</p>
          <p className="text-2xl font-bold text-green-300">{tutors.filter(t => t.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Ditolak</p>
          <p className="text-2xl font-bold text-red-300">{tutors.filter(t => t.status === 'rejected').length}</p>
        </Card>
      </div>
    </div>
  )
}
