'use client'

import { useParams } from 'next/navigation'
import ScheduleDetailView from '@/components/schedule-detail-view'

export default function StudentScheduleDetailPage() {
  const params = useParams()
  const matchId = params.matchId as string

  return <ScheduleDetailView matchId={matchId} role="student" />
}