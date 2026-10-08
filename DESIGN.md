# EduStory — Design System Brief (Redesign v2 "Warm & Sharp")

All redesign work MUST follow this file. Goal: consistent, professional, friendly UI/UX on
**desktop and mobile**, without changing any function, data, route, or business logic.

## Golden rule
**Restyle only.** Never change: data fetching, hooks, state, event handlers, props/API of
components, conditionals, route paths, Supabase/payment calls, or user-visible copy
(except fixing clearly broken/truncated text). Only change `className`, layout wrappers,
and presentational markup/icons.

## Tokens (already in `app/globals.css`)
Use semantic Tailwind classes driven by tokens — NOT raw slate/gray palettes:
- Surfaces: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`
- Brand: `text-primary`, `bg-primary`, `border-primary`, `bg-primary/10`, `text-primary-foreground`
- Accents: `text-secondary` / `bg-secondary` (emerald), `text-accent` / `bg-accent` (amber)
- Status: `text-destructive`, `text-success`, `text-warning`
- Borders: `border-border`, `border-border/60`, `border-border/40`
- Radius: `rounded-xl` (cards), `rounded-2xl` (panels), `rounded-lg` (controls)
- Shadow: `shadow-soft` (resting card), `shadow-lifted` (hover/modal)
- Fonts: `font-display` for headings (`h1..h6` already default to display), Inter for body.

## Utility classes (already in globals.css)
`.container-page` (max-width + responsive padding) · `.section-pad` · `.eyebrow` (small
uppercase label) · `.display` (big heading) · `.surface` (card: bg+radius+border+shadow-soft)
· `.hover-card` (lift on hover) · `.text-gradient` · `.glass-effect` · `.animate-fade-in`
`.animate-slide-up` `.animate-scale-in` · `.safe-bottom` / `.safe-top` (iOS notch/pad).

## Page skeleton (dashboard pages)
```
<div className="space-y-6">
  <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="eyebrow">AREA</p>
      <h1 className="text-2xl font-bold sm:text-3xl">Judul halaman</h1>
      <p className="text-sm text-muted-foreground">Sub-judul singkat.</p>
    </div>
    {/* optional action button */}
  </header>
  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"> …stat cards… </section>
  <section className="surface p-5 sm:p-6"> …content… </section>
</div>
```

## Required fixes in every touched file
1. **Light-mode invisibility:** `text-slate-300` / `text-gray-300` / `text-white/60` used as
   muted body text on a LIGHT (or token) background → `text-muted-foreground`.
   Only keep near-white text when it sits on an explicitly DARK panel (`bg-foreground`,
   `bg-slate-800/900`, brand gradient panel).
2. Replace raw palette pairs → tokens:
   - `text-slate-800 dark:text-gray-100` / `text-slate-900` → `text-foreground`
   - `text-slate-600|500|400 dark:text-gray-400|500` → `text-muted-foreground`
   - `border-slate-200 dark:border-gray-700` / `border-gray-200` → `border-border`
   - `bg-gray-100 dark:bg-gray-800` → `bg-muted` ; `bg-slate-50 dark:bg-gray-900` → `bg-card`
   - `bg-white dark:bg-gray-900|950` → `bg-card`
3. Neon/dated gradients (`from-purple-500 to-pink-500`, `from-blue-600 to-purple-600`) on
   page headers/panels → brand treatment: `text-gradient` on the heading, and either
   `surface` or a subtle `bg-primary/5` panel. Keep it calm, not flashy.
4. Fill dead space: cards get `shadow-soft hover:shadow-lifted transition` when interactive.
5. Rounding: standardize cards `rounded-2xl`, controls `rounded-xl`.
6. Mobile: every grid/table must not overflow horizontally. Use `grid gap-4 sm:grid-cols-2`
   / `overflow-x-auto` on wide tables. Long lists use `divide-y divide-border`.
7. Buttons: use existing shadcn `<Button>` variants; primary actions `variant="default"`,
   secondary `variant="outline"`, destructive `variant="destructive"`. Do not restyle color
   inline unless needed for a status badge.
8. Status pills: `rounded-full border px-2.5 py-0.5 text-xs font-medium` + semantic tone
   (`text-success bg-success/10 border-success/20`, `text-warning …`, `text-destructive …`,
   `text-muted-foreground bg-muted border-border`).
9. Keep icons from `lucide-react`; sizes `h-4 w-4` inline, `h-5 w-5` in header/CTA.

## Helpers
`components/dashboard/ui.tsx` exposes: `PageHeader`, `StatCard`, `SectionCard`, `EmptyState`,
`TonePill`. Prefer them for new structure; do not remove them.

## Verification (per agent)
- `cd /tmp/edustory && npx tsc --noEmit 2>&1 | grep -E '<your paths>'` → must show **no new**
  errors for your files (repo has ~14 pre-existing errors elsewhere — ignore those).
- Do NOT run `next build` (shared `.next` — the coordinator builds at the end).
- Report: files changed, one-line summary each, anything you could not safely restyle.
