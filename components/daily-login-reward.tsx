'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'

export default function DailyLoginReward() {
  const { user, loading } = useAuth()
  const fired = useRef(false)

  useEffect(() => {
    if (loading) return
    if (!user?.id) return
    if (fired.current) return
    fired.current = true

    ;(async () => {
      try {
        const res = await fetch('/api/credit/daily-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        })

        if (!res.ok) {
          console.warn('[daily-login] failed:', res.status)
          return
        }

        const json = await res.json()
        if (json.claimed) {
          console.log(`[daily-login] ✅ +1 credit! Skor baru: ${json.newScore}`)
        } else {
          console.log('[daily-login] ⏭️ sudah claim hari ini, skip.')
        }

        // ⬇️ BARU: broadcast supaya komponen lain (analytics, dll) re-fetch
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('credit-updated', {
              detail: { newScore: json.newScore, claimed: json.claimed },
            })
          )
        }
      } catch (e) {
        console.error('[daily-login] error:', e)
      }
    })()
  }, [user?.id, loading])

  return null
}