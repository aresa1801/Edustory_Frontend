'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LogOut,
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  UserCircle,
  BookOpen,
  Handshake,
  ClipboardList,
  Menu,
  X,
  GraduationCap,
  ChevronRight,
  FileText,
} from 'lucide-react'

interface NavGroup {
  label: string
  items: {
    href: string
    icon: React.ElementType
    label: string
    exact?: boolean
    badge?: string
  }[]
}

export default function TutorDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [fullName, setFullName] = useState<string>('')
  const [initials, setInitials] = useState<string>('T')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) {
          router.push('/auth/login')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role, name')
          .eq('id', session.user.id)
          .single()

        if (profileError || profile?.role !== 'tutor') {
          router.push(`/dashboard/${profile?.role || 'login'}`)
          return
        }

        const name = profile.name || session.user.email || 'Tutor'
        setFullName(name)
        setInitials(
          name
            .split(' ')
            .map((n: string) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        )
      } catch (err) {
        console.error('Auth check error:', err)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const navGroups: NavGroup[] = [
    {
      label: 'Umum',
      items: [
        { href: '/dashboard/tutor', icon: LayoutDashboard, label: 'Beranda', exact: true },
      ],
    },
    {
      label: 'Pendaftaran',
      items: [
        { href: '/dashboard/tutor/profile', icon: UserCircle, label: 'Profil Saya' },
        { href: '/dashboard/tutor/teaching-interest', icon: BookOpen, label: 'Minat Mengajar' },
        { href: '/curation/progress', icon: ClipboardList, label: 'Kurasi' },
      ],
    },
    {
      label: 'Mengajar',
      items: [
        { href: '/dashboard/tutor/student-offers', icon: Handshake, label: 'Penawaran Siswa' },
        { href: '/dashboard/tutor/applications', icon: FileText, label: 'Aplikasi Saya' },
        { href: '/dashboard/tutor/my-students', icon: Users, label: 'Siswa Saya' },
        { href: '/dashboard/tutor/schedule', icon: Calendar, label: 'Jadwal Mengajar' },
      ],
    },
    {
      label: 'Performa',
      items: [
        { href: '/dashboard/tutor/analytics', icon: BarChart3, label: 'Analitik' },
      ],
    },
  ]

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm font-medium">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-[72px]'
        } bg-white border-r border-slate-200 transition-all duration-300 flex flex-col shadow-sm z-20`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100 gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="font-bold text-foreground leading-none">EduStory</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Portal Pengajar</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navGroups.map(group => (
            <div key={group.label}>
              {sidebarOpen && (
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 px-2">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ href, icon: Icon, label, exact }) => {
                  const active = isActive(href, exact)
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={!sidebarOpen ? label : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium group ${
                        active
                          ? 'bg-blue-50 text-blue-300'
                          : 'text-muted-foreground hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon
                        className={`w-4.5 h-4.5 flex-shrink-0 ${
                          active ? 'text-blue-300' : 'text-muted-foreground group-hover:text-slate-600'
                        }`}
                        size={18}
                      />
                      {sidebarOpen && <span className="truncate">{label}</span>}
                      {sidebarOpen && active && (
                        <ChevronRight className="ml-auto w-3.5 h-3.5 text-blue-400" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="p-3 border-t border-slate-100">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-blue-100 text-blue-300 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
                <p className="text-xs text-muted-foreground">Pengajar</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-muted-foreground hover:text-red-300 hover:bg-red-500/10"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="w-full text-muted-foreground hover:text-red-300 hover:bg-red-500/10"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground">{fullName}</p>
              <p className="text-xs text-muted-foreground">Pengajar Aktif</p>
            </div>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-blue-100 text-blue-300 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
