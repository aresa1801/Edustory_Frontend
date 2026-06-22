import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const { data: { user }, error } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // ✅ VALIDASI SEMUA ROUTE (tidak hanya dashboard)
  if (user) {
    // User ada di auth, cek apakah masih ada di database
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    // Jika user tidak ada di database, clear session
    if (!profile?.role && user.email !== 'admin@edustory.com') {
      console.log('[Middleware] User tidak ada di database, clearing session')
      
      // Clear cookies
      response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      })
      
      const cookies = request.cookies.getAll()
      cookies.forEach(cookie => {
        if (cookie.name.startsWith('sb-') || cookie.name.includes('auth')) {
          response.cookies.set({
            name: cookie.name,
            value: '',
            maxAge: 0,
          })
        }
      })
      
      return response
    }
  }

  // Proteksi route dashboard
  if (pathname.startsWith('/dashboard')) {
    if (!user || error) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}