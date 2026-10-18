import Link from 'next/link'
import Header from '@/components/header'
import Footer from '@/components/footer'

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 md:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Legal</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">Terakhir diperbarui: {updated}</p>
        <div className="mt-8 space-y-7 text-sm leading-relaxed text-foreground/85 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          Pertanyaan? Hubungi{' '}
          <a href="mailto:support@edustory.id" className="text-primary underline">
            support@edustory.id
          </a>
          . Lihat juga{' '}
          <Link href="/terms" className="text-primary underline">
            Ketentuan Layanan
          </Link>{' '}
          dan{' '}
          <Link href="/privacy" className="text-primary underline">
            Kebijakan Privasi
          </Link>
          .
        </p>
      </main>
      <Footer />
    </div>
  )
}
