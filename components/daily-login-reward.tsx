'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'

/**
 * Komponen silent — gak nampilin apa-apa.
 * Dipasang di dashboard layout supaya setiap kali user buka/refresh
 * halaman dashboard manapun, ini auto-call endpoint daily-login.
 */
export default function DailyLoginReward() {
  const { user, loading } = useAuth()
  const fired = useRef(false)

  useEffect(() => {
    if (loading) return
    if (!user?.id) return
    if (fired.current) return
    fired.current = true

    // Guard per sesi browser biar gak spam
    const key = `daily-login-fired-${user.id}`
    if (typeof window !== 'undefined' && sessionStorage.getItem(key)) {
      return
    }

    ;(async () => {
      try {
        const res = await fetch('/api/credit/daily-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        })

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(key, '1')
        }

        if (!res.ok) {
          console.warn('[daily-login] failed:', res.status)
          return
        }

        const json = await res.json()
        if (json.claimed) {
          console.log(`[daily-login] +1 credit! Skor baru: ${json.newScore}`)
        } else {
          console.log('[daily-login] sudah claim hari ini, skip.')
        }
      } catch (e) {
        console.error('[daily-login] error:', e)
      }
    })()
  }, [user?.id, loading])

  return null
}