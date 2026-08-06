'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, MessageCircle, RefreshCw } from 'lucide-react'

// DUMMY DATA
const dummyPending = [
  {
    id: '1',
    subject: 'Matematika',
    lesson_frequency: '2x seminggu',
    start_date: '2026-09-01',
    students: {
      users_profile: { full_name: 'Andi Wijaya' },
      grade_level: 'SMA 10'
    }
  },
  {
    id: '2',
    subject: 'Fisika',
    lesson_frequency: '1x seminggu',
    start_date: '2026-09-05',
    students: {
      users_profile: { full_name: 'Budi Santoso' },
      grade_level: 'SMA 11'
    }
  }
]

const dummyActive = [
  {
    id: '3',
    subject: 'Kimia',
    lesson_frequency: '3x seminggu',
    start_date: '2026-08-20',
    status: 'matched',
    students: {
      users_profile: { full_name: 'Cahya Dewi', phone: '08123456789' },
      grade_level: 'SMA 12'
    }
  }
]

export default function MyStudentsPage() {
  const pendingCount = dummyPending.length
  const totalStudents = dummyActive.length

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Siswa Saya</h1>
          <p className="text-muted-foreground">Kelola siswa aktif dan permintaan baru.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Siswa Aktif</p>
              <p className="text-2xl font-bold">{totalStudents}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Permintaan Baru</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="requests">
            Permintaan Masuk
            {pendingCount > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">Pencocokan Aktif</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {dummyPending.map((match) => (
              <Card key={match.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                      {match.students.users_profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{match.students.users_profile.full_name}</h3>
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                        {match.students.grade_level}
                      </Badge>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-xs">
                      Pending
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div><span className="text-muted-foreground"><span className="font-medium">Mapel:</span> {match.subject}</span></div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-muted-foreground">Frekuensi</p><p className="font-medium">{match.lesson_frequency}</p></div>
                      <div><p className="text-muted-foreground">Mulai</p><p className="font-medium">{new Date(match.start_date).toLocaleDateString('id-ID')}</p></div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button size="sm" variant="outline" className="w-full" disabled>Menunggu Konfirmasi Siswa</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {dummyActive.map((match) => (
              <Card key={match.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                        {match.students.users_profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <h3 className="font-semibold">{match.students.users_profile.full_name}</h3>
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                          {match.students.grade_level}
                        </Badge>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs">Dikonfirmasi</Badge>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div><span className="text-muted-foreground"><span className="font-medium">Mapel:</span> {match.subject}</span></div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-muted-foreground">Frekuensi</p><p className="font-medium">{match.lesson_frequency}</p></div>
                      <div><p className="text-muted-foreground">Mulai</p><p className="font-medium">{new Date(match.start_date).toLocaleDateString('id-ID')}</p></div>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                    <p className="text-xs font-medium text-green-700">✓ Pencocokan dikonfirmasi! Hubungi siswa.</p>
                    <Button size="sm" variant="outline" className="mt-2 border-green-300 text-green-700 hover:bg-green-100 text-xs h-8">
                      💬 WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}