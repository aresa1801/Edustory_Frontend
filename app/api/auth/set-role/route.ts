import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('[API] 📥 Received POST request to /api/auth/set-role')

  try {
    // Get the access token from the Authorization header
    const authHeader = request.headers.get('Authorization')
    console.log('[API] 🔑 Auth header:', authHeader ? '✅ Present' : '❌ Missing')

    const accessToken = authHeader?.replace('Bearer ', '')

    if (!accessToken) {
      console.error('[API] ❌ Missing authorization token')
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }

    const { role } = await request.json()
    console.log('[API] 📝 Role received:', role)

    if (role !== 'student' && role !== 'tutor') {
      console.error('[API] ❌ Invalid role:', role)
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const dbRole = role === 'student' ? 'siswa' : role
    console.log('[API] 📝 Mapping role to dbRole:', dbRole)

    // Use service role key to bypass RLS
    console.log('[API] 🔧 Initializing Supabase admin client...')
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify the token and get the user
    console.log('[API] 🔍 Verifying token...')
    const { data: { user }, error: userError } = await adminSupabase.auth.getUser(accessToken)

    if (userError || !user) {
      console.error('[API] ❌ Token verification failed:', userError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[API] ✅ User verified:', user.email, 'ID:', user.id)

    const now = new Date().toISOString()

    // Try full upsert
    console.log('[API] 💾 Upserting to user_profiles...')
    const { error: upsertError } = await adminSupabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        role: dbRole,
        avatar_url: user.user_metadata?.avatar_url || null,
        updated_at: now,
      }, { onConflict: 'id' })

    if (upsertError) {
      console.error('[API] ❌ Upsert failed:', upsertError)
      console.log('[API] 🔄 Attempting minimal upsert...')

      if (!user.email) {
        console.error('[API] ❌ User email is missing')
        return NextResponse.json({ error: 'User email is required' }, { status: 400 })
      }

      const { error: minimalUpsertError } = await adminSupabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          role: dbRole,
          updated_at: now,
        }, { onConflict: 'id' })

      if (minimalUpsertError) {
        console.error('[API] ❌ Minimal upsert also failed:', minimalUpsertError)
        return NextResponse.json({ error: minimalUpsertError.message }, { status: 500 })
      }
      console.log('[API] ✅ Minimal upsert succeeded')
    } else {
      console.log('[API] ✅ Full upsert succeeded')
    }

    console.log('[API] 🎉 Role saved successfully')
    return NextResponse.json({ success: true, role })
  } catch (error) {
    console.error('[API] ❌ Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}