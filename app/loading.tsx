import { Spinner } from '@/components/ui/spinner'

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="surface flex flex-col items-center px-10 py-8 text-center">
        <Spinner className="mb-4 h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground">Memuat halaman...</p>
      </div>
    </div>
  )
}
