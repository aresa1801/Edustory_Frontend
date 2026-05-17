'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth, AppRole } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LogOut, Menu, X, ChevronRight } from 'lucide-react'

export interface NavItem {
  href: string
  icon: React.ElementType
  label: string
  exact?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

type AccentColor = 'blue' | 'purple' | 'green'

interface SharedDashboardLayoutProps {
  children: ReactNode
  navGroups: NavGroup[]
  /** Roles allowed to access this dashboard. Redirect happens if role doesn't match. */
  allowedRoles: AppRole[]
  /** Redirect path for role mismatches */
  redirectPath?: string
  accentColor: AccentColor
  portalLabel: string
  logoIcon: React.ElementType
}

const ACCENT: Record<AccentColor, {
  logo: string
  active: string
  activeIcon: string
  chevron: string
  avatar: string
}> = {
  blue: {
    logo: 'bg-blue-600',
    active: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    activeIcon: 'text-blue-600 dark:text-blue-400',
    chevron: 'text-blue-400 dark:text-blue-500',
    avatar: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  },
  purple: {
    logo: 'bg-purple-600',
    active: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    activeIcon: 'text-purple-600 dark:text-purple-400',
    chevron: 'text-purple-400 dark:text-purple-500',
    avatar: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  },
  green: {
    logo: 'bg-green-600',
    active: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    activeIcon: 'text-green-600 dark:text-green-400',
    chevron: 'text-green-400 dark:text-green-500',
    avatar: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  },
}

const ROLE_LABEL: Record<AppRole, string> = {
  student: 'Siswa',
  tutor: 'Pengajar',
  admin: 'Administrator',
}

export default function SharedDashboardLayout({
  children,
  navGroups,
  allowedRoles,
  redirectPath = '/auth/login',
  accentColor,
  portalLabel,
  logoIcon: LogoIcon,
}: SharedDashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, userRole, userName, loading, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const colors = ACCENT[accentColor]

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push('/auth/login')
      return
    }

    if (userRole && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      // Redirect to the correct dashboard for this role
      const roleRedirectMap: Record<AppRole, string> = {
        student: '/dashboard/student',
        tutor: '/dashboard/tutor',
        admin: '/dashboard/admin',
      }
      router.push(roleRedirectMap[userRole] ?? redirectPath)
    }
  }, [loading, user, userRole, allowedRoles, redirectPath, router])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch {
      // Ignore sign-out errors; proceed with client-side redirect
    }
    window.location.replace('/')
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const initials = userName
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email ?? 'U').slice(0, 2).toUpperCase()

  const roleLabel = userRole ? ROLE_LABEL[userRole] : ''

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  // Still waiting for redirect to fire — render nothing
  if (!user || (userRole && allowedRoles.length > 0 && !allowedRoles.includes(userRole))) {
    return null
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
          <div className={`w-9 h-9 rounded-xl ${colors.logo} flex items-center justify-center flex-shrink-0`}>
            <LogoIcon className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="font-bold text-slate-800 dark:text-gray-100 leading-none">EduStory</p>
              <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5 uppercase tracking-wider">
                {portalLabel}
              </p>
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
                          ? colors.active
                          : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-gray-100'
                      }`}
                    >
                      <Icon
                        className={`flex-shrink-0 ${
                          active
                            ? colors.activeIcon
                            : 'text-slate-400 dark:text-gray-500 group-hover:text-slate-600 dark:group-hover:text-gray-300'
                        }`}
                        size={18}
                      />
                      {sidebarOpen && <span className="truncate">{label}</span>}
                      {sidebarOpen && active && (
                        <ChevronRight className={`ml-auto w-3.5 h-3.5 ${colors.chevron}`} />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User section & Logout */}
        <div className="p-3 border-t border-slate-100 dark:border-gray-800">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className={`${colors.avatar} text-xs font-semibold`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-gray-100 truncate">
                  {userName || user?.email}
                </p>
                <p className="text-xs text-slate-400 dark:text-gray-500">{roleLabel}</p>
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
              <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">
                {userName || user?.email}
              </p>
              <p className="text-xs text-slate-400 dark:text-gray-500">{roleLabel}</p>
            </div>
            <Avatar className="w-8 h-8">
              <AvatarFallback className={`${colors.avatar} text-xs font-semibold`}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
