import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // 🔍 Log untuk debugging (opsional, bisa dihapus setelah berhasil)
  console.log('[Auth] Creating Supabase client...')
  console.log('[Auth] URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Ada' : '❌ TIDAK ADA')
  console.log('[Auth] ANON KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Ada' : '❌ TIDAK ADA')

  // 🚨 Validasi environment variable
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[Auth] ❌ Supabase environment variables are missing!')
    throw new Error('Supabase environment variables are not configured')
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

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

  const dbRole = role === 'student' ? 'siswa' : role
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
  const { data, error } = await supabase.auth.getUser()
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