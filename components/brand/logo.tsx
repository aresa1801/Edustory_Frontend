import Link from "next/link"
import { cn } from "@/lib/utils"

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Edustory">
      <defs>
        <linearGradient id="edustory-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0F3B33" />
          <stop offset="100%" stopColor="#0B201C" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#edustory-bg)" />
      <path
        d="M13.5 21.5c0-1.9 1.6-3.3 3.5-2.9 5.2 1.1 9.9 3.2 15 6.9v25.2c-5.5-3.7-10.4-5.8-15.8-6.9-1.6-.3-2.7-1.7-2.7-3.3V21.5Z"
        fill="#F7F3E7"
      />
      <path
        d="M50.5 21.5c0-1.9-1.6-3.3-3.5-2.9-5.2 1.1-9.9 3.2-15 6.9v25.2c5.5-3.7 10.4-5.8 15.8-6.9 1.6-.3 2.7-1.7 2.7-3.3V21.5Z"
        fill="#FFFDF6"
      />
      <path d="M32 25.6v24.7" stroke="#0B201C" strokeWidth="1.8" strokeLinecap="round" opacity="0.22" />
      <path d="M46.5 8.5l2.4 5.9 5.9 2.4-5.9 2.4-2.4 5.9-2.4-5.9-5.9-2.4 5.9-2.4 2.4-5.9Z" fill="#F2B441" />
      <circle cx="49" cy="49" r="2.2" fill="#3ED3A3" />
    </svg>
  )
}

export function BrandLogo({
  className,
  size = "md",
  showTagline = false,
  href = "/",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
  showTagline?: boolean
  href?: string | null
}) {
  const markSize = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10"
  const textSize = size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl"

  const inner = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark className={markSize} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-sans font-extrabold tracking-tight", textSize)}>
          <span className="text-foreground">edu</span>
          <span className="text-primary">story</span>
        </span>
        {showTagline ? (
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Belajar yang terasa personal
          </span>
        ) : null}
      </span>
    </span>
  )

  if (!href) return inner
  return (
    <Link href={href} className="inline-flex items-center" aria-label="Edustory">
      {inner}
    </Link>
  )
}
