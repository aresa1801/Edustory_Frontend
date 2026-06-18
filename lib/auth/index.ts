// Barrel export for auth utilities
export { createClient } from '@/lib/supabase/client'
export { toAppRole, toDbRole, getDashboardPath, isAdminEmail } from './role-utils'
export type { AppRole } from './role-utils'
