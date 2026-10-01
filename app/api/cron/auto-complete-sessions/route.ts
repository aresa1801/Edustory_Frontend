import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const nowMs = now.getTime()

  // 1. Ambil session ongoing yang sudah lewat deadline
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, started_at, duration_minutes, match_id, student_id, tutor_id')
    .eq('status', 'ongoing')
    .not('started_at', 'is', null)
    .is('completed_at', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const toComplete = (sessions || []).filter((s) => {
    const iso = String(s.started_at).replace(' ', 'T')
    const startMs = new Date(iso).getTime()
    if (isNaN(startMs)) return false
    const deadline = startMs + (s.duration_minutes || 60) * 60 * 1000
    return nowMs >= deadline
  })

  if (toComplete.length === 0) {
    return NextResponse.json({
      sessionsCompleted: 0,
      message: 'No sessions to complete',
      sessionsFound: sessions?.length || 0,
    })
  }

  // 2. Proses tiap session — logic sama persis dengan endpoint complete
  let completed = 0

  for (const session of toComplete) {
    try {
      // 2a. Ambil match
      const { data: match } = await supabase
        .from('matches')
        .select('tutor_hourly_rate, tutor_full_name')
        .eq('id', session.match_id)
        .single()

      if (!match) continue

      const rate = Number(match.tutor_hourly_rate) || 0
      if (rate <= 0) continue

      const fee = Math.round(rate * 0.1)
      const tutorEarning = rate - fee

      // 2b. Cari hold
      const { data: hold } = await supabase
        .from('wallet_transactions')
        .select('id, status')
        .eq('reference', session.id)
        .eq('type', 'session_hold')
        .maybeSingle()

      if (!hold) continue
      if (hold.status === 'completed') continue
      if (['cancelled', 'moved'].includes(hold.status)) continue

      // 2c. Update hold → session_payment
      const { error: holdErr } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'completed',
          type: 'session_payment',
          description: `Pembayaran Sesi - ${match.tutor_full_name || 'Tutor'}`,
        })
        .eq('id', hold.id)

      if (holdErr) {
        console.error('[CRON] hold update:', holdErr)
        continue
      }

      // 2d. Deduct student
      const { data: sw } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('student_id', session.student_id)
        .maybeSingle()

      if (sw) {
        await supabase
          .from('wallets')
          .update({ balance: (Number(sw.balance) || 0) - rate })
          .eq('id', sw.id)
      }

      // 2e. Credit tutor
      const { data: tw } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('tutor_id', session.tutor_id)
        .maybeSingle()

      let newTutorBalance = tutorEarning

      if (tw) {
        newTutorBalance = (Number(tw.balance) || 0) + tutorEarning
        await supabase
          .from('wallets')
          .update({ balance: newTutorBalance })
          .eq('id', tw.id)
      } else {
        const { error: insErr } = await supabase
          .from('wallets')
          .insert({ tutor_id: session.tutor_id, balance: tutorEarning })
        if (insErr) console.error('[CRON] tutor wallet insert:', insErr)
      }

      // 2f. Insert session_earning
      await supabase.from('wallet_transactions').insert({
        tutor_id: session.tutor_id,
        match_id: session.match_id,
        amount: tutorEarning,
        type: 'session_earning',
        status: 'completed',
        reference: session.id,
        description: `Pendapatan Sesi - ${match.tutor_full_name || 'Tutor'}`,
        balance_after: newTutorBalance,
      })

      // 2g. Credit platform
      const { data: pw } = await supabase
        .from('platform_wallet')
        .select('id, balance')
        .limit(1)
        .maybeSingle()

      if (pw) {
        const newPlatformBalance = (Number(pw.balance) || 0) + fee
        await supabase
          .from('platform_wallet')
          .update({ balance: newPlatformBalance, updated_at: new Date().toISOString() })
          .eq('id', pw.id)

        await supabase.from('wallet_transactions').insert({
          match_id: session.match_id,
          amount: fee,
          type: 'platform_fee',
          status: 'completed',
          reference: session.id,
          description: `Biaya Platform (10%) - Sesi ${session.id.slice(0, 8)}`,
          balance_after: newPlatformBalance,
        })
      }

      // 2h. Update session
      await supabase
        .from('sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      completed++
    } catch (err) {
      console.error('[CRON] session error:', session.id, err)
    }
  }

  return NextResponse.json({
    sessionsCompleted: completed,
    timestamp: now.toISOString(),
  })
}