import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { toDbRole } from '@/lib/auth/role-utils'

// Re-export the canonical browser client so existing imports from '@/lib/auth'
// continue to work without changes.
export const createClient = createSupabaseClient

export async function registerUser(
  email: string,
  password: string,
  fullName: string,
  role: 'student' | 'tutor' | 'admin'
) {
  const supabase = createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  })

  if (authError) {
    throw new Error(authError.message)
  }

  if (!authData.user) {
    throw new Error('Failed to create user')
  }

  const dbRole = toDbRole(role)
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert([
      {
        id: authData.user.id,
        email,
        name: fullName,
        role: dbRole,
      },
    ])

  if (profileError) {
    throw new Error(profileError.message)
  }

  return authData.user
}

export async function loginUser(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function logoutUser() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()
  return data?.user
}

export async function getUserProfile(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
