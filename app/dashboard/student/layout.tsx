'use client'

import { ReactNode } from 'react'
import {
  LayoutDashboard, Search, Users, BookMarked,
  Calendar, CreditCard, BarChart3, GraduationCap,
} from 'lucide-react'
import SharedDashboardLayout, { NavGroup } from '@/components/dashboard/shared-layout'

const navGroups: NavGroup[] = [
  {
    label: 'Umum',
    items: [
      { href: '/dashboard/student', icon: LayoutDashboard, label: 'Dasbor', exact: true },
    ],
  },
  {
    label: 'Pengajar',
    items: [
      { href: '/dashboard/student/find-tutors', icon: Search, label: 'Cari Pengajar' },
      { href: '/dashboard/student/tutor-offers', icon: Users, label: 'Penawaran Tutor' },
      { href: '/dashboard/student/my-tutors', icon: BookMarked, label: 'Pengajar Saya' },
    ],
  },
  {
    label: 'Belajar',
    items: [
      { href: '/dashboard/student/schedule', icon: Calendar, label: 'Jadwal Belajar' },
      { href: '/dashboard/student/payment', icon: CreditCard, label: 'Pembayaran' },
      { href: '/dashboard/student/analytics', icon: BarChart3, label: 'Analitik & Nilai' },
      { href: '/dashboard/student/progress', icon: GraduationCap, label: 'Progres' },
    ],
  },
]

export default function StudentDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SharedDashboardLayout
      navGroups={navGroups}
      allowedRoles={['student']}
      accentColor="blue"
      portalLabel="Portal Siswa"
      logoIcon={GraduationCap}
    >
      {children}
    </SharedDashboardLayout>
  )
}
