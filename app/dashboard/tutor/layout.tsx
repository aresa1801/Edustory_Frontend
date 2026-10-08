'use client'

import { ReactNode } from 'react'
import {
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  UserCircle,
  BookOpen,
  Handshake,
  ClipboardList,
  Wallet,
  GraduationCap,
} from 'lucide-react'
import SharedDashboardLayout, { NavGroup } from '@/components/dashboard/shared-layout'
import DailyLoginReward from '@/components/daily-login-reward'

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
      { href: '/dashboard/tutor/curation/progress', icon: ClipboardList, label: 'Kurasi' },
    ],
  },
  {
    label: 'Mengajar',
    items: [
      { href: '/dashboard/tutor/student-offers', icon: Handshake, label: 'Penawaran Siswa' },
      { href: '/dashboard/tutor/wallet', icon: Wallet, label: 'Wallet Deposit' },
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

export default function TutorDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Silent trigger — auto +1 credit saat user buka/refresh dashboard */}
      <DailyLoginReward />

      <SharedDashboardLayout
        navGroups={navGroups}
        allowedRoles={['tutor']}
        accentColor="blue"
        portalLabel="Portal Pengajar"
        logoIcon={GraduationCap}
      >
        {children}
      </SharedDashboardLayout>
    </>
  )
}