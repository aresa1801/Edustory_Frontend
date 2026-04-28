import { Spinner } from '@/components/ui/spinner'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Spinner className="h-10 w-10 text-primary mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Memuat halaman...</p>
      </div>
    </div>
  )
}
