import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Profile bootstrap / repair helper.
 *
 * Context: the current database was migrated from a legacy app where
 * `user_profiles.id` did not always equal the Supabase auth user id. When one of
 * those early accounts signs in again (Google OAuth), the app tries to insert a
 * profile with the *new* auth id but the *same* email, which blows up with:
 *
 *   duplicate key value violates unique constraint "user_profiles_email_key"
 *
 * `ensureUserProfile` fixes this at the source: if a legacy profile row already
 * holds that email, the row is rebound to the current auth id (child tables are
 * re-pointed first, then the PK is swapped) instead of inserting a duplicate.
 */

export type ProfileRole = 'siswa' | 'tutor' | 'admin'

export type EnsureProfileInput = {
  id: string
  email: string
  name?: string | null
  role?: ProfileRole
  avatarUrl?: string | null
  /** When false, a profile is only ensured if one (or a legacy email row) already exists. */
  createIfMissing?: boolean
}

/** (table, column) pairs that store a `user_profiles.id` and must follow a rebind. */
const USER_ID_REFS: ReadonlyArray<readonly [string, string]> = [
  ['students', 'user_id'],
  ['tutors', 'user_id'],
  ['credit_log', 'user_id'],
  ['wallets', 'student_id'],
  ['wallets', 'tutor_id'],
  ['wallet_transactions', 'student_id'],
  ['wallet_transactions', 'tutor_id'],
  ['bank_accounts', 'user_id'],
  ['withdrawals', 'user_id'],
  ['payment_deposits', 'student_id'],
  ['payment_deposits', 'tutor_id'],
  ['sessions', 'student_id'],
  ['sessions', 'tutor_id'],
  ['matches', 'student_id'],
  ['matches', 'tutor_id'],
  ['match_schedules', 'student_id'],
  ['match_schedules', 'tutor_id'],
  ['match_folders', 'created_by'],
  ['reviews', 'student_id'],
  ['reviews_backup_20260919', 'student_id'],
  ['tutor_applications', 'tutor_id'],
  ['tutor_applications', 'reviewed_by'],
  ['curation_progress', 'tutor_id'],
  ['curation_results', 'tutor_id'],
  ['curation_results', 'reviewed_by'],
  ['academic_assessments', 'tutor_id'],
  ['ai_interview_assessments', 'tutor_id'],
  ['psychology_assessments', 'tutor_id'],
  ['microteaching_assessments', 'tutor_id'],
  ['microteaching_assessments', 'reviewed_by'],
  ['handwriting_assessments', 'tutor_id'],
  ['handwriting_assessments', 'reviewed_by'],
  ['analytics_feedback', 'user_id'],
]

export type EnsureProfileResult = {
  profile: { id: string; email: string; role: ProfileRole; name?: string | null; avatar_url?: string | null } | null
  error: string | null
  /** true when a legacy row with the same email was rebound to this auth id */
  repaired?: boolean
}

const isEmailConflict = (error: unknown): boolean => {
  const e = error as { code?: string; message?: string; details?: string } | null
  if (!e) return false
  const text = `${e.message ?? ''} ${e.details ?? ''}`
  return e.code === '23505' && text.includes('user_profiles_email_key')
}

