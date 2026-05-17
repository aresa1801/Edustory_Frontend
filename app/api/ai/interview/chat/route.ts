/**
 * POST /api/ai/interview/chat
 *
 * Processes one candidate turn in the conversational AI interview.
 * Adapted from the ai-tutor-screener engine (github.com/farhanrhine/ai-tutor-screener)
 * using DeepSeek AI instead of Groq and Indonesian-language prompts.
 *
 * The full session state is kept on the client and sent with every request
 * (stateless server). DeepSeek receives the full conversation history so the
 * AI can respond naturally without persistent server-side memory.
 *
 * Request body:
 * {
 *   messages:            { role: 'assistant'|'user', content: string }[]
 *   exchangeCount:       number
 *   uncoveredDimensions: string[]
 *   followUpUsed:        boolean
 *   dontKnowStreak:      number
 *   lastAiraMessage:     string
 *   candidateName:       string
 *   answer:              string
 *   timeRemaining:       string   // "MM:SS"
 * }
 *
 * Response:
 * {
 *   interviewerResponse: string
 *   interviewComplete:   boolean
 *   messages:            { role: string, content: string }[]
 *   exchangeCount:       number
 *   uncoveredDimensions: string[]
 *   followUpUsed:        boolean
 *   dontKnowStreak:      number
 * }
 */

import { createServerClient } from '@/lib/supabase/server'
import { deepseekChat } from '@/lib/deepseek'
import { NextRequest, NextResponse } from 'next/server'
import {
  SYSTEM_PROMPT,
  ASSESSMENT_DIMENSIONS,
  MAX_EXCHANGES,
  buildRoutingPrompt,
  buildRepeatPrompt,
  buildDontKnowPrompt,
  buildWrapUpPrompt,
  buildQualityCheckPrompt,
} from '@/lib/interview-prompts'

// ---------------------------------------------------------------------------
// Detection patterns (adapted from conversation.py)
// ---------------------------------------------------------------------------

const REPEAT_RE =
  /\b(ulangi|mohon ulang|bisa ulang|tidak dengar|tidak mendengar|tidak mengerti pertanyaan|apa yang kamu|apa yang anda tanyakan|ulangi pertanyaan|repeat|pardon|huh)\b/i

const DONT_KNOW_RE =
  /^(saya tidak tahu|tidak tahu|ga tahu|gak tahu|ndak tahu|tidak mengerti|kurang tahu|belum tahu|blum tau|nggak tau|aku tidak tahu|i don'?t know|idk|no idea|not sure)[\.\!\?]*$/i

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ConversationMessage = { role: string; content: string }

function markDimensionProgress(uncoveredDimensions: string[]): string[] {
  if (uncoveredDimensions.length === 0) return []
  return uncoveredDimensions.slice(1)
}

function isRepeatRequest(answer: string): boolean {
  const stripped = answer.trim().toLowerCase()
  const words = stripped.split(/\s+/)
  if (words.length <= 7 && REPEAT_RE.test(stripped)) return true
  if (/\b(ulangi pertanyaan|bisa ulang|tolong ulang|mohon ulangi)\b/i.test(stripped))
    return true
  return false
}

async function assessQuality(question: string, answer: string): Promise<string> {
  try {
    const prompt = buildQualityCheckPrompt(question, answer)
    const result = await deepseekChat([{ role: 'user', content: prompt }], {
      temperature: 0.1,
      max_tokens: 10,
    })
    const r = result.trim().toLowerCase()
    return ['strong', 'vague', 'short'].includes(r) ? r : 'strong'
  } catch {
    return 'strong'
  }
}

async function callWithHistory(
  messages: ConversationMessage[],
  systemInstruction: string
): Promise<string> {
  const allMessages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'system' as const, content: systemInstruction },
  ]
  return callDeepSeek(allMessages)
}

async function callSimple(prompt: string): Promise<string> {
  return callDeepSeek([{ role: 'user', content: prompt }])
}

