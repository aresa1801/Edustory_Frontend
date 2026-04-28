'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, DollarSign } from 'lucide-react'

interface Program {
  id: string
  name: string
  description: string
  price: number
  duration_months: number
  features: string[]
  status: 'active' | 'inactive'
  created_at: string
}

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration_months: 1,
    features: '' as any,
  })

  useEffect(() => {
    loadPrograms()
  }, [])

  const loadPrograms = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPrograms(data || [])
    } catch (err) {
      console.error('Error loading programs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProgram = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('programs')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            price: Number(formData.price),
            duration_months: Number(formData.duration_months),
            features: formData.features?.split(',').map((f: string) => f.trim()) || [],
            status: 'active',
          },
        ])

      if (error) throw error

      setFormData({ name: '', description: '', price: 0, duration_months: 1, features: '' })
      setShowAddForm(false)
      loadPrograms()
    } catch (err) {
      console.error('Error adding program:', err)
    }
  }

  const handleDeleteProgram = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus program ini?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadPrograms()
    } catch (err) {
      console.error('Error deleting program:', err)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: 'active' | 'inactive') => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('programs')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      loadPrograms()
    } catch (err) {
      console.error('Error updating program:', err)
    }
  }

  if (loading) {
    return <div>Memuat...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Program & Pricing</h1>
          <p className="text-muted-foreground">Kelola paket program dan harga di platform</p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-primary hover:bg-primary/90 text-white gap-2"
        >
          <Plus className="w-5 h-5" />
          Tambah Program
        </Button>
      </div>

      {/* Add Program Form */}
      {showAddForm && (
        <Card className="p-6 border border-primary/20">
          <h3 className="text-lg font-semibold text-foreground mb-4">Tambah Program Baru</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nama Program"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border/30 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <textarea
              placeholder="Deskripsi"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border/30 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 h-20"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Harga (Rp)"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="px-4 py-2 rounded-lg border border-border/30 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <input
                type="number"
                placeholder="Durasi (bulan)"
                value={formData.duration_months}
                onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                className="px-4 py-2 rounded-lg border border-border/30 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <input
              type="text"
              placeholder="Fitur (pisahkan dengan koma)"
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-border/30 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <div className="flex gap-3">
              <Button
                onClick={handleAddProgram}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Simpan Program
              </Button>
              <Button
                onClick={() => setShowAddForm(false)}
                variant="outline"
              >
                Batal
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <Card key={program.id} className="p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{program.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{program.duration_months} bulan</p>
              </div>
              <Badge className={program.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-slate-500/20 text-slate-300'}>
                {program.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
              </Badge>
            </div>

            <p className="text-muted-foreground text-sm mb-4">{program.description}</p>

            <div className="mb-4">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-primary">Rp {Number(program.price).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="space-y-2 mb-6 flex-1">
              {program.features?.map((feature, idx) => (
                <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  {feature}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => handleDeleteProgram(program.id)}
                className="flex-1 px-3 py-2 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Hapus
              </button>
            </div>
          </Card>
        ))}
      </div>

      {programs.length === 0 && (
        <Card className="p-12 text-center">
          <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Tidak ada program yang terdaftar</p>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Tambah Program Pertama Anda
          </Button>
        </Card>
      )}
    </div>
  )
}
