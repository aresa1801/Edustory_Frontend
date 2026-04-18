import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get the access token from the Authorization header
    const authHeader = request.headers.get('Authorization')
    const accessToken = authHeader?.replace('Bearer ', '')

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }

    const { role } = await request.json()

    if (role !== 'student' && role !== 'tutor') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Map frontend role values to the values accepted by the user_profiles_role_check constraint
    const dbRole = role === 'student' ? 'siswa' : role

    // Use service role key to bypass RLS
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify the token and get the user
    const { data: { user }, error: userError } = await adminSupabase.auth.getUser(accessToken)

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()

    // Try full upsert first
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
      // Log the original error before falling back to aid debugging
      console.error('[set-role] Full upsert failed, trying minimal upsert:', upsertError)

      if (!user.email) {
        return NextResponse.json({ error: 'User email is required' }, { status: 400 })
      }

      // Fall back to minimal upsert (in case some columns don't exist in the schema)
      const { error: minimalUpsertError } = await adminSupabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          role: dbRole,
          updated_at: now,
        }, { onConflict: 'id' })

      if (minimalUpsertError) {
        return NextResponse.json({ error: minimalUpsertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, role })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
