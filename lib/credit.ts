import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// TYPES
// ============================================================

export type Role = 'tutor' | 'student'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export type CreditReason =
  | 'daily_login'
  | 'both_ready'
  | 'session_expired'
  | 'unilateral_terminate'
  | 'admin_adjustment'

export type TierId =
  | 'aman' | 'pembatasan' | 'waspada'
  | 'hati_hati' | 'bahaya' | 'blacklist'

export interface CreditTier {
  id: TierId
  label: string
  min: number
  max: number
  features: {
    maxActiveStudents: number | null
    catalogCooldownSeconds: number
    profileEditLockDays: number
    maxSessionRate: number | null
    catalogFrozen: boolean
    adminFeePercent: number
    withdrawalDelayDays: number
    canAcceptNewStudent: boolean
    accountHeld: boolean
    banned: boolean
  }
}

export interface CreditProfile {
  profileId: string   // tutors.id / students.id
  userId: string      // user_profiles.id (auth.users.id)
  creditScore: number
  suspendedUntil: string | null
  lastLoginRewardAt: string | null
}

// ============================================================
// CONSTANTS
// ============================================================

export const CREDIT_MIN = 0
export const CREDIT_MAX = 100
export const CREDIT_INITIAL = 99
export const SUSPEND_DAYS_UNILATERAL = 3

export const DELTA = {
  daily_login: 1,
  both_ready: 2,
  session_expired: -7,
  unilateral_terminate: -40,
} as const

export const TIERS: CreditTier[] = [
  {
    id: 'aman', label: 'Aman', min: 81, max: 100,
    features: {
      maxActiveStudents: null, catalogCooldownSeconds: 0,
      profileEditLockDays: 0, maxSessionRate: null,
      catalogFrozen: false, adminFeePercent: 10,
      withdrawalDelayDays: 0, canAcceptNewStudent: true,
      accountHeld: false, banned: false,
    },
  },
  {
    id: 'pembatasan', label: 'Pembatasan', min: 66, max: 80,
    features: {
      maxActiveStudents: 3, catalogCooldownSeconds: 10,   // ← 5 → 3
      profileEditLockDays: 0, maxSessionRate: null,
      catalogFrozen: false, adminFeePercent: 10,
      withdrawalDelayDays: 0, canAcceptNewStudent: true,
      accountHeld: false, banned: false,
    },
  },
  {
    id: 'waspada', label: 'Waspada', min: 51, max: 65,
    features: {
      maxActiveStudents: 3, catalogCooldownSeconds: 10,   // ← 5 → 3
      profileEditLockDays: 2, maxSessionRate: 150_000,
      catalogFrozen: false, adminFeePercent: 10,
      withdrawalDelayDays: 0, canAcceptNewStudent: true,
      accountHeld: false, banned: false,
    },
  },
  {
    id: 'hati_hati', label: 'Hati-hati', min: 26, max: 50,
    features: {
      maxActiveStudents: 3, catalogCooldownSeconds: 10,   // ← 5 → 3
      profileEditLockDays: 2, maxSessionRate: 150_000,
      catalogFrozen: true, adminFeePercent: 20,
      withdrawalDelayDays: 3, canAcceptNewStudent: true,
      accountHeld: false, banned: false,
    },
  },
  {
    id: 'bahaya', label: 'Bahaya', min: 6, max: 25,
    features: {
      maxActiveStudents: 0, catalogCooldownSeconds: 10,
      profileEditLockDays: 2, maxSessionRate: 150_000,
      catalogFrozen: true, adminFeePercent: 20,
      withdrawalDelayDays: 3, canAcceptNewStudent: false,
      accountHeld: true, banned: false,
    },
  },
  {
    id: 'blacklist', label: 'Blacklist', min: 0, max: 5,
    features: {
      maxActiveStudents: 0, catalogCooldownSeconds: 10,
      profileEditLockDays: 2, maxSessionRate: 150_000,
      catalogFrozen: true, adminFeePercent: 20,
      withdrawalDelayDays: 3, canAcceptNewStudent: false,
      accountHeld: true, banned: true,
    },
  },
]

// ============================================================
// INTERNAL
// ============================================================

function admin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  )
}

const tableOf = (role: Role) => (role === 'tutor' ? 'tutors' : 'students')

// ============================================================
// TIER
// ============================================================

export function getCreditTier(score: number): CreditTier {
  const s = Math.max(CREDIT_MIN, Math.min(CREDIT_MAX, Math.floor(score || 0)))
  return TIERS.find((t) => s >= t.min && s <= t.max) ?? TIERS[TIERS.length - 1]
}

// ============================================================
// LOOKUP
// ============================================================