async function rebindLegacyProfile(
  admin: SupabaseClient,
  legacy: { id: string; email: string },
  input: EnsureProfileInput
): Promise<EnsureProfileResult> {
  const { data: legacyAuthUser } = await admin.auth.admin.getUserById(legacy.id)

  if (legacyAuthUser?.user) {
    // Two different auth users share the same email — cannot rebind safely.
    console.error('[profile] email owned by another auth user', {
      email: input.email,
      legacyId: legacy.id,
      authId: input.id,
    })
    return {
      profile: null,
      error:
        'Email ini sudah terhubung dengan akun lain. Hubungi admin untuk menggabungkan akun.',
    }
  }

  const parkedEmail = `legacy-${legacy.id}@migrated.invalid`
  const { error: parkError } = await admin
    .from('user_profiles')
    .update({ email: parkedEmail })
    .eq('id', legacy.id)

  if (parkError) {
    console.error('[profile] failed to park legacy email', parkError)
    return { profile: null, error: parkError.message }
  }

  const { data: created, error: insertError } = await admin
    .from('user_profiles')
    .insert({
      id: input.id,
      email: input.email,
      name: input.name || input.email,
      role: input.role || 'siswa',
      avatar_url: input.avatarUrl || null,
    })
    .select('id, email, role, name, avatar_url')
    .single()

  if (insertError || !created) {
    await admin.from('user_profiles').update({ email: legacy.email }).eq('id', legacy.id)
    console.error('[profile] legacy rebind insert failed', insertError)
    return { profile: null, error: insertError?.message || 'Gagal membuat profil' }
  }

  let movedAll = true
  for (const [table, column] of USER_ID_REFS) {
    const { error: moveError } = await admin
      .from(table)
      .update({ [column]: input.id })
      .eq(column, legacy.id)

    if (moveError) {
      // Missing table/column in this environment should not abort the rebind.
      const missing = ['42P01', '42703'].includes((moveError as { code?: string }).code || '')
      if (!missing) {
        movedAll = false
        console.error(`[profile] failed to move ${table}.${column}`, moveError)
      }
    }
  }

  if (!movedAll) {
    // Keep both rows (old one still referenced) but never block the login.
    console.error('[profile] partial rebind, legacy row kept', { legacyId: legacy.id })
    return { profile: created as EnsureProfileResult['profile'], error: null, repaired: true }
  }

  const { error: deleteError } = await admin.from('user_profiles').delete().eq('id', legacy.id)
  if (deleteError) {
    console.error('[profile] failed to delete legacy profile', deleteError)
  }

  return { profile: created as EnsureProfileResult['profile'], error: null, repaired: true }
}

/**
 * Guarantees a `user_profiles` row exists for the given auth user id.
 * Safe to call on every login — it is a no-op when the profile already exists.
 */
export async function ensureUserProfile(
  admin: SupabaseClient,
  input: EnsureProfileInput
): Promise<EnsureProfileResult> {
  const email = (input.email || '').trim()
  if (!input.id || !email) {
    return { profile: null, error: 'id dan email wajib diisi' }
  }

  const { data: existing, error: readError } = await admin
    .from('user_profiles')
    .select('id, email, role, name, avatar_url')
    .eq('id', input.id)
    .maybeSingle()

  if (readError) {
    console.error('[profile] read by id failed', readError)
    return { profile: null, error: readError.message }
  }

  if (existing) {
    const patch: Record<string, string> = {}
    if (input.name && !existing.name) patch.name = input.name
    if (input.avatarUrl && !existing.avatar_url) patch.avatar_url = input.avatarUrl
    if (Object.keys(patch).length > 0) {
      const { data: updated } = await admin
        .from('user_profiles')
        .update(patch)
        .eq('id', input.id)
        .select('id, email, role, name, avatar_url')
        .single()
      return { profile: (updated ?? existing) as EnsureProfileResult['profile'], error: null }
    }
    return { profile: existing as EnsureProfileResult['profile'], error: null }
  }

  // Profile missing — look for a legacy row that already owns this email.
  const { data: legacyRows, error: legacyError } = await admin
    .from('user_profiles')
    .select('id, email')
    .ilike('email', email)
    .neq('id', input.id)
    .limit(1)

  if (legacyError) {
    console.error('[profile] legacy email lookup failed', legacyError)
  }

  const legacy = legacyRows?.[0]
  if (legacy) {
    return rebindLegacyProfile(admin, legacy, input)
  }

  if (input.createIfMissing === false) {
    return { profile: null, error: null }
  }

  const { data: created, error: insertError } = await admin
    .from('user_profiles')
    .insert({
      id: input.id,
      email,
      name: input.name || email,
      role: input.role || 'siswa',
      avatar_url: input.avatarUrl || null,
    })
    .select('id, email, role, name, avatar_url')
    .single()

  if (insertError) {
    if (isEmailConflict(insertError)) {
      const { data: retryRows } = await admin
        .from('user_profiles')
        .select('id, email')
        .ilike('email', email)
        .limit(1)
      if (retryRows?.[0]) return rebindLegacyProfile(admin, retryRows[0], input)
    }
    console.error('[profile] insert failed', insertError)
    return { profile: null, error: insertError.message }
  }

  return { profile: created as EnsureProfileResult['profile'], error: null }
}
