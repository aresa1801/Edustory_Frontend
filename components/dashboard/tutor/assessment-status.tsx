'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'

interface CurationStep {
  key: string
  name: string
  completed: boolean
  score?: number
  weight: number
  icon: string
  href?: string
}

export default function TutorAssessmentStatus() {
  const router = useRouter()
  const [steps, setSteps] = useState<CurationStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overallScore, setOverallScore] = useState(0)

  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/assessments/progress')
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          // Tutor not registered or no curation progress yet — show empty state
          setSteps([])
          setLoading(false)
          return
        }
        throw new Error(data?.error || 'Gagal memuat progress kurasi')
      }

      const completedSteps: string[] = data.progress?.completed_steps || []

      const stepsData: CurationStep[] = [
        {
          key: 'psychology',
          name: 'Tes Psikologi',
          completed: completedSteps.includes('psychology'),
          score: data.psychology?.score,
          weight: 20,
          icon: '🧠',
          href: '/curation/psychology-test',
        },
        {
          key: 'academic',
          name: 'Kemampuan Akademik',
          completed: completedSteps.includes('academic'),
          score: data.academic?.score,
          weight: 30,
          icon: '📚',
          href: completedSteps.includes('psychology') ? '/curation/academic-test' : undefined,
        },
        {
          key: 'microteaching',
          name: 'Micro Teaching',
          completed: completedSteps.includes('microteaching'),
          score: data.microteaching?.score,
          weight: 25,
          icon: '🎥',
          href: completedSteps.includes('academic') ? '/curation/microteaching' : undefined,
        },
        {
          key: 'handwriting',
          name: 'Tulisan Tangan',
          completed: completedSteps.includes('handwriting'),
          score: data.handwriting?.score,
          weight: 15,
          icon: '✍️',
          href: completedSteps.includes('microteaching') ? '/curation/handwriting' : undefined,
        },
        {
          key: 'interview',
          name: 'AI Interview',
          completed: completedSteps.includes('interview'),
          score: data.interview?.score,
          weight: 10,
          icon: '💬',
          href: completedSteps.includes('handwriting') ? '/curation/interview' : undefined,
        },
      ]

      setSteps(stepsData)

      let totalScore = 0
      let totalWeight = 0
      stepsData.forEach(step => {
        if (step.score !== undefined) {
          totalScore += (step.score * step.weight) / 100
          totalWeight += step.weight
        }
      })
      if (totalWeight > 0) {
        setOverallScore(Math.round(totalScore))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat status kurasi')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (steps.length === 0) {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800">
          Anda belum memulai proses kurasi. Kunjungi halaman{' '}
          <Link href="/curation/progress" className="font-medium underline">
            Status Kurasi
          </Link>{' '}
          untuk memulai tahapan verifikasi sebagai pengajar.
        </AlertDescription>
      </Alert>
    )
  }

  const completedCount = steps.filter(s => s.completed).length
  const overallProgress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0
  const allCompleted = completedCount === steps.length

  return (
    <div className="space-y-6">
      {/* Overall Progress Card */}
      <Card className="p-6 border-2 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-muted-foreground mb-1">Skor Keseluruhan</p>
            <div className="text-4xl font-bold text-primary">{overallScore}</div>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground mb-1">Tahapan Selesai</p>
            <div className="text-4xl font-bold text-secondary">
              {completedCount}/{steps.length}
            </div>
          </div>
        </div>
        <Progress value={overallProgress} className="h-3" />
        <p className="text-sm text-muted-foreground mt-2">
          {Math.round(overallProgress)}% selesai
        </p>
      </Card>

      {/* Assessment Steps */}
      <div className="space-y-3">
        {steps.map(step => (
          <Card
            key={step.key}
            className={`p-5 transition-all ${
              step.completed
                ? 'border-green-200 bg-green-50'
                : step.href
                ? 'border-primary/20 hover:border-primary/50'
                : 'border-border opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-2xl">{step.icon}</div>
                <div>
                  <h3 className="font-semibold text-foreground">{step.name}</h3>
                  <p className="text-sm text-muted-foreground">Bobot: {step.weight}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {step.completed ? (
                  <div className="text-right">
                    <Badge className="bg-green-500 hover:bg-green-600 mb-1">✓ Selesai</Badge>
                    {step.score !== undefined && (
                      <p className="text-xl font-bold text-green-600">{step.score}</p>
                    )}
                  </div>
                ) : step.href ? (
                  <Button
                    size="sm"
                    onClick={() => router.push(step.href!)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Mulai
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    🔒 Terkunci
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Status Info */}
      {allCompleted ? (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            🎉 Selamat! Anda telah menyelesaikan semua tahapan kurasi. Tim kami sedang meninjau
            aplikasi Anda dan akan mengumumkan hasilnya dalam 3-5 hari kerja.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">
            <ul className="space-y-1">
              <li>✓ Setiap tahapan harus diselesaikan sebelum yang berikutnya</li>
              <li>✓ Anda memiliki 7 hari untuk menyelesaikan semua tahapan</li>
              <li>✓ Setelah semua tahapan selesai, admin akan meninjau aplikasi Anda</li>
              <li>✓ Hasil akan diumumkan dalam 3-5 hari kerja</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
