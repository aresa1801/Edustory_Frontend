'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'

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
            href: '/curation/psychology-test'
          },
          {
            name: 'Kemampuan Akademik',
            completed: completedSteps.includes('academic'),
            score: data.academic?.score,
            weight: 30,
            icon: '📚',
            href: completedSteps.includes('psychology') ? '/curation/academic-test' : undefined
          },
          {
            name: 'Micro Teaching',
            completed: completedSteps.includes('microteaching'),
            score: data.microteaching?.overall_score,
            weight: 25,
            icon: '🎥',
            href: completedSteps.includes('academic') ? '/curation/microteaching' : undefined
          },
          {
            name: 'Tulisan Tangan',
            completed: completedSteps.includes('handwriting'),
            score: data.handwriting?.overall_score,
            weight: 15,
            icon: '✍️',
            href: completedSteps.includes('microteaching') ? '/curation/handwriting' : undefined
          },
          {
            name: 'AI Interview',
            completed: completedSteps.includes('interview'),
            score: data.interview?.overall_score,
            weight: 10,
            icon: '💬',
            href: completedSteps.includes('handwriting') ? '/curation/interview' : undefined
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Status Kurasi Tutor
          </h1>
          <p className="text-lg text-muted-foreground">
            Lacak kemajuan aplikasi Anda melalui setiap tahap verifikasi
          </p>
        </div>

        {/* Overall Progress Card */}
        <Card className="p-8 mb-8 border-2 border-primary/20">
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
              className={`p-6 transition-all ${
                step.completed
                  ? 'border-green-200 bg-green-50'
                  : step.href
                  ? 'border-primary/20 hover:border-primary/50'
                  : 'border-border opacity-50'
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
                      <Badge className="bg-green-500 hover:bg-green-600 mb-2">
                        Selesai
                      </Badge>
                      <p className="text-2xl font-bold text-green-300">
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
                    <Badge variant="outline" className="text-muted-foreground">
                      Terkunci
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="p-8 mt-8 border-blue-200 bg-blue-50">
          <h3 className="font-semibold text-blue-900 mb-3">Informasi Penting:</h3>
          <ul className="text-sm text-blue-800 space-y-2">
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
