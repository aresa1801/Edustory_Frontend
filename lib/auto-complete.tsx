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
        // Ambil match
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

        // 🔥 CLAIM — conditional UPDATE sebagai mutex.
        // Kalau 2 instance healing jalan paralel, cuma 1 yang dapet row.
        const { data: claimed, error: claimErr } = await supabase
          .from('wallet_transactions')
          .update({
            status: 'completed',
            type: 'session_payment',
            description: `Pembayaran Sesi - ${match.tutor_full_name || 'Tutor'}`,
          })
          .eq('reference', session.id)
          .eq('type', 'session_hold')
          .in('status', ['pending', 'active'])
          .select('id')
          .maybeSingle()

        if (claimErr || !claimed) {
          // Instance lain sudah claim, atau status tidak eligible → skip
          continue
        }

        // ===== DARI SINI, HANYA 1 INSTANCE YANG JALAN =====

        // Atomic deduct student
        await supabase.rpc('wallet_deduct', {
          p_student_id: session.student_id,
          p_amount: rate,
        })

        // Credit tutor — atomic
        const { data: tw } = await supabase
          .from('wallets')
          .select('id')
          .eq('tutor_id', session.tutor_id)
          .maybeSingle()

        if (!tw) {
          await supabase
            .from('wallets')
            .insert({ tutor_id: session.tutor_id, balance: tutorEarning })
        } else {
          await supabase.rpc('wallet_credit_tutor', {
            p_tutor_id: session.tutor_id,
            p_amount: tutorEarning,
          })
        }

        // Baca balance tutor setelah update (buat balance_after di log)
        const { data: tw2 } = await supabase
          .from('wallets')
          .select('balance')
          .eq('tutor_id', session.tutor_id)
          .maybeSingle()
        const newTutorBalance = Number(tw2?.balance) || tutorEarning

        // Insert log earning (unique index protect)
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

        // Atomic credit platform
        await supabase.rpc('wallet_credit_platform', { p_amount: fee })

        // Baca balance platform setelah update
        const { data: pw2 } = await supabase
          .from('platform_wallet')
          .select('balance')
          .limit(1)
          .maybeSingle()
        const newPlatBal = Number(pw2?.balance) || fee

        // Insert log platform fee
        await supabase.from('wallet_transactions').insert({
          match_id: session.match_id,
          amount: fee,
          type: 'platform_fee',
          status: 'completed',
          reference: session.id,
          description: `Biaya Platform (10%) - Sesi ${session.id.slice(0, 8)}`,
          balance_after: newPlatBal,
        }).then(() => {}, () => {})

        // Update session
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