'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LogOut, LayoutDashboard, Search, BookMarked, BarChart3 } from 'lucide-react'

export default function StudentDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState<string>('')
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

        const user = session.user

        // Check if user is a student and fetch profile in one query
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role, name')
          .eq('id', user.id)
          .single()

        if (profileError || !profile || !['student', 'siswa'].includes(profile.role)) {
          const roleMap: Record<string, string> = { tutor: 'tutor', admin: 'admin' }
          const redirectPath = profileError || !profile
            ? '/login'
            : `/dashboard/${roleMap[profile.role] || 'login'}`
          router.push(redirectPath)
          return
        }

        setUser(user)
        setFullName(profile.name || user.email)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-card border-r border-border/30 transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-border/30">
          <Link href="/dashboard/student" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-lg">📚</span>
            </div>
            {sidebarOpen && <span className="font-bold text-foreground">EduStory</span>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
          <Link
            href="/dashboard/student"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dasbor</span>}
          </Link>

          <Link
            href="/dashboard/student/find-tutors"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
          >
            <Search className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Cari Pengajar</span>}
          </Link>

          <Link
            href="/dashboard/student/my-tutors"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
          >
            <BookMarked className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Pengajar Saya</span>}
          </Link>

          <Link
            href="/dashboard/student/progress"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
          >
            <BarChart3 className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Progres</span>}
          </Link>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-border/30">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Keluar</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 bg-card border-b border-border/30 flex items-center justify-between px-8">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-foreground"
          >
            ☰
          </button>
          <div className="text-sm text-muted-foreground">
            Selamat datang, {fullName}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
