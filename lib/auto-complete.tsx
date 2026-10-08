import { createClient } from '@supabase/supabase-js'
import { adjustCredit, DELTA } from '@/lib/credit'
import { calcSessionFee, PLATFORM_FEE_PERCENT } from '@/lib/fees'

export async function autoCompleteExpiredSessions() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, cache: 'no-store' }),
        },
      }
    )

    const nowMs = Date.now()

    // ============================================================
    // BAGIAN 1 — Complete session `ongoing` yang udah lewat deadline
    // ============================================================
    const { data: ongoingSessions } = await supabase
      .from('sessions')
      .select('id, match_id, student_id, tutor_id, started_at, duration_minutes')
      .eq('status', 'ongoing')
      .not('started_at', 'is', null)
      .is('completed_at', null)

    const toComplete = (ongoingSessions || []).filter((s: any) => {
      const iso = String(s.started_at).replace(' ', 'T')
      const startMs = new Date(iso).getTime()
      if (isNaN(startMs)) return false
      return nowMs >= startMs + (s.duration_minutes || 60) * 60 * 1000
    })

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

        const { fee, tutorEarning } = calcSessionFee(rate)

        // 🔥 CLAIM — conditional UPDATE sebagai mutex
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

        // Baca balance tutor setelah update
        const { data: tw2 } = await supabase
          .from('wallets')
          .select('balance')
          .eq('tutor_id', session.tutor_id)
          .maybeSingle()
        const newTutorBalance = Number(tw2?.balance) || tutorEarning

        // Insert log earning
        await supabase
          .from('wallet_transactions')
          .insert({
            tutor_id: session.tutor_id,
            match_id: session.match_id,
            amount: tutorEarning,
            type: 'session_earning',
            status: 'completed',
            reference: session.id,
            description: `Pendapatan Sesi - ${match.tutor_full_name || 'Tutor'}`,
            balance_after: newTutorBalance,
          })
          .then(() => {}, () => {})

        // Credit platform wallet — direct read-modify-write.
        // CATATAN: sebelumnya pakai RPC `wallet_credit_platform` yang ternyata SELALU
        // gagal (Postgres 21000 "UPDATE requires a WHERE clause"), sehingga fee platform
        // tidak pernah masuk. Sekarang ditulis langsung.
        const { data: pw2 } = await supabase
          .from('platform_wallet')
          .select('id, balance')
          .limit(1)
          .maybeSingle()

        let newPlatBal = fee
        if (pw2) {
          newPlatBal = (Number(pw2.balance) || 0) + fee
          await supabase
            .from('platform_wallet')
            .update({ balance: newPlatBal, updated_at: new Date().toISOString() })
            .eq('id', pw2.id)
        } else {
          await supabase.from('platform_wallet').insert({ balance: fee })
        }

        // Insert log platform fee
        await supabase
          .from('wallet_transactions')
          .insert({
            match_id: session.match_id,
            amount: fee,
            type: 'platform_fee',
            status: 'completed',
            reference: session.id,
            description: `Biaya Platform (${PLATFORM_FEE_PERCENT}%) - Sesi ${session.id.slice(0, 8)}`,
            balance_after: newPlatBal,
          })
          .then(() => {}, () => {})

        // Update session → completed
        await supabase
          .from('sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', session.id)

        completed++
      } catch (err) {
        console.error('[autoComplete] error:', session.id, err)
      }
    }

    // ============================================================
    // BAGIAN 2 — CATCH-UP: kasih +2 ke session yang udah `completed`
    // tapi belum dikasih log credit `both_ready`
    // (scoped ke 15 menit terakhir, biar gak nabrak data lama)
    // ============================================================
    const cutoff15min = new Date(nowMs - 15 * 60 * 1000).toISOString()

    const { data: recentlyCompleted } = await supabase
      .from('sessions')
      .select('id, match_id, student_id, tutor_id, completed_at')
      .eq('status', 'completed')
      .gte('completed_at', cutoff15min)
      .not('started_at', 'is', null)

    let creditAwarded = 0

    for (const session of recentlyCompleted || []) {
      try {
        // Anti-dobel: cek apakah session ini udah pernah dikasih +2
        const { data: existingReward } = await supabase
          .from('credit_log')
          .select('id')
          .eq('ref_id', session.id)
          .eq('reason', 'both_ready')
          .limit(1)

        if (existingReward && existingReward.length > 0) continue

        const results = await Promise.all([
          adjustCredit({
            profileId: session.tutor_id,
            role: 'tutor',
            delta: DELTA.both_ready,
            reason: 'both_ready',
            refId: session.id,
          }),
          adjustCredit({
            profileId: session.student_id,
            role: 'student',
            delta: DELTA.both_ready,
            reason: 'both_ready',
            refId: session.id,
          }),
        ])

        creditAwarded += results.filter((r) => r.ok).length
      } catch (err) {
        console.error('[autoComplete] catchup error:', session.id, err)
      }
    }

    return { completed, creditAwarded }
  } catch (err) {
    console.error('[autoComplete] unexpected:', err)
    return { completed: 0, creditAwarded: 0 }
  }
}