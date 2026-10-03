import { NextRequest, NextResponse } from 'next/server'
import { autoCompleteExpiredSessions } from '@/lib/auto-complete'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await autoCompleteExpiredSessions()
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cron auto-complete] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}