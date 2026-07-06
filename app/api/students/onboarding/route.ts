import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('[API] 📥 Received POST /api/students/onboarding')

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    console.log('[API] Body:', body)

    const userId = body.user_id
    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Validasi user_id dengan admin API
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !user) {
      console.error('[API] Invalid user_id:', userError)
      return NextResponse.json({ error: 'Invalid user_id' }, { status: 400 })
    }

    // Siapkan payload untuk upsert
    const payload: Record<string, any> = {
      user_id: userId,
      name: body.name || null,
      phone: body.phone || null,
      gender: body.gender || null,
      bio: body.bio || null,
      school_name: body.school_name || null,
      school_type: body.school_type || null,
      school_city: body.school_city || null,
      school_address: body.school_address || null,
      parent_name: body.parent_name || null,
      parent_phone: body.parent_phone || null,
      parent_email: body.parent_email || null,
      parent_relation: body.parent_relation || null,
      status: 'active',
      onboarding_complete: false,
    }

    // Hapus null/undefined
    Object.keys(payload).forEach(key => {
      if (payload[key] === null || payload[key] === undefined) delete payload[key]
    })

    console.log('[API] Upsert payload:', payload)

    const { data, error } = await supabase
      .from('students')
      .upsert(payload, { onConflict: 'user_id' })
      .select()

    if (error) {
      console.error('[API] Upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[API] ✅ Success:', data)
    return NextResponse.json({ success: true, data: data?.[0] || null })
  } catch (err) {
    console.error('[API] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}