export async function getProfileByUserId(
  userId: string,
  role: Role
): Promise<CreditProfile | null> {
  const supabase = admin()
  const { data } = await supabase
    .from(tableOf(role))
    .select('id, user_id, credit_score, suspended_until, last_login_reward_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return null
  return {
    profileId: data.id,
    userId: data.user_id,
    creditScore: data.credit_score ?? CREDIT_INITIAL,
    suspendedUntil: data.suspended_until,
    lastLoginRewardAt: data.last_login_reward_at,
  }
}

export async function getProfileById(
  profileId: string,
  role: Role
): Promise<CreditProfile | null> {
  const supabase = admin()
  const { data } = await supabase
    .from(tableOf(role))
    .select('id, user_id, credit_score, suspended_until, last_login_reward_at')
    .eq('id', profileId)
    .maybeSingle()

  if (!data) return null
  return {
    profileId: data.id,
    userId: data.user_id,
    creditScore: data.credit_score ?? CREDIT_INITIAL,
    suspendedUntil: data.suspended_until,
    lastLoginRewardAt: data.last_login_reward_at,
  }
}

// ============================================================
// ADJUST CREDIT
// ============================================================

export async function adjustCredit(params: {
  profileId: string
  role: Role
  delta: number
  reason: CreditReason
  refId?: string | null
}): Promise<{ ok: boolean; newScore?: number; tier?: CreditTier; error?: string }> {
  const { profileId, role, delta, reason, refId = null } = params

  if (!profileId) return { ok: false, error: 'profileId kosong' }
  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false, error: 'delta tidak valid' }
  }

  const supabase = admin()
  const table = tableOf(role)

  const { data: row, error: readErr } = await supabase
    .from(table)
    .select('id, user_id, credit_score')
    .eq('id', profileId)
    .maybeSingle()

  if (readErr || !row) {
    return { ok: false, error: readErr?.message || `${role} tidak ditemukan` }
  }

  const current = Number(row.credit_score ?? CREDIT_INITIAL)
  const raw = current + delta
  const newScore = Math.max(CREDIT_MIN, Math.min(CREDIT_MAX, raw))
  const actualDelta = newScore - current

  const { error: updErr } = await supabase
    .from(table)
    .update({ credit_score: newScore })
    .eq('id', row.id)

  if (updErr) return { ok: false, error: updErr.message }

  // Log non-critical — kalau gagal, credit tetap ter-update
  const { error: logErr } = await supabase.from('credit_log').insert({
    user_id: row.user_id,
    role,
    delta: actualDelta,
    balance_after: newScore,
    reason,
    ref_id: refId,
  })
  if (logErr) console.error('[credit] log insert error:', logErr)

  return { ok: true, newScore, tier: getCreditTier(newScore) }
}

// ============================================================
// SUSPEND
// ============================================================

export async function suspendUser(params: {
  profileId: string
  role: Role
  days: number
}): Promise<{ ok: boolean; suspendedUntil?: string; error?: string }> {
  const { profileId, role, days } = params
  if (!profileId || days <= 0) return { ok: false, error: 'Parameter tidak valid' }

  const supabase = admin()
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from(tableOf(role))
    .update({ suspended_until: until })
    .eq('id', profileId)

  if (error) return { ok: false, error: error.message }
  return { ok: true, suspendedUntil: until }
}

export async function isSuspended(userId: string, role: Role): Promise<boolean> {
  const p = await getProfileByUserId(userId, role)
  if (!p || !p.suspendedUntil) return false
  return new Date(p.suspendedUntil).getTime() > Date.now()
}

// ============================================================
// CAN MATCH
// ============================================================

export async function canMatch(
  userId: string,
  role: Role
): Promise<{ allowed: boolean; reason?: string; tier?: CreditTier; score?: number }> {
  const p = await getProfileByUserId(userId, role)
  if (!p) return { allowed: false, reason: `${role} tidak ditemukan` }

  if (p.suspendedUntil && new Date(p.suspendedUntil).getTime() > Date.now()) {
    return {
      allowed: false,
      reason: `Akun disuspend hingga ${new Date(p.suspendedUntil).toLocaleString('id-ID')}`,
      tier: getCreditTier(p.creditScore),
      score: p.creditScore,
    }
  }

  const tier = getCreditTier(p.creditScore)
  if (!tier.features.canAcceptNewStudent) {
    return {
      allowed: false,
      reason: `Credit score terlalu rendah (${p.creditScore}). Tier: ${tier.label}`,
      tier,
      score: p.creditScore,
    }
  }

  return { allowed: true, tier, score: p.creditScore }
}

// ============================================================
// DAILY LOGIN
// ============================================================

export async function claimDailyLogin(params: {
  profileId: string
  role: Role
}): Promise<{ ok: boolean; claimed: boolean; newScore?: number; error?: string }> {
  const { profileId, role } = params

  const p = await getProfileById(profileId, role)
  if (!p) return { ok: false, claimed: false, error: `${role} tidak ditemukan` }

  // Bandingkan tanggal di zona WIB (UTC+7)
  const toWibDate = (d: Date) => {
    const w = new Date(d.getTime() + 7 * 60 * 60 * 1000)
    return `${w.getUTCFullYear()}-${w.getUTCMonth()}-${w.getUTCDate()}`
  }

  const todayWib = toWibDate(new Date())
  const lastWib = p.lastLoginRewardAt ? toWibDate(new Date(p.lastLoginRewardAt)) : null

  if (lastWib === todayWib) {
    return { ok: true, claimed: false, newScore: p.creditScore }
  }

  const result = await adjustCredit({
    profileId,
    role,
    delta: DELTA.daily_login,
    reason: 'daily_login',
  })
  if (!result.ok) return { ok: false, claimed: false, error: result.error }

  const supabase = admin()
  const { error: tsErr } = await supabase
    .from(tableOf(role))
    .update({ last_login_reward_at: new Date().toISOString() })
    .eq('id', profileId)
  if (tsErr) console.error('[credit] update last_login_reward_at:', tsErr)

  return { ok: true, claimed: true, newScore: result.newScore }
}