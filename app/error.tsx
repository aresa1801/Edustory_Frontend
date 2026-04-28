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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/10 mb-6">
            <AlertCircle className="w-12 h-12 text-red-400" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Terjadi Kesalahan
          </h1>
          <p className="text-muted-foreground mb-2">
            Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/60">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={reset}
            className="bg-primary hover:bg-primary/90 text-white h-12 px-8 text-base font-semibold gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Coba Lagi
          </Button>
        </div>
      </div>
    </div>
  )
}
