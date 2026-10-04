'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

export default function TutorAnalyticsPage() {
  const { user, userRole, loading } = useAuth()
  const [result, setResult] = useState<string>('BELUM FETCH')
  const [renderCount, setRenderCount] = useState(0)

  // Hitung render
  useEffect(() => {
    setRenderCount((c) => c + 1)
  }, [])

  // Fetch test
  useEffect(() => {
    setResult(`useEffect RUN | user.id=${user?.id ?? 'NULL'} | role=${userRole ?? 'NULL'} | loading=${loading}`)

    if (!user?.id) {
      setResult((r) => r + ' | STOP: user.id null')
      return
    }

    setResult((r) => r + ' | CALLING FETCH...')

    fetch(`/api/tutor/analytics?user_id=${user.id}`)
      .then(async (res) => {
        setResult((r) => r + ` | STATUS=${res.status}`)
        const json = await res.json()
        setResult((r) => r + ` | BODY=${JSON.stringify(json).slice(0, 300)}`)
      })
      .catch((e) => {
        setResult((r) => r + ` | ERROR=${e.message}`)
      })
  }, [user?.id, userRole, loading])

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', fontSize: 14 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>🔍 DEBUG PAGE</h1>

      <div style={{ background: '#111', color: '#0f0', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <div>Render count: {renderCount}</div>
        <div>user.id: {user?.id ?? 'NULL'}</div>
        <div>user.email: {user?.email ?? 'NULL'}</div>
        <div>userRole: {userRole ?? 'NULL'}</div>
        <div>loading: {String(loading)}</div>
      </div>

      <div style={{ background: '#001', color: '#0ff', padding: 16, borderRadius: 8 }}>
        <div style={{ marginBottom: 8, fontWeight: 'bold' }}>HASIL FETCH:</div>
        <div style={{ wordBreak: 'break-all' }}>{result}</div>
      </div>
    </div>
  )
}