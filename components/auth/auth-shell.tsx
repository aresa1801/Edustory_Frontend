import Link from 'next/link'
import { BookOpen, BadgeCheck, CalendarCheck, MessagesSquare } from 'lucide-react'

const benefits = [
  { icon: BadgeCheck, text: 'Pengajar terverifikasi & berpengalaman' },
  { icon: CalendarCheck, text: 'Atur jadwal fleksibel dari mana saja' },
  { icon: MessagesSquare, text: 'Pantau progres & komunikasi langsung' },
]

export default function AuthShell({
  children,
  wide = false,
}: {
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, color-mix(in oklab, var(--primary) 85%, transparent), transparent 50%), radial-gradient(circle at 80% 85%, color-mix(in oklab, var(--accent) 70%, transparent), transparent 50%)',
          }}
        />
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen className="h-4.5 w-4.5" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight text-background">
              Edu<span className="text-primary">Story</span>
            </span>
          </Link>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-3xl font-extrabold leading-tight text-background xl:text-4xl">
            Belajar lebih cepat dengan pengajar yang tepat untukmu
          </h1>
          <ul className="mt-8 space-y-4">
            {benefits.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-medium text-background/80">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background/10 text-background">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-background/50">
          &copy; {new Date().getFullYear()} EduStory. Platform pembelajaran privat.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
          {/* Mobile brand */}
          <Link href="/" className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen className="h-4.5 w-4.5" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight">
              Edu<span className="text-primary">Story</span>
            </span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}
