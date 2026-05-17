/**
 * POST /api/ai/interview/start
 *
 * Initialises a conversational AI interview session.
 * Looks up the tutor's name from user_profiles, generates a warm opening
 * message via DeepSeek, and returns the initial session state.
 *
 * Response:
 * {
 *   openingMessage: string
 *   candidateName: string
 *   uncoveredDimensions: string[]
 *   exchangeCount: number      // always 0
 * }
 */

import { createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { deepseekChat } from '@/lib/deepseek'
import { NextRequest, NextResponse } from 'next/server'
import { buildOpeningPrompt, ASSESSMENT_DIMENSIONS } from '@/lib/interview-prompts'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(_req: NextRequest) {
  try {
    const authClient = await createServerClient()
    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Look up the tutor's display name from user_profiles
    const supabase = getAdminClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('name')
      .eq('id', user.id)
      .single()

    const candidateName =
      (profile?.name as string | null | undefined)?.trim() || 'Kandidat'

    const prompt = buildOpeningPrompt(candidateName)
    const openingMessage = await deepseekChat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.8, max_tokens: 350 }
    )

    return NextResponse.json({
      openingMessage,
      candidateName,
      uncoveredDimensions: Object.keys(ASSESSMENT_DIMENSIONS),
      exchangeCount: 0,
    })
  } catch (error) {
    console.error('Error starting interview:', error)
    return NextResponse.json({ error: 'Failed to start interview' }, { status: 500 })
  }
}
