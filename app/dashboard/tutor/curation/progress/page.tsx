'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader, StatCard, TonePill } from '@/components/dashboard/ui'

interface CurationStep {
  name: string
  completed: boolean
  score?: number
  weight: number
  icon: string
  href?: string
}

export default function CurationProgressPage() {
  const router = useRouter()
  const [steps, setSteps] = useState<CurationStep[]>([])
  const [loading, setLoading] = useState(true)
  const [overallScore, setOverallScore] = useState(0)

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch('/api/assessments/progress')
        const data = await response.json()

        const completedSteps: string[] = data.progress?.completed_steps || []

        const stepsData: CurationStep[] = [
          {
            name: 'Tes Psikologi',
            completed: completedSteps.includes('psychology'),
            score: data.psychology?.score,
            weight: 20,
            icon: '🧠',
            href: '/dashboard/tutor/curation/psychology-test'
          },
          {
            name: 'Kemampuan Akademik',
            completed: completedSteps.includes('academic'),
            score: data.academic?.score,
            weight: 30,
            icon: '📚',
            href: completedSteps.includes('psychology') ? '/dashboard/tutor/curation/academic-test' : undefined
          },
          {
            name: 'Micro Teaching',
            completed: completedSteps.includes('microteaching'),
            score: data.microteaching?.overall_score,
            weight: 25,
            icon: '🎥',
            href: completedSteps.includes('academic') ? '/dashboard/tutor/curation/microteaching' : undefined
          },
          {
            name: 'Tulisan Tangan',
            completed: completedSteps.includes('handwriting'),
            score: data.handwriting?.overall_score,
            weight: 15,
            icon: '✍️',
            href: completedSteps.includes('microteaching') ? '/dashboard/tutor/curation/handwriting' : undefined
          },
          {
            name: 'AI Interview',
            completed: completedSteps.includes('interview'),
            score: data.interview?.overall_score,
            weight: 10,
            icon: '💬',
            href: completedSteps.includes('handwriting') ? '/dashboard/tutor/curation/interview' : undefined
          }
        ]

        setSteps(stepsData)

        // Calculate weighted score
        let totalScore = 0
        let totalWeight = 0
        stepsData.forEach((step) => {
          if (step.score !== undefined) {
            totalScore += (step.score * step.weight) / 100
            totalWeight += step.weight
          }
        })

        if (totalWeight > 0) {
          setOverallScore(Math.round(totalScore))
        }
      } catch (error) {
        console.error('Error fetching curation progress:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const completedCount = steps.filter((s) => s.completed).length
  const overallProgress = (completedCount / steps.length) * 100

  return (
    <div className="min-h-screen py-8 px-4 sm:py-10">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          className="mb-8"
          eyebrow="Area Pengajar"
          title="Status Kurasi Tutor"
          description="Lacak kemajuan aplikasi Anda melalui setiap tahap verifikasi"
        />

        {/* Overall Progress Card */}
        <Card className="surface rounded-2xl border-border/70 p-8 mb-8 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-muted-foreground mb-2">Skor Keseluruhan</p>
              <div className="text-5xl font-bold text-primary">
                {overallScore}
              </div>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground mb-2">Tahapan Selesai</p>
              <div className="text-4xl font-bold text-secondary">
                {completedCount}/{steps.length}
              </div>
            </div>
          </div>

          <Progress value={overallProgress} className="h-3" />
          <p className="text-sm text-muted-foreground mt-3">
            Progres: {completedCount}/{steps.length} Tahapan ({Math.round(overallProgress)}%)
          </p>
        </Card>

        {/* Steps List */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <Card
              key={index}
              className={`surface rounded-2xl p-6 shadow-soft ${
                step.completed
                  ? 'border-success/30 bg-success/10'
                  : step.href
                  ? 'border-primary/20 hover-card'
                  : 'border-border/70 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{step.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {step.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Bobot: {step.weight}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {step.completed ? (
                    <div className="text-right">
                      <TonePill tone="secondary" className="mb-2">
                        Selesai
                      </TonePill>
                      <p className="text-2xl font-bold text-success">
                        {step.score}
                      </p>
                    </div>
                  ) : step.href ? (
                    <Button
                      onClick={() => router.push(step.href!)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Mulai
                    </Button>
                  ) : (
                    <TonePill tone="muted">
                      Terkunci
                    </TonePill>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="surface rounded-2xl p-8 mt-8 border-primary/30 bg-primary/10 shadow-soft">
          <h3 className="font-semibold text-primary mb-3">Informasi Penting:</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>
              ✓ Setiap tahapan harus diselesaikan sebelum yang berikutnya
            </li>
            <li>
              ✓ Anda memiliki 7 hari untuk menyelesaikan semua tahapan
            </li>
            <li>
              ✓ Setelah semua tahapan selesai, admin akan meninjau aplikasi Anda
            </li>
            <li>
              ✓ Hasil akan diumumkan dalam 3-5 hari kerja
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
