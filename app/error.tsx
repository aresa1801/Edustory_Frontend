'use client'

import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="surface w-full max-w-md p-8 text-center sm:p-10">
        <div className="mb-8">
          <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            Terjadi Kesalahan
          </h1>
          <p className="mt-4 text-muted-foreground">
            Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-muted-foreground/70">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button onClick={reset} className="h-12 gap-2 rounded-xl px-8 text-base font-semibold">
            <RefreshCw className="h-5 w-5" />
            Coba Lagi
          </Button>
        </div>
      </div>
    </div>
  )
}
