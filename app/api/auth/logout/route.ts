import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
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
            // Hapus cookie dengan set value kosong dan expired
            request.cookies.set({ name, value, ...options })
          })
        },
      },
    }
  )

  // Logout di server
  await supabase.auth.signOut({ scope: 'global' })

  // Buat response redirect ke home
  const response = NextResponse.redirect(new URL('/', request.url))

  // Hapus semua cookie yang terkait dengan Supabase di response
  const cookies = request.cookies.getAll()
  cookies.forEach(cookie => {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase') || cookie.name.includes('auth')) {
      response.cookies.set({
        name: cookie.name,
        value: '',
        maxAge: 0,
        path: '/',
      })
    }
  })

  return response
}