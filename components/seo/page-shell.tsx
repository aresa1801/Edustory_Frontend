import Link from 'next/link'

export function SeoShell({
  children,
  breadcrumb,
}: {
  children: React.ReactNode
  breadcrumb?: { label: string; href?: string }[]
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="font-heading text-lg font-extrabold tracking-tight text-[var(--primary)]">
            Edustory
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-[var(--muted-foreground)]">
            <Link href="/les-privat" className="hover:text-[var(--primary)]">
              Les Privat
            </Link>
            <Link href="/blog" className="hover:text-[var(--primary)]">
              Blog
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[var(--primary)] px-4 py-2 text-[var(--primary-foreground)] transition hover:opacity-90"
            >
              Daftar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <Link href="/" className="hover:text-[var(--primary)]">
              Beranda
            </Link>
            {breadcrumb.map((b) => (
              <span key={b.label} className="flex items-center gap-1.5">
                <span aria-hidden="true">/</span>
                {b.href ? (
                  <Link href={b.href} className="hover:text-[var(--primary)]">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-[var(--foreground)]">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {children}
      </main>

      <footer className="mt-12 border-t border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-[var(--muted-foreground)] md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Edustory — belajar privat yang terasa personal.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/les-privat" className="hover:text-[var(--primary)]">
                Semua mapel
              </Link>
              <Link href="/privacy" className="hover:text-[var(--primary)]">
                Kebijakan Privasi
              </Link>
              <Link href="/terms" className="hover:text-[var(--primary)]">
                Ketentuan Layanan
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export function SectionTitle({ children, kicker }: { children: React.ReactNode; kicker?: string }) {
  return (
    <div className="mb-6">
      {kicker && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">{kicker}</p>
      )}
      <h2 className="font-heading text-2xl font-extrabold tracking-tight md:text-3xl">{children}</h2>
    </div>
  )
}

export function CtaBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
      <h2 className="font-heading text-xl font-extrabold md:text-2xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)] md:text-base">{text}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/register"
          className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90"
        >
          Cari tutor sekarang
        </Link>
        <Link
          href="/"
          className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
          Lihat cara kerja Edustory
        </Link>
      </div>
    </div>
  )
}
