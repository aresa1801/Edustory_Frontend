import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  console.log('🚀 CALLBACK DIPANGGIL!')
  
  const url = new URL(request.url)
  const access_token = url.searchParams.get('access_token')
  const refresh_token = url.searchParams.get('refresh_token')
  
  console.log('Access token:', access_token ? 'ADA' : 'TIDAK ADA')
  
  if (access_token && refresh_token) {
    // Set session manually
    const supabase = await createClient()
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    })
    
    if (!error) {
      console.log('✅ Session berhasil diset!')
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    console.error('❌ Error set session:', error)
  }
  
  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
}