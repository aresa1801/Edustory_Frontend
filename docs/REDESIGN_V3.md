# EduStory Redesign v3 — "Soft · Scholarly · Institutional"

Design tokens & utilities live in `app/globals.css` (already updated). **Do not edit** shared files;
only touch the page/component files listed for your wave.

## Golden rule — RESTYLE ONLY
Never change: data fetching, hooks, state, handlers, props/API, conditionals, route paths,
Supabase/payment calls, or any **user-visible copy** (text must stay identical). No new deps.

## Design tokens (use these, never raw hex)
- Colors: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-muted`,
  `border-border`, `text-primary`/`bg-primary`, `secondary`, `accent` (+ `accent-foreground`),
  `destructive`, `success`, `warning`.
- Radius: prefer `rounded-2xl` / `rounded-xl` (soft, not stiff). Avoid hard corners.
- Shadow: `shadow-soft`, `hover:shadow-lifted`.

## Utility classes (globals.css)
- `.container-page`, `.section-pad`, `.eyebrow`
- `.surface` (card base: rounded-2xl + border + shadow-soft)
- `.hover-card` (lift on hover), `.card-hover` (subtle border+shadow on hover)
- `.surface-gradient` (premium card w/ gradient hairline — hero/feature cards, sparingly)
- `.text-gradient`, `.glass-effect`, `.gradient-border`, `.safe-bottom`, `.safe-top`
- `.animate-fade-in`, `.animate-slide-up`, `.animate-scale-in`

## Look & feel
- **Institutional, calm, premium.** Generous whitespace, clear hierarchy, refined rhythm.
- **Cards not stiff:** big radius, 1px `border-border/70`, soft layered shadow, optional
  gradient hairline (`surface-gradient`) for hero/stat/feature cards.
- **Minimalist hover:** `transition ... duration-200 ease-out`, lift <=4px (`hover:-translate-y-1`),
  shadow grows, border tints to `primary/20`. No bouncy/flashy effects, no color flooding.
- **Colors:** indigo `primary` for actions, teal `secondary` for positive/verified,
  soft gold `accent` for highlights/badges. Mostly neutral + one accent per card.
- **Progress/Data:** use semantic tokens; keep charts on `chart-1..5`.
- **Typography:** body Inter, headings Plus Jakarta Sans. Improve spacing, not font switching.
- **States:** keep loading/empty/error states; restyle with `.surface` + EmptyState look.
- **A11y:** keep focus-visible, aria, semantics. Responsive mobile-first.

## Must NOT edit (shared, owned by coordinator)
`app/globals.css`, `app/layout.tsx`, `tailwind.config.ts`, `components/ui/**`,
`components/dashboard/ui.tsx`, `components/dashboard/shared-layout.tsx`,
`components/protected-layout.tsx`, `docs/**`.

## Verify
`cd /tmp/edustory && npx tsc --noEmit` must pass. Do NOT run `next build`. Do NOT git commit/push.
Return: files changed + a 1-2 line summary.
