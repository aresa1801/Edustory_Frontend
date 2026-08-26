import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // ============================================================
  // 🚧 CEK MAINTENANCE MODE (DI PALING AWAL, SEBELUM APAPUN)
  // ============================================================
  const isMaintenance = process.env.MAINTENANCE_MODE === 'true'
  const { pathname } = request.nextUrl

  // Kalau maintenance aktif dan user belum di halaman maintenance,
  // langsung redirect ke /maintenance (tanpa auth, tanpa apapun)
  if (isMaintenance && !pathname.startsWith('/maintenance')) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  // ============================================================
  // LANJUTKAN LOGIKA AUTH YANG SUDAH ADA (TIDAK BERUBAH)
  // ============================================================

  // Buat response awal untuk menampung cookie jika diperlukan
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Inisialisasi Supabase client dengan cookie management yang benar
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
  // 1. PROTEKSI ROUTE DASHBOARD
  // ============================================================
  if (pathname.startsWith('/dashboard')) {
    // Jika user tidak login, redirect ke login
    if (!user || error) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // User login, cek apakah punya role di database
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    // Admin diizinkan tanpa role (karena admin tidak perlu pilih role di select-role)
    if (user.email === 'admin@edustory.com') {
      // Admin bisa lanjut ke dashboard admin
      return response
    }

    // Jika user tidak punya role, arahkan ke select-role
    if (!profile?.role) {
      console.log('[Middleware] User belum pilih role, redirect ke select-role')
      const selectRoleUrl = new URL('/auth/select-role', request.url)
      return NextResponse.redirect(selectRoleUrl)
    }

    // User punya role, lanjutkan ke dashboard
    return response
  }

  // ============================================================
  // 2. ROUTE LAINNYA (termasuk /auth/select-role) DIBIARKAN BEBAS
  // ============================================================
  return response
}

// Konfigurasi matcher: middleware hanya berjalan pada route yang dibutuhkan
export const config = {
  matcher: [
    // Dashboard
    '/dashboard/:path*',
    // Anda bisa tambahkan route lain yang perlu proteksi di sini
    // Contoh: '/profile/:path*', '/settings/:path*'
    // TIDAK termasuk /auth/select-role, /auth/login, /auth/callback
  ],
}