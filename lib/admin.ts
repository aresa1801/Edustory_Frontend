// lib/admin.ts
//
// Single source of truth untuk identitas admin / maintainer.
// Sebelumnya daftar ini tersebar & tidak konsisten:
//   - lib/constants.ts         → 'storyaunty.evi@gmail.com'
//   - middleware.ts            → hanya 'admin@edustory.com'
//   - app/api/**               → 'admin@edustory.com'
// Akibatnya admin asli bisa ditolak dan sebaliknya. Modul ini menyatukan semuanya.
//
// ADMIN_EMAILS            → benar-benar admin (akses panel admin + aksi admin)
// MAINTENANCE_BYPASS_EMAILS → boleh lewat saat mode maintenance
//                             (admin + maintainer/developer)

const BASE_ADMIN_EMAILS = [
  'storyaunty.evi@gmail.com', // admin utama (lib/constants)
  'admin@edustory.com',       // admin legacy / fallback
]

const MAINTAINER_EMAILS = [
  'gabriel.arelius@gmail.com',
  'program.struck30@gmail.com',
]

function normalize(list: (string | undefined | null)[]): string[] {
  return Array.from(
    new Set(list.filter(Boolean).map((e) => String(e).trim().toLowerCase()))
  )
}

export const ADMIN_EMAILS = normalize([
  process.env.ADMIN_EMAIL,
  process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  ...BASE_ADMIN_EMAILS,
])

export const MAINTENANCE_BYPASS_EMAILS = normalize([
  ...ADMIN_EMAILS,
  ...MAINTAINER_EMAILS,
])

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase())
}

export function isMaintenanceBypassEmail(email?: string | null): boolean {
  return !!email && MAINTENANCE_BYPASS_EMAILS.includes(email.trim().toLowerCase())
}