async function callDeepSeek(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): Promise<string> {
  try {
    return await deepseekChat(messages, { temperature: 0.8, max_tokens: 350 })
  } catch (error) {
    console.error('[Interview Chat] DeepSeek error:', error)
    return 'Maaf, saya mengalami gangguan sebentar. Bisakah Anda melanjutkan jawaban Anda?'
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      messages = [] as ConversationMessage[],
      exchangeCount = 0,
      uncoveredDimensions = Object.keys(ASSESSMENT_DIMENSIONS),
      followUpUsed = false,
      dontKnowStreak = 0,
      lastAiraMessage = '',
      candidateName = 'Kandidat',
      answer,
      timeRemaining = '10:00',
    } = body

    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      return NextResponse.json({ error: 'Answer is required' }, { status: 400 })
    }

    const trimmedAnswer = answer.trim()
    const updatedMessages: ConversationMessage[] = [
      ...messages,
      { role: 'user', content: trimmedAnswer },
    ]

    // --- Handle repeat request ---
    if (isRepeatRequest(trimmedAnswer)) {
      const fallback = 'Bisa ceritakan sedikit tentang diri Anda dan latar belakang mengajar Anda?'
      const response = await callSimple(
        buildRepeatPrompt(lastAiraMessage || fallback)
      )
      const newMessages: ConversationMessage[] = [
        ...updatedMessages,
        { role: 'assistant', content: response },
      ]
      return NextResponse.json({
        interviewerResponse: response,
        interviewComplete: false,
        messages: newMessages,
        exchangeCount,
        uncoveredDimensions,
        followUpUsed,
        dontKnowStreak,
      })
    }

    // --- Handle "don't know" streak ---
    let newDontKnowStreak = dontKnowStreak
    if (DONT_KNOW_RE.test(trimmedAnswer.toLowerCase())) {
      newDontKnowStreak++
    } else {
      newDontKnowStreak = 0
    }

    if (newDontKnowStreak >= 2) {
      newDontKnowStreak = 0
      const newExchangeCount = exchangeCount + 1
      const newUncovered = markDimensionProgress(uncoveredDimensions)

      if (newExchangeCount >= MAX_EXCHANGES || newUncovered.length === 0) {
        const response = await callSimple(buildWrapUpPrompt(candidateName))
        const newMessages: ConversationMessage[] = [
          ...updatedMessages,
          { role: 'assistant', content: response },
        ]
        return NextResponse.json({
          interviewerResponse: response,
          interviewComplete: true,
          messages: newMessages,
          exchangeCount: newExchangeCount,
          uncoveredDimensions: newUncovered,
          followUpUsed: false,
          dontKnowStreak: 0,
        })
      }

      const nextDim = newUncovered[0]
      const hint = ASSESSMENT_DIMENSIONS[nextDim] || 'pendekatan mengajar mereka'
      const response = await callWithHistory(
        updatedMessages,
        buildDontKnowPrompt(hint)
      )
      const newMessages: ConversationMessage[] = [
        ...updatedMessages,
        { role: 'assistant', content: response },
      ]
      return NextResponse.json({
        interviewerResponse: response,
        interviewComplete: false,
        messages: newMessages,
        exchangeCount: newExchangeCount,
        uncoveredDimensions: newUncovered,
        followUpUsed: false,
        dontKnowStreak: 0,
      })
    }

    // --- Normal flow: assess quality then route ---
    const wordCount = trimmedAnswer.split(/\s+/).length
    let quality = 'strong'

    if (!followUpUsed) {
      if (wordCount < 12) {
        quality = 'short'
      } else {
        quality = await assessQuality(lastAiraMessage, trimmedAnswer)
      }
    }

    // Vague / short answer and follow-up not yet used → ask follow-up
    if ((quality === 'vague' || quality === 'short') && !followUpUsed) {
      const routingPrompt = buildRoutingPrompt(
        candidateName,
        exchangeCount,
        uncoveredDimensions,
        timeRemaining,
        true
      )
      const response = await callWithHistory(updatedMessages, routingPrompt)
      const newMessages: ConversationMessage[] = [
        ...updatedMessages,
        { role: 'assistant', content: response },
      ]
      return NextResponse.json({
        interviewerResponse: response,
        interviewComplete: false,
        messages: newMessages,
        exchangeCount,
        uncoveredDimensions,
        followUpUsed: true,
        dontKnowStreak: newDontKnowStreak,
      })
    }

    // Move to next exchange
    const newExchangeCount = exchangeCount + 1
    const newUncovered = markDimensionProgress(uncoveredDimensions)

    if (newExchangeCount >= MAX_EXCHANGES || newUncovered.length === 0) {
      const response = await callSimple(buildWrapUpPrompt(candidateName))
      const newMessages: ConversationMessage[] = [
        ...updatedMessages,
        { role: 'assistant', content: response },
      ]
      return NextResponse.json({
        interviewerResponse: response,
        interviewComplete: true,
        messages: newMessages,
        exchangeCount: newExchangeCount,
        uncoveredDimensions: newUncovered,
        followUpUsed: false,
        dontKnowStreak: newDontKnowStreak,
      })
    }

    const routingPrompt = buildRoutingPrompt(
      candidateName,
      newExchangeCount,
      newUncovered,
      timeRemaining,
      false
    )
    const response = await callWithHistory(updatedMessages, routingPrompt)
    const newMessages: ConversationMessage[] = [
      ...updatedMessages,
      { role: 'assistant', content: response },
    ]
    return NextResponse.json({
      interviewerResponse: response,
      interviewComplete: false,
      messages: newMessages,
      exchangeCount: newExchangeCount,
      uncoveredDimensions: newUncovered,
      followUpUsed: false,
      dontKnowStreak: newDontKnowStreak,
    })
  } catch (error) {
    console.error('Error processing interview chat:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}
