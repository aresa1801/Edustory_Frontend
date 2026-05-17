'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationMessage {
  role: 'assistant' | 'user'
  content: string
}

interface DimensionScore {
  score: number
  justification: string
  quote: string
}

interface InterviewResult {
  overallScore: number
  passed: boolean
  recommendation: string
  summary: string
  dimensions: Record<string, DimensionScore>
}

type Phase = 'loading' | 'chatting' | 'completing' | 'result'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_EXCHANGES = 7
const INTERVIEW_DURATION_SECONDS = 15 * 60 // 15 minutes

const DIMENSION_LABELS: Record<string, string> = {
  komunikasi_kejelasan:       '🗣️ Komunikasi & Kejelasan',
  empati_kesabaran:           '❤️ Empati & Kesabaran',
  kemampuan_menyederhanakan:  '💡 Kemampuan Menyederhanakan',
  penguasaan_materi:          '📚 Penguasaan Materi',
  kesesuaian_tutor:           '🎯 Kesesuaian sebagai Tutor',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatTimeRemainingString(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function InterviewPage() {
  const router = useRouter()

  // Phase control
  const [phase, setPhase] = useState<Phase>('loading')

  // Chat state — kept on client and sent with every request (stateless server)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [exchangeCount, setExchangeCount] = useState(0)
  const [uncoveredDimensions, setUncoveredDimensions] = useState<string[]>([])
  const [followUpUsed, setFollowUpUsed] = useState(false)
  const [dontKnowStreak, setDontKnowStreak] = useState(0)
  const [candidateName, setCandidateName] = useState('Kandidat')

  // UI state
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(INTERVIEW_DURATION_SECONDS)
  const [result, setResult] = useState<InterviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Refs to avoid stale-closure issues in timer callbacks
  const messagesRef = useRef<ConversationMessage[]>([])
  const candidateNameRef = useRef('Kandidat')
  const startTimeRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const interviewCompleteRef = useRef(false)
  const completeInterviewCallbackRef = useRef<() => void>(() => {})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Keep refs in sync with state
  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { candidateNameRef.current = candidateName }, [candidateName])

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  // ---------------------------------------------------------------------------
  // Complete interview: generate assessment + save
  // ---------------------------------------------------------------------------

  const completeInterview = useCallback(
    async (finalMessages: ConversationMessage[], name: string) => {
      if (interviewCompleteRef.current) return
      interviewCompleteRef.current = true

      if (timerRef.current) clearInterval(timerRef.current)
      setPhase('completing')

      const timeSpentSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)

      try {
        const res = await fetch('/api/ai/interview/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: finalMessages,
            candidateName: name,
            timeSpentSeconds,
          }),
        })

        if (!res.ok) {
          const body = await res.json()
          throw new Error(body?.error || 'Gagal menyelesaikan interview')
        }

        const data = await res.json()
        setResult({
          overallScore:   data.overallScore,
          passed:         data.passed,
          recommendation: data.recommendation,
          summary:        data.summary,
          dimensions:     data.dimensions,
        })
        setPhase('result')
        setTimeout(() => router.push('/curation/progress'), 8000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
        setPhase('chatting')
        interviewCompleteRef.current = false
      }
    },
    [router]
  )

  // Keep callback ref current so the timer can call the latest version
  useEffect(() => {
    completeInterviewCallbackRef.current = () =>
      completeInterview(messagesRef.current, candidateNameRef.current)
  })

  // ---------------------------------------------------------------------------
  // Initialise: fetch opening message from AI
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const startInterview = async () => {
      try {
        const res = await fetch('/api/ai/interview/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        if (!res.ok) throw new Error('Gagal memulai interview')

        const data = await res.json()
        const name: string = data.candidateName || 'Kandidat'
        const opening: ConversationMessage = { role: 'assistant', content: data.openingMessage }

        setCandidateName(name)
        setMessages([opening])
        setUncoveredDimensions(data.uncoveredDimensions ?? [])
        setExchangeCount(0)
        setPhase('chatting')

        // Start countdown timer
        timerRef.current = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              completeInterviewCallbackRef.current()
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memulai interview')
      }
    }

    startInterview()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // Send a candidate message
  // ---------------------------------------------------------------------------

  const sendMessage = async () => {
    if (!inputValue.trim() || isSending || phase !== 'chatting') return

    const userAnswer = inputValue.trim()
    setInputValue('')
    setIsSending(true)
    setError(null)

    const lastAiraMessage =
      [...messages].reverse().find((m) => m.role === 'assistant')?.content || ''

    const userMsg: ConversationMessage = { role: 'user', content: userAnswer }
    const messagesWithUser: ConversationMessage[] = [...messages, userMsg]
    setMessages(messagesWithUser)

    try {
      const res = await fetch('/api/ai/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          exchangeCount,
          uncoveredDimensions,
          followUpUsed,
          dontKnowStreak,
          lastAiraMessage,
          candidateName,
          answer: userAnswer,
          timeRemaining: formatTimeRemainingString(timeRemaining),
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error || 'Gagal memproses pesan')
      }

      const data = await res.json()
      const airaMsg: ConversationMessage = {
        role: 'assistant',
        content: data.interviewerResponse,
      }
      const finalMessages: ConversationMessage[] = [...messagesWithUser, airaMsg]

      setMessages(finalMessages)
      setExchangeCount(data.exchangeCount)
      setUncoveredDimensions(data.uncoveredDimensions)
      setFollowUpUsed(data.followUpUsed)
      setDontKnowStreak(data.dontKnowStreak)

      if (data.interviewComplete) {
        await completeInterview(finalMessages, candidateName)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      // Roll back the optimistically added user message
      setMessages(messages)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const exchangeProgress = Math.min(100, (exchangeCount / MAX_EXCHANGES) * 100)

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="text-center">
          <Spinner className="h-10 w-10 mx-auto mb-4" />
          <p className="text-lg font-medium mb-1">Mempersiapkan AI Interviewer...</p>
          <p className="text-sm text-muted-foreground">Mohon tunggu sebentar</p>
          {error && (
            <Alert variant="destructive" className="mt-4 max-w-sm">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: generating assessment
  // ---------------------------------------------------------------------------

  if (phase === 'completing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="text-center">
          <Spinner className="h-10 w-10 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-1">Menganalisis Wawancara...</p>
          <p className="text-sm text-muted-foreground">
            AI sedang menyusun penilaian Anda berdasarkan percakapan tadi
          </p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: result card
  // ---------------------------------------------------------------------------

  if (phase === 'result' && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Score summary */}
          <Card className="p-8 text-center">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-3xl font-bold mb-2">AI Interview Selesai!</h2>
            <p className="text-muted-foreground mb-6">
              Anda telah menyelesaikan tahap wawancara kurasi tutor.
            </p>

            <div className="text-7xl font-bold text-primary mb-2">{result.overallScore}</div>
            <p className="text-xl text-muted-foreground mb-4">Skor Interview dari 100</p>

            <Badge
              className={
                result.passed
                  ? 'bg-green-500 hover:bg-green-600 text-white mb-4'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white mb-4'
              }
            >
              {result.recommendation}
            </Badge>

            {result.passed ? (
              <Alert className="bg-green-50 border-green-200 mb-4">
                <AlertDescription className="text-green-800">
                  🎉 <strong>Selamat!</strong> Anda telah menyelesaikan semua tahapan kurasi.
                  Tim kami akan meninjau dan mengumumkan hasilnya dalam 3-5 hari kerja.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-yellow-50 border-yellow-200 mb-4">
                <AlertDescription className="text-yellow-800">
                  Anda telah menyelesaikan semua tahapan kurasi. Tim admin akan mengevaluasi
                  aplikasi Anda secara menyeluruh.
                </AlertDescription>
              </Alert>
            )}

            <p className="text-sm text-muted-foreground text-left">{result.summary}</p>
          </Card>

          {/* Dimension breakdown */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Penilaian per Dimensi</h3>
            <div className="space-y-4">
              {Object.entries(result.dimensions).map(([key, dim]) => (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">
                      {DIMENSION_LABELS[key] || key}
                    </span>
                    <span className="text-sm font-bold">{dim.score}/10</span>
                  </div>
                  <Progress value={dim.score * 10} className="h-2 mb-1" />
                  <p className="text-xs text-muted-foreground">{dim.justification}</p>
                  {dim.quote && dim.quote !== '—' && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">
                      &ldquo;{dim.quote}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div className="text-center">
            <Spinner className="mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Mengalihkan ke halaman progress...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: chat interface
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex flex-col">
      {/* Sticky header */}
      <div className="bg-background/95 backdrop-blur border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-primary border-primary text-xs">
                Tahap 5 dari 5
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 text-xs">
                💬 AI Interview
              </Badge>
            </div>
            <div
              className={`text-xl font-bold font-mono ${
                timeRemaining < 180 ? 'text-red-600 animate-pulse' : 'text-primary'
              }`}
            >
              {formatTime(timeRemaining)}
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Pertukaran {exchangeCount} / {MAX_EXCHANGES}</span>
            <span>{MAX_EXCHANGES - exchangeCount} pertukaran tersisa</span>
          </div>
          <Progress value={exchangeProgress} className="h-1.5" />
        </div>
      </div>

      {/* Chat message list */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Info banner shown before first user message */}
          {messages.length <= 1 && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800 text-sm">
                <ul className="space-y-1">
                  <li>💡 Ini adalah wawancara percakapan — jawab secara natural seperti berbicara langsung.</li>
                  <li>📝 Tekan <strong>Enter</strong> untuk mengirim, <strong>Shift+Enter</strong> untuk baris baru.</li>
                  <li>⏰ Wawancara otomatis berakhir ketika waktu habis atau setelah {MAX_EXCHANGES} pertukaran.</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-end gap-2 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-base flex-shrink-0">
                  🤖
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-background border shadow-sm rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary/30 flex items-center justify-center text-base flex-shrink-0">
                  👤
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isSending && (
            <div className="flex items-end gap-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-base flex-shrink-0">
                🤖
              </div>
              <div className="bg-background border shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 pb-2">
          <div className="max-w-3xl mx-auto">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="bg-background/95 backdrop-blur border-t px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik jawaban Anda di sini... (Enter untuk kirim)"
              className="flex-1 min-h-[60px] max-h-[150px] resize-none text-sm"
              disabled={isSending}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isSending}
              className="bg-primary hover:bg-primary/90 self-end h-12 px-5"
              aria-label="Kirim"
            >
              {isSending ? <Spinner className="h-4 w-4" /> : '↑'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Jawab dengan jujur dan detail — semakin spesifik, semakin baik penilaian Anda.
          </p>
        </div>
      </div>
    </div>
  )
}
