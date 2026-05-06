'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search, CheckCircle2, XCircle, Clock, User, Phone, Mail,
  BookOpen, Star, DollarSign, Award, Video, FileImage, ExternalLink,
} from 'lucide-react'

interface Tutor {
  id: string
  user_id: string
  full_name: string
  email: string
  subjects: string[]
  specializations: string[]
  experience_years: number
  approval_status: 'pending_curation' | 'approved' | 'rejected' | 'active' | 'inactive'
  status: string
  hourly_rate: number
  rating: number
  qualifications: string[]
  bio: string
  phone: string
  verified: boolean
  created_at: string
  // nested from curation (loaded on demand)
  curationSubmissions?: {
    handwriting: any[]
    microteaching: any[]
  }
}

export default function AdminTutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadTutors = useCallback(async () => {
    try {
      const supabase = createClient()
      let query = supabase
        .from('tutors')
        .select(`
          *,
          user:users_profile(email, full_name)
        `)

      if (filterStatus !== 'all') {
        query = query.eq('approval_status', filterStatus)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      const mappedTutors = data?.map((tutor: any) => ({
        ...tutor,
        email: tutor.user?.email || '',
        full_name: tutor.full_name || tutor.user?.full_name || 'Unknown',
      })) || []

      setTutors(mappedTutors)
    } catch (err) {
      console.error('Error loading tutors:', err)
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    loadTutors()
  }, [loadTutors])

  const openDetail = async (tutor: Tutor) => {
    setSelectedTutor(tutor)
    setActionMessage(null)
    setShowRejectInput(false)
    setRejectionReason('')
    setDetailLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/admin/curation-review?tutor_id=${tutor.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.ok) {
        const submissions = await res.json()
        setSelectedTutor(prev => prev ? { ...prev, curationSubmissions: submissions } : prev)
      }
    } catch (err) {
      console.error('Error loading curation submissions:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedTutor) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      // Find the tutor application
      const { data: application } = await supabase
        .from('tutor_applications')
        .select('id')
        .eq('tutor_id', selectedTutor.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (application) {
        await fetch('/api/admin/tutor-applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ applicationId: application.id, status: 'approved' }),
        })
      } else {
        // Directly update tutor if no formal application record
        await supabase
          .from('tutors')
          .update({ approval_status: 'approved', verified: true })
          .eq('id', selectedTutor.id)
      }

      setActionMessage({ type: 'success', text: 'Tutor berhasil disetujui.' })
      setSelectedTutor(prev => prev ? { ...prev, approval_status: 'approved', verified: true } : prev)
      await loadTutors()
    } catch (err) {
      console.error('Approve error:', err)
      setActionMessage({ type: 'error', text: 'Gagal menyetujui tutor.' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedTutor || !rejectionReason.trim()) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const { data: application } = await supabase
        .from('tutor_applications')
        .select('id')
        .eq('tutor_id', selectedTutor.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (application) {
        await fetch('/api/admin/tutor-applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            applicationId: application.id,
            status: 'rejected',
            rejectionReason: rejectionReason,
          }),
        })
      } else {
        await supabase
          .from('tutors')
          .update({ approval_status: 'rejected' })
          .eq('id', selectedTutor.id)
      }

      setActionMessage({ type: 'success', text: 'Tutor berhasil ditolak.' })
      setSelectedTutor(prev => prev ? { ...prev, approval_status: 'rejected' } : prev)
      setShowRejectInput(false)
      await loadTutors()
    } catch (err) {
      console.error('Reject error:', err)
      setActionMessage({ type: 'error', text: 'Gagal menolak tutor.' })
    } finally {
      setActionLoading(false)
    }
  }

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
                      {(tutor.specializations || tutor.subjects)?.slice(0, 2).map((subject, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                      {(tutor.specializations || tutor.subjects)?.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(tutor.specializations || tutor.subjects).length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{tutor.experience_years} tahun</td>
                  <td className="px-6 py-4 text-sm text-foreground">{tutor.rating?.toFixed(1)}/5</td>
                  <td className="px-6 py-4 text-sm text-foreground">Rp {tutor.hourly_rate?.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 text-sm">{getStatusBadge(tutor.approval_status || tutor.status)}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => openDetail(tutor)}
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
          <p className="text-2xl font-bold text-yellow-300">{tutors.filter(t => t.approval_status === 'pending_curation').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Aktif</p>
          <p className="text-2xl font-bold text-green-300">{tutors.filter(t => t.approval_status === 'active' || t.approval_status === 'approved').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Ditolak</p>
          <p className="text-2xl font-bold text-red-300">{tutors.filter(t => t.approval_status === 'rejected').length}</p>
        </Card>
      </div>

      {/* Tutor Detail Dialog */}
      <Dialog open={!!selectedTutor} onOpenChange={(open) => !open && setSelectedTutor(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Detail Tutor
            </DialogTitle>
          </DialogHeader>
          {selectedTutor && (
            <div className="space-y-4 text-sm">

              {/* Action message */}
              {actionMessage && (
                <div className={`rounded-lg p-3 text-sm ${actionMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {actionMessage.text}
                </div>
              )}

              {/* Identity */}
              <div className="rounded-lg border border-border/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4" /> Profil Tutor
                  </h3>
                  {getStatusBadge(selectedTutor.approval_status || selectedTutor.status)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs">Nama Lengkap</p>
                    <p className="font-medium">{selectedTutor.full_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Email</p>
                    <p className="font-medium">{selectedTutor.email}</p>
                  </div>
                  {selectedTutor.phone && (
                    <div>
                      <p className="text-muted-foreground text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Telepon</p>
                      <p className="font-medium">{selectedTutor.phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1"><Award className="w-3 h-3" /> Pengalaman</p>
                    <p className="font-medium">{selectedTutor.experience_years} tahun</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1"><Star className="w-3 h-3" /> Rating</p>
                    <p className="font-medium">{selectedTutor.rating?.toFixed(1) || '—'}/5</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> Tarif/Jam</p>
                    <p className="font-medium">Rp {selectedTutor.hourly_rate?.toLocaleString('id-ID') || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Terverifikasi</p>
                    <p className="font-medium">{selectedTutor.verified ? '✅ Ya' : '❌ Belum'}</p>
                  </div>
                </div>
                {selectedTutor.bio && (
                  <div>
                    <p className="text-muted-foreground text-xs">Bio</p>
                    <p className="font-medium">{selectedTutor.bio}</p>
                  </div>
                )}
              </div>

              {/* Subjects & Qualifications */}
              <div className="rounded-lg border border-border/30 p-4 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Spesialisasi & Kualifikasi
                </h3>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Mata Pelajaran</p>
                  <div className="flex flex-wrap gap-1">
                    {(selectedTutor.specializations || selectedTutor.subjects)?.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                    )) || <span>—</span>}
                  </div>
                </div>
                {selectedTutor.qualifications?.length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Kualifikasi</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {selectedTutor.qualifications.map((q, i) => (
                        <li key={i} className="text-foreground">{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Curation Submissions */}
              {detailLoading ? (
                <div className="text-center text-muted-foreground py-4">Memuat data kurasi...</div>
              ) : selectedTutor.curationSubmissions && (
                <>
                  {/* Microteaching */}
                  {selectedTutor.curationSubmissions.microteaching?.length > 0 && (
                    <div className="rounded-lg border border-border/30 p-4 space-y-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Video className="w-4 h-4" /> Submission Microteaching
                      </h3>
                      {selectedTutor.curationSubmissions.microteaching.map((mt: any) => (
                        <div key={mt.id} className="space-y-2 border-t border-border/20 pt-2 first:border-t-0 first:pt-0">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-muted-foreground text-xs">Topik</p>
                              <p className="font-medium">{mt.topic_selected}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Dikumpulkan</p>
                              <p className="font-medium">{new Date(mt.submitted_at).toLocaleDateString('id-ID')}</p>
                            </div>
                          </div>
                          {mt.explanation && (
                            <div>
                              <p className="text-muted-foreground text-xs">Penjelasan Metode</p>
                              <p className="text-foreground">{mt.explanation}</p>
                            </div>
                          )}
                          {mt.video_url && (
                            <a
                              href={mt.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                            >
                              <ExternalLink className="w-3 h-3" /> Lihat Video
                            </a>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Skor Admin:</span>
                            <span className="font-medium">{mt.overall_score ?? '(belum dinilai)'}</span>
                            {mt.passed != null && (
                              <Badge className={mt.passed ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                                {mt.passed ? 'Lulus' : 'Tidak Lulus'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Handwriting */}
                  {selectedTutor.curationSubmissions.handwriting?.length > 0 && (
                    <div className="rounded-lg border border-border/30 p-4 space-y-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <FileImage className="w-4 h-4" /> Submission Tulisan Tangan
                      </h3>
                      {selectedTutor.curationSubmissions.handwriting.map((hw: any) => (
                        <div key={hw.id} className="space-y-2 border-t border-border/20 pt-2 first:border-t-0 first:pt-0">
                          <p className="text-muted-foreground text-xs">Dikumpulkan: {new Date(hw.submitted_at).toLocaleDateString('id-ID')}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-muted-foreground text-xs">Soal 1</p>
                              {hw.problem_1_image_url && (
                                <a href={hw.problem_1_image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
                                  <ExternalLink className="w-3 h-3" /> Lihat Gambar
                                </a>
                              )}
                              {hw.problem_1_explanation && <p className="text-foreground mt-1">{hw.problem_1_explanation}</p>}
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">Soal 2</p>
                              {hw.problem_2_image_url && (
                                <a href={hw.problem_2_image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
                                  <ExternalLink className="w-3 h-3" /> Lihat Gambar
                                </a>
                              )}
                              {hw.problem_2_explanation && <p className="text-foreground mt-1">{hw.problem_2_explanation}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Skor Admin:</span>
                            <span className="font-medium">{hw.overall_score ?? '(belum dinilai)'}</span>
                            {hw.passed != null && (
                              <Badge className={hw.passed ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                                {hw.passed ? 'Lulus' : 'Tidak Lulus'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Approve / Reject actions */}
              {(selectedTutor.approval_status === 'pending_curation' || !selectedTutor.verified) && (
                <div className="rounded-lg border border-border/30 p-4 space-y-3">
                  <h3 className="font-semibold text-foreground">Keputusan Kurasi</h3>
                  {showRejectInput ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Alasan penolakan (wajib diisi)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleReject}
                          disabled={actionLoading || !rejectionReason.trim()}
                        >
                          {actionLoading ? 'Memproses...' : 'Konfirmasi Tolak'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setShowRejectInput(false); setRejectionReason('') }}
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleApprove}
                        disabled={actionLoading}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {actionLoading ? 'Memproses...' : 'Setujui Tutor'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setShowRejectInput(true)}
                        disabled={actionLoading}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Tolak Tutor
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Terdaftar: {new Date(selectedTutor.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
