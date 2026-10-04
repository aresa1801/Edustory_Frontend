'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'

export default function DailyLoginReward() {
  const { user, loading } = useAuth()
  const fired = useRef(false)

  useEffect(() => {
    console.log('[daily-login] useEffect RUN | loading=', loading, '| user.id=', user?.id ?? 'NULL')

    if (loading) {
      console.log('[daily-login] SKIP: masih loading')
      return
    }
    if (!user?.id) {
      console.log('[daily-login] SKIP: user.id null')
      return
    }
    if (fired.current) {
      console.log('[daily-login] SKIP: udah fired di mount ini')
      return
    }
    fired.current = true

    console.log('[daily-login] MULAI FETCH...')

    ;(async () => {
      try {
        const res = await fetch('/api/credit/daily-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        })

        console.log('[daily-login] STATUS:', res.status)

        if (!res.ok) {
          const errBody = await res.text()
          console.warn('[daily-login] failed:', res.status, errBody)
          return
        }

        const json = await res.json()
        console.log('[daily-login] RESPONSE:', json)

        if (json.claimed) {
          console.log(`[daily-login] ✅ +1 credit! Skor baru: ${json.newScore}`)
        } else {
          console.log('[daily-login] ⏭️ sudah claim hari ini, skip.')
        }
      } catch (e) {
        console.error('[daily-login] CATCH:', e)
      }
    })()
  }, [user?.id, loading])

  return null
}