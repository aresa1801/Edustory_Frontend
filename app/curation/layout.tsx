import type { ReactNode } from 'react'
import TutorDashboardLayout from '@/app/dashboard/tutor/layout'

export default function CurationLayout({ children }: { children: ReactNode }) {
  return <TutorDashboardLayout>{children}</TutorDashboardLayout>
}
