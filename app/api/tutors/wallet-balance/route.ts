import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const tutorId = searchParams.get('tutor_id')

    if (!tutorId) {
      return NextResponse.json({ balance: 0 })
    }

    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('tutor_id', tutorId)
      .maybeSingle()

    if (error) {
      console.error('[tutor-balance] error:', error)
      return NextResponse.json({ balance: 0 })
    }

    return NextResponse.json({
      balance: Number(wallet?.balance) || 0,
    })
  } catch (err) {
    console.error('[tutor-balance] unexpected:', err)
    return NextResponse.json({ balance: 0 })
  }
}