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

// GET: ambil semua config
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cek apakah admin
    const supabase = getSupabase()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('payment_config')
      .select('config_key, config_value')
      .order('config_key')

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('GET payment-config error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT: update config (hanya admin)
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabase()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { updates } = await request.json()
    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Lakukan upsert
    for (const item of updates) {
      const { config_key, config_value } = item
      if (!config_key) continue
      await supabase
        .from('payment_config')
        .upsert({ config_key, config_value }, { onConflict: 'config_key' })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('PUT payment-config error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}