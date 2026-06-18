import { ADMIN_EMAIL } from '@/lib/constants'

/**
 * Supported application roles.
 */
export type AppRole = 'student' | 'tutor' | 'admin' | null

/**
 * Maps database role values (e.g. 'siswa') to the canonical AppRole used
 * throughout the frontend.
 */
const DB_ROLE_TO_APP_ROLE: Record<string, AppRole> = {
  siswa: 'student',
  student: 'student',
  tutor: 'tutor',
  admin: 'admin',
}

/**
 * Maps a frontend role to the value stored in the database.
 */
const APP_ROLE_TO_DB_ROLE: Record<string, string> = {
  student: 'siswa',
  tutor: 'tutor',
  admin: 'admin',
}

/**
 * Maps an AppRole to its corresponding dashboard route path.
 */
const ROLE_TO_DASHBOARD_PATH: Record<string, string> = {
  student: '/dashboard/student',
  tutor: '/dashboard/tutor',
  admin: '/dashboard/admin',
}

/**
 * Converts a database role string to the canonical AppRole.
 */
export function toAppRole(dbRole: string | null | undefined): AppRole {
  if (!dbRole) return null
  return DB_ROLE_TO_APP_ROLE[dbRole] ?? null
}

/**
 * Converts a frontend AppRole to the database role value.
 */
export function toDbRole(appRole: 'student' | 'tutor' | 'admin'): string {
  return APP_ROLE_TO_DB_ROLE[appRole]
}

/**
 * Returns the dashboard path for a given AppRole, or null if the role is
 * unknown/null.
 */
export function getDashboardPath(role: AppRole): string | null {
  if (!role) return null
  return ROLE_TO_DASHBOARD_PATH[role] ?? null
}

/**
 * Checks whether an email address belongs to the admin account.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL
}
