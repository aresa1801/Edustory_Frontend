import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAdminUser(request: NextRequest) {
  const supabase = getSupabase()
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' ? user : null
}

/**
 * GET /api/admin/payment-config
 * Returns all payment_config rows (admin only)
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const admin = await getAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('payment_config')
      .select('config_key, config_value, description, is_secret, updated_at')
      .order('config_key')

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching payment config:', error)
    return NextResponse.json({ error: 'Gagal memuat konfigurasi' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/payment-config
 * Body: { updates: { config_key: string, config_value: string }[] }
 * Upserts config values (admin only)
 */
export async function PUT(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const admin = await getAdminUser(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { updates } = await request.json()
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array is required' }, { status: 400 })
    }

    // Validate each update
    for (const u of updates) {
      if (!u.config_key || typeof u.config_key !== 'string') {
        return NextResponse.json({ error: 'Each update must have a config_key' }, { status: 400 })
      }
    }

    const rows = updates.map((u: { config_key: string; config_value: string }) => ({
      config_key: u.config_key,
      config_value: u.config_value ?? '',
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    }))

    const { data, error } = await supabase
      .from('payment_config')
      .upsert(rows, { onConflict: 'config_key' })
      .select('config_key, config_value, updated_at')

    if (error) throw error
    return NextResponse.json({ updated: data })
  } catch (error) {
    console.error('Error updating payment config:', error)
    return NextResponse.json({ error: 'Gagal menyimpan konfigurasi' }, { status: 500 })
  }
}
