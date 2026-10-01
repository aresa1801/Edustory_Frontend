import { createClient } from '@supabase/supabase-js'

export async function autoCompleteExpiredSessions() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const nowMs = Date.now()

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, match_id, student_id, tutor_id, started_at, duration_minutes')
      .eq('status', 'ongoing')
      .not('started_at', 'is', null)
      .is('completed_at', null)

    if (!sessions || sessions.length === 0) return { completed: 0 }

    const toComplete = sessions.filter((s: any) => {
      const iso = String(s.started_at).replace(' ', 'T')
      const startMs = new Date(iso).getTime()
      if (isNaN(startMs)) return false
      return nowMs >= startMs + (s.duration_minutes || 60) * 60 * 1000
    })

    if (toComplete.length === 0) return { completed: 0 }

    let completed = 0

    for (const session of toComplete) {
      try {
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

        const { data: hold } = await supabase
          .from('wallet_transactions')
          .select('id, status')
          .eq('reference', session.id)
          .eq('type', 'session_hold')
          .maybeSingle()

        if (!hold) continue
        if (['completed', 'cancelled', 'moved'].includes(hold.status)) continue

        await supabase
          .from('wallet_transactions')
          .update({
            status: 'completed',
            type: 'session_payment',
            description: `Pembayaran Sesi - ${match.tutor_full_name || 'Tutor'}`,
          })
          .eq('id', hold.id)

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
          await supabase
            .from('wallets')
            .insert({ tutor_id: session.tutor_id, balance: tutorEarning })
        }

        await supabase.from('wallet_transactions').insert({
          tutor_id: session.tutor_id,
          match_id: session.match_id,
          amount: tutorEarning,
          type: 'session_earning',
          status: 'completed',
          reference: session.id,
          description: `Pendapatan Sesi - ${match.tutor_full_name || 'Tutor'}`,
          balance_after: newTutorBalance,
        }).then(() => {}, () => {})

        const { data: pw } = await supabase
          .from('platform_wallet')
          .select('id, balance')
          .limit(1)
          .maybeSingle()

        if (pw) {
          const newPlatBal = (Number(pw.balance) || 0) + fee
          await supabase
            .from('platform_wallet')
            .update({ balance: newPlatBal, updated_at: new Date().toISOString() })
            .eq('id', pw.id)

          await supabase.from('wallet_transactions').insert({
            match_id: session.match_id,
            amount: fee,
            type: 'platform_fee',
            status: 'completed',
            reference: session.id,
            description: `Biaya Platform (10%) - Sesi ${session.id.slice(0, 8)}`,
            balance_after: newPlatBal,
          }).then(() => {}, () => {})
        }

        await supabase
          .from('sessions')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', session.id)

        completed++
      } catch (err) {
        console.error('[autoComplete] error:', session.id, err)
      }
    }

    return { completed }
  } catch (err) {
    console.error('[autoComplete] unexpected:', err)
    return { completed: 0 }
  }
}