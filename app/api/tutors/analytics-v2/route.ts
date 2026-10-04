import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidUUID } from '@/lib/security/sanitize'
import { getCreditTier } from '@/lib/credit'

export const dynamic = 'force-dynamic'

function anonymizeName(name: string | null | undefined): string {
  if (!name) return 'Anonim'
  const t = name.trim()
  if (!t) return 'Anonim'
  return `${t.charAt(0).toUpperCase()}***`
}

const HARDCODED_USER_ID = '12ec1818-8c38-4b9d-8142-56ee80ce566c'

export async function GET(req: NextRequest) {
  try {
    const urlUserId = new URL(req.url).searchParams.get('user_id')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ===== TES 1: pakai user_id dari URL =====
    const { data: tutorFromUrl, error: err1 } = await supabase
      .from('tutors')
      .select('id, credit_score, suspended_until, rating, total_reviews')
      .eq('user_id', urlUserId || '')
      .maybeSingle()

    // ===== TES 2: pakai HARDCODED user_id =====
    const { data: tutorFromHardcode, error: err2 } = await supabase
      .from('tutors')
      .select('id, credit_score, suspended_until, rating, total_reviews')
      .eq('user_id', HARDCODED_USER_ID)
      .maybeSingle()

    // ===== TES 3: count credit_log dengan URL user_id =====
    const { data: logFromUrl } = await supabase
      .from('credit_log')
      .select('id, reason, created_at')
      .eq('user_id', urlUserId || '')
      .eq('role', 'tutor')
      .order('created_at', { ascending: false })

    // ===== TES 4: count credit_log dengan hardcoded =====
    const { data: logFromHardcode } = await supabase
      .from('credit_log')
      .select('id, reason, created_at')
      .eq('user_id', HARDCODED_USER_ID)
      .eq('role', 'tutor')
      .order('created_at', { ascending: false })

    return NextResponse.json(
      {
        _marker: 'DIAGNOSTIC_' + Date.now(),
        _urlUserId: urlUserId,
        _urlUserIdLength: urlUserId?.length ?? null,
        _hardcodedUserId: HARDCODED_USER_ID,

        tes1_tutorFromUrl: tutorFromUrl,
        tes1_err: err1?.message ?? null,

        tes2_tutorFromHardcode: tutorFromHardcode,
        tes2_err: err2?.message ?? null,

        tes3_logCountFromUrl: logFromUrl?.length ?? 0,
        tes3_logsFromUrl: logFromUrl,

        tes4_logCountFromHardcode: logFromHardcode?.length ?? 0,
        tes4_logsFromHardcode: logFromHardcode,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (err) {
    console.error('[diagnostic]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}