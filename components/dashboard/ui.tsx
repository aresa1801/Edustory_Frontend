import * as React from 'react'
import { cn } from '@/lib/utils'

/* ============================================================
   Shared dashboard UI primitives — EduStory redesign v3
   Theme: "Soft · Scholarly · Institutional"
   Presentational only. Safe in server or client components.
   ============================================================ */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  tone?: 'primary' | 'secondary' | 'accent' | 'muted'
  className?: string
}) {
  const toneMap: Record<string, string> = {
    primary: 'bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-primary/15',
    secondary: 'bg-gradient-to-br from-secondary/15 to-secondary/5 text-secondary ring-secondary/15',
    accent: 'bg-gradient-to-br from-accent/20 to-accent/5 text-accent-foreground ring-accent/20',
    muted: 'bg-muted text-muted-foreground ring-border/60',
  }
  return (
    <div className={cn('surface hover-card p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
              toneMap[tone]
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('surface overflow-hidden', className)}>
      {title || actions ? (
        <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-semibold sm:text-lg">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/12 to-accent/12 text-primary ring-1 ring-inset ring-primary/10">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <p className="text-base font-semibold">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function TonePill({
  tone = 'muted',
  children,
  className,
}: {
  tone?: 'primary' | 'secondary' | 'accent' | 'danger' | 'muted'
  children: React.ReactNode
  className?: string
}) {
  const toneMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-secondary/10 text-secondary border-secondary/20',
    accent: 'bg-accent/18 text-accent-foreground border-accent/30',
    danger: 'bg-destructive/10 text-destructive border-destructive/25',
    muted: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        toneMap[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
