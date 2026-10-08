'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth, AppRole } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LogOut, Menu, X, PanelLeftClose, PanelLeftOpen, MoreHorizontal } from 'lucide-react'

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

const ACCENT: Record<
  AccentColor,
  { logo: string; active: string; activeIcon: string; avatar: string; ring: string; dot: string }
> = {
  blue: {
    logo: 'bg-[#2A7FFF]',
    active: 'bg-[#2A7FFF]/10 text-[#2A7FFF] dark:bg-[#2A7FFF]/20 dark:text-[#7FBBFF]',
    activeIcon: 'text-[#2A7FFF] dark:text-[#7FBBFF]',
    avatar: 'bg-[#2A7FFF]/12 text-[#2A7FFF] dark:text-[#7FBBFF]',
    ring: 'ring-[#2A7FFF]/25',
    dot: 'bg-[#2A7FFF]',
  },
  purple: {
    logo: 'bg-primary',
    active: 'bg-primary/10 text-primary dark:bg-primary/20',
    activeIcon: 'text-primary',
    avatar: 'bg-primary/12 text-primary',
    ring: 'ring-primary/25',
    dot: 'bg-primary',
  },
  green: {
    logo: 'bg-secondary',
    active: 'bg-secondary/12 text-secondary dark:bg-secondary/20',
    activeIcon: 'text-secondary',
    avatar: 'bg-secondary/12 text-secondary',
    ring: 'ring-secondary/25',
    dot: 'bg-secondary',
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const colors = ACCENT[accentColor]

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/auth/login')
      return
    }
    if (userRole && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      const roleRedirectMap: Record<AppRole, string> = {
        student: '/dashboard/student',
        tutor: '/dashboard/tutor',
        admin: '/dashboard/admin',
      }
      router.push(roleRedirectMap[userRole] ?? redirectPath)
    }
  }, [loading, user, userRole, allowedRoles, redirectPath, router])

  // Close the mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileDrawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileDrawerOpen])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch {
      /* ignore */
    }
    window.location.replace('/')
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email ?? 'U').slice(0, 2).toUpperCase()

  const roleLabel = userRole ? ROLE_LABEL[userRole] : ''

  const flatNavItems = navGroups.flatMap((g) => g.items)
  const mobileBottomItems = flatNavItems.slice(0, 3)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          <p className="text-sm font-medium text-muted-foreground">Memuat dashboard…</p>
        </div>
      </div>
    )
  }

  if (!user || (userRole && allowedRoles.length > 0 && !allowedRoles.includes(userRole))) {
    return null
  }

  const BrandMark = (
    <div className="flex items-center gap-3">
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-soft ${colors.logo}`}>
        <LogoIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display font-extrabold leading-none tracking-tight">
          Edu<span className="text-primary">Story</span>
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{portalLabel}</p>
      </div>
    </div>
  )

  const NavList = ({
    onNavigate,
    dense = false,
    expanded,
  }: {
    onNavigate?: () => void
    dense?: boolean
    expanded: boolean
  }) => (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.label}>
          {expanded && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              {group.label}
            </p>
          )}
          <div className="space-y-1">
            {group.items.map(({ href, icon: Icon, label, exact }) => {
              const active = isActive(href, exact)
              return (
                <Link
                  key={href}
                  href={href}
                  title={!expanded ? label : undefined}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all ${
                    dense ? 'py-3' : 'py-2.5'
                  } ${
                    active
                      ? colors.active
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon
                    size={dense ? 20 : 18}
                    className={`flex-shrink-0 ${active ? colors.activeIcon : 'text-muted-foreground/80 group-hover:text-foreground'}`}
                  />
                  {expanded && <span className="truncate">{label}</span>}
                  {expanded && active && <span className={`ml-auto h-1.5 w-1.5 rounded-full ${colors.dot}`} />}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-muted/30 font-sans">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`z-20 hidden flex-col border-r border-border/70 bg-card transition-all duration-300 md:flex ${
          sidebarOpen ? 'w-64' : 'w-[76px]'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-border/70 px-4">
          {BrandMark}
        </div>

        <NavList expanded={sidebarOpen} />

        <div className="border-t border-border/70 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className={`text-xs font-semibold ${colors.avatar}`}>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{userName || user?.email}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* ── Mobile drawer ──────────────────────────────────────────────── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm animate-fade-in md:hidden"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border/70 bg-card shadow-lifted transition-transform duration-300 ease-in-out md:hidden ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigasi"
      >
        <div className="flex h-16 items-center justify-between border-b border-border/70 px-4">
          {BrandMark}
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <NavList dense expanded onNavigate={() => setMobileDrawerOpen(false)} />

        <div className="border-t border-border/70 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarFallback className={`text-sm font-semibold ${colors.avatar}`}>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{userName || user?.email}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground md:hidden"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="hidden h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground md:flex"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <PanelLeftClose className="h-4.5 w-4.5" /> : <PanelLeftOpen className="h-4.5 w-4.5" />}
            </button>
            <span className="hidden items-center gap-2 text-sm font-semibold text-muted-foreground sm:flex">
              <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
              {portalLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{userName || user?.email}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <Avatar className={`h-9 w-9 ring-2 ${colors.ring}`}>
              <AvatarFallback className={`text-xs font-semibold ${colors.avatar}`}>{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-28 md:p-6 md:pb-8 lg:p-8">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>

        {/* ── Mobile bottom nav ───────────────────────────────────────── */}
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="flex items-stretch">
            {mobileBottomItems.map(({ href, icon: Icon, label, exact }) => {
              const active = isActive(href, exact)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors ${
                    active ? colors.activeIcon : 'text-muted-foreground'
                  }`}
                >
                  <Icon size={21} />
                  <span className="text-[10px] font-semibold leading-none">{label}</span>
                </Link>
              )
            })}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 py-2 text-muted-foreground transition-colors"
              aria-label="Lainnya"
            >
              <MoreHorizontal size={21} />
              <span className="text-[10px] font-semibold leading-none">Lainnya</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
