'use client'

import { ReactNode } from 'react'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  DollarSign,
  BarChart3,
  ShieldCheck,
  CreditCard,
  Settings,
} from 'lucide-react'
import SharedDashboardLayout, { NavGroup } from '@/components/dashboard/shared-layout'

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

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SharedDashboardLayout
      navGroups={navGroups}
      allowedRoles={['admin']}
      accentColor="purple"
      portalLabel="Portal Admin"
      logoIcon={ShieldCheck}
    >
      {children}
    </SharedDashboardLayout>
  )
}
