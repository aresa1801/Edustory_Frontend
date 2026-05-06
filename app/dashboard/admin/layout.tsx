'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LogOut,
  LayoutDashboard,
  Users,
  GraduationCap,
  DollarSign,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  CreditCard,
  Settings,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const ADMIN_EMAIL = 'storyaunty.evi@gmail.com'

interface NavGroup {
  label: string
  items: {
    href: string
    icon: React.ElementType
    label: string
    exact?: boolean
  }[]
}

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.push('/auth/login')
          return
        }

        if (user.email !== ADMIN_EMAIL) {
          router.push('/dashboard/student')
          return
        }

        setUser(user)
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
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out failed:', error)
    }
    window.location.replace('/auth/login')
  }

  const navGroups: NavGroup[] = [
    {
      label: 'Umum',
      items: [
        { href: '/dashboard/admin', icon: LayoutDashboard, label: 'Beranda', exact: true },
      ],
    },
    {
      label: 'Manajemen',
      items: [
        { href: '/dashboard/admin/tutors', icon: Users, label: 'Daftar Tutor' },
        { href: '/dashboard/admin/students', icon: GraduationCap, label: 'Daftar Siswa' },
      ],
    },
    {
      label: 'Platform',
      items: [
        { href: '/dashboard/admin/programs', icon: DollarSign, label: 'Program & Harga' },
        { href: '/dashboard/admin/payments', icon: CreditCard, label: 'Laporan Pembayaran' },
        { href: '/dashboard/admin/settings', icon: Settings, label: 'Pengaturan Pembayaran' },
        { href: '/dashboard/admin/analytics', icon: BarChart3, label: 'Analitik' },
      ],
    },
  ]

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const initials = user?.email
    ? user.email
        .split('@')[0]
        .split(/[._]+/)
        .filter((part: string) => part.length > 0)
        .map((part: string) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'AD'
    : 'AD'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Memuat dashboard admin...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-gray-950 font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-[72px]'
        } bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-700 transition-all duration-300 flex flex-col shadow-sm z-20`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100 dark:border-gray-800 gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="font-bold text-slate-800 dark:text-gray-100 leading-none">EduStory</p>
              <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5 uppercase tracking-wider">Portal Admin</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navGroups.map(group => (
            <div key={group.label}>
              {sidebarOpen && (
                <p className="text-[10px] font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-2">
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
                          ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-gray-100'
                      }`}
                    >
                      <Icon
                        className={`flex-shrink-0 ${
                          active ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-gray-500 group-hover:text-slate-600 dark:group-hover:text-gray-300'
                        }`}
                        size={18}
                      />
                      {sidebarOpen && <span className="truncate">{label}</span>}
                      {sidebarOpen && active && (
                        <ChevronRight className="ml-auto w-3.5 h-3.5 text-purple-400 dark:text-purple-500" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="p-3 border-t border-slate-100 dark:border-gray-800">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-gray-100 truncate">Administrator</p>
                <p className="text-xs text-slate-400 dark:text-gray-500 truncate">{user?.email}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-slate-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-500/10"
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
              className="w-full text-slate-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-500/10"
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
        <header className="h-14 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between px-6 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">Administrator</p>
              <p className="text-xs text-slate-400 dark:text-gray-500">Akses Penuh</p>
            </div>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold">
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
