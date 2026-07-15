'use client'

import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/auth'
import { Spinner } from '@/components/ui/spinner'
import {
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  UserCircle,
  BookOpen,
  Handshake,
  ClipboardList,
  FileText,
  GraduationCap,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard/tutor', icon: LayoutDashboard, label: 'Beranda' },
  { href: '/dashboard/tutor/profile', icon: UserCircle, label: 'Profil Saya' },
  { href: '/dashboard/tutor/teaching-interest', icon: BookOpen, label: 'Minat Mengajar' },
  { href: '/curation/progress', icon: ClipboardList, label: 'Kurasi' },
  { href: '/dashboard/tutor/student-offers', icon: Handshake, label: 'Penawaran Siswa' },
  { href: '/dashboard/tutor/applications', icon: FileText, label: 'Aplikasi Saya' },
  { href: '/dashboard/tutor/my-students', icon: Users, label: 'Siswa Saya' },
  { href: '/dashboard/tutor/schedule', icon: Calendar, label: 'Jadwal Mengajar' },
  { href: '/dashboard/tutor/analytics', icon: BarChart3, label: 'Analitik' },
]

export default function TutorDashboardLayout({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.warn('User not authenticated in tutor layout')
        }
        // Biarkan tetap render, middleware akan menangani redirect
      } catch (err) {
        setError('Gagal memeriksa autentikasi')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-blue-600" />
          <span className="font-semibold text-slate-800">Portal Pengajar</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}