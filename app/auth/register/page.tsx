'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/auth/login')
  }, [router])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
      Mengalihkan ke halaman masuk...
    </main>
  )
}
