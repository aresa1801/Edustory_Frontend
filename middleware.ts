import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// DAFTAR EMAIL YANG DIIZINKAN BYPASS MAINTENANCE
const ALLOWED_EMAILS = [
  'gabriel.arelius@gmail.com',
  'program.struck30@gmail.com',
  'admin@edustory.com' // <-- tambahkan juga admin utama jika perlu
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ============================================================
  // 1. SIAPKAN SUPABASE CLIENT UNTUK AMBIL USER
  // ============================================================
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options })
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Ambil user dari session
  const { data: { user }, error } = await supabase.auth.getUser()

  // ============================================================
  // 2. CEK MAINTENANCE DENGAN PENGECUALIAN EMAIL
  // ============================================================
  const isMaintenance = process.env.MAINTENANCE_MODE === 'true'

  // Jika maintenance aktif DAN user belum di halaman maintenance
  if (isMaintenance && !pathname.startsWith('/maintenance')) {
    // Cek apakah user login dan emailnya ada di whitelist
    const isAllowed = user && !error && ALLOWED_EMAILS.includes(user.email ?? '')

    // Jika bukan allowed user, redirect ke maintenance
    if (!isAllowed) {
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
    // Jika allowed, biarkan lanjut (tidak di-redirect)
  }

  // ============================================================
  // 3. PROTEKSI ROUTE DASHBOARD (SESUAI KODE LAMA)
  // ============================================================
  if (pathname.startsWith('/dashboard')) {
    if (!user || error) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (user.email === 'admin@edustory.com') {
      return response
    }

    if (!profile?.role) {
      const selectRoleUrl = new URL('/auth/select-role', request.url)
      return NextResponse.redirect(selectRoleUrl)
    }

    return response
  }

  // ============================================================
  // 4. ROUTE LAINNYA DIBIARKAN BEBAS
  // ============================================================
  return response
}

// Konfigurasi matcher: middleware berjalan di SEMUA halaman (kecuali asset statis & API)
// Ini penting agar maintenance berlaku global, tapi tetap tidak ganggu asset statis
export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
}