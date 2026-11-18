import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { ADMIN_EMAIL } from '@/lib/constants'
import { ensureUserProfile } from '@/lib/user-profile'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROLE_TO_DASHBOARD: Record<string, string> = {
  siswa: 'student',
  student: 'student',
  tutor: 'tutor',
  admin: 'admin',
}

function safeNext(raw: string | null): string | null {
  if (!raw) return null
  // only same-origin absolute paths
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  if (raw.startsWith('/auth/')) return null
  return raw
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = url.origin
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const otpType = url.searchParams.get('type')
  const providerError =
    url.searchParams.get('error_description') || url.searchParams.get('error')
  const next = safeNext(url.searchParams.get('next'))

  // Map low-level Supabase errors to friendly Indonesian copy
  const friendly = (message: string) => {
    const m = message.toLowerCase()
    if (m.includes('code verifier') || m.includes('pkce'))
      return 'Sesi login sudah kedaluwarsa. Silakan coba masuk lagi.'
    if (m.includes('invalid') && m.includes('code'))
      return 'Kode login tidak valid atau sudah dipakai. Silakan coba lagi.'
    if (m.includes('expired'))
      return 'Sesi login kedaluwarsa. Silakan masuk kembali.'
    if (m.includes('access_denied'))
      return 'Akses dibatalkan. Silakan pilih akun Google untuk melanjutkan.'
    return message
  }

  const fail = (message: string) =>
    NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(friendly(message))}`, origin)
    )

  if (providerError) {
    return fail(providerError)
  }

  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch {
              // ignore — response still carries other cookies
            }
          })
        },
      },
    }
  )

  // 1) PKCE code exchange (OAuth default) or email OTP verification
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return fail(error.message)
  } else if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as 'signup' | 'email' | 'recovery' | 'invite' | 'email_change',
    })
    if (error) return fail(error.message)
  } else {
    // No code (e.g. user opened callback directly) — send to login
    const { data } = await supabase.auth.getUser()
    if (!data.user) return fail('Sesi tidak ditemukan. Silakan masuk kembali.')
  }

  // 2) Resolve user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return fail('Gagal memverifikasi sesi. Silakan coba lagi.')
  }

  if (next) {
    return NextResponse.redirect(new URL(next, origin))
  }

  // 3) Admin shortcut
  if (user.email && user.email === ADMIN_EMAIL) {
    return NextResponse.redirect(new URL('/dashboard/admin', origin))
  }

  // 4) Role → dashboard
  // Pastikan profil ada. Untuk akun Google lama hasil migrasi, profil lama yang
  // memakai email sama akan di-rebind ke auth id saat ini (lihat lib/user-profile).
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const googleName =
    (meta.full_name as string) || (meta.name as string) || user.email || null
  const googleAvatar =
    (meta.avatar_url as string) || (meta.picture as string) || null

  let profile: { role?: string | null; avatar_url?: string | null } | null = null
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { profile: ensured, error: ensureError } = await ensureUserProfile(admin, {
      id: user.id,
      email: user.email || '',
      name: googleName,
      avatarUrl: googleAvatar,
      // role tidak dipaksa di sini — dipilih user di /auth/select-role
      role: user.email && user.email === ADMIN_EMAIL ? 'admin' : undefined,
      createIfMissing: false,
    })
    if (ensureError) {
      console.error('[auth/callback] ensureUserProfile failed:', ensureError)
    }
    profile = ensured
  }

  if (!profile) {
    const { data } = await supabase
      .from('user_profiles')
      .select('role, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
    profile = data
  }

  const role = profile?.role ? String(profile.role).toLowerCase() : null
  const dashboard = role ? ROLE_TO_DASHBOARD[role] : null

  if (!dashboard) {
    return NextResponse.redirect(new URL('/auth/select-role', origin))
  }

  return NextResponse.redirect(new URL(`/dashboard/${dashboard}`, origin))
}
