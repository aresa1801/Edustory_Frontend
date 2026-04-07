import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  
  // Tangkap hash fragment dari URL
  const hash = url.hash
  if (hash && hash.includes('access_token')) {
    // Redirect ke /auth/callback dengan parameter dari hash
    const params = new URLSearchParams()
    hash.substring(1).split('&').forEach(pair => {
      const [key, value] = pair.split('=')
      if (key && value) {
        params.append(key, value)
      }
    })
    
    const callbackUrl = new URL('/auth/callback', request.url)
    callbackUrl.hash = ''
    callbackUrl.search = params.toString()
    
    return NextResponse.redirect(callbackUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/(.*)',
}