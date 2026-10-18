import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export type AuthedUser = { id: string; email?: string | null }

async function userFromBearer(token: string): Promise<AuthedUser | null> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email }
}

async function userFromCookies(): Promise<AuthedUser | null> {
  const store = await cookies()
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: () => {
          /* read-only in route handlers */
        },
      },
    },
  )
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email }
}

export async function getRequestUser(request: Request): Promise<AuthedUser | null> {
  const header = request.headers.get('authorization')
  if (header?.startsWith('Bearer ')) {
    return userFromBearer(header.slice(7))
  }
  return userFromCookies()
}

/** Returns the authenticated user, or a 401/403 response when the claim doesn't match. */
export async function requireUser(
  request: Request,
  claimedUserId?: string | null,
): Promise<{ user: AuthedUser | null; response: NextResponse | null }> {
  const user = await getRequestUser(request)
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (claimedUserId && claimedUserId !== user.id) {
    return { user, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, response: null }
}
