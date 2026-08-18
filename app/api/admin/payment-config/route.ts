import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthUser(request: NextRequest) {
  const supabase = getSupabase()
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// ===== GET =====
export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cek admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('payment_config')
      .select('config_key, config_value')

    if (error) {
      console.error('[Payment Config] Query error:', error)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[Payment Config] GET unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ===== PUT =====
export async function PUT(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cek admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { updates } = body

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'updates must be an array' }, { status: 400 })
    }

    const results = []
    for (const update of updates) {
      const { data, error } = await supabase
        .from('payment_config')
        .upsert({
          config_key: update.config_key,
          config_value: update.config_value,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'config_key' })
        .select()
        .single()

      if (error) {
        results.push({ error: error.message })
      } else {
        results.push(data)
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('[Payment Config] PUT unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}