import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('[API] 📥 Received POST /api/students/onboarding')

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Validasi token
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing auth header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('[API] Auth error:', authError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 2. Parse body
    const body = await request.json()
    console.log('[API] Body:', body)

    // 3. Validasi minimal
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // 4. Payload
    const payload: Record<string, any> = {
      user_id: user.id,
      name: body.name.trim(),
      parent_name: body.parent_name?.trim() || null,
      status: 'active',
      onboarding_complete: false,
    }

    // Tambahkan field opsional jika ada
    if (body.phone) payload.phone = body.phone.trim()
    if (body.gender) payload.gender = body.gender
    if (body.bio) payload.bio = body.bio.trim()
    if (body.school_name) payload.school_name = body.school_name.trim()
    if (body.school_type) payload.school_type = body.school_type
    if (body.school_city) payload.school_city = body.school_city.trim()
    if (body.school_address) payload.school_address = body.school_address.trim()
    if (body.parent_phone) payload.parent_phone = body.parent_phone.trim()
    if (body.parent_email) payload.parent_email = body.parent_email.trim()
    if (body.parent_relation) payload.parent_relation = body.parent_relation

    // Hapus null/undefined
    Object.keys(payload).forEach(key => {
      if (payload[key] === null || payload[key] === undefined) delete payload[key]
    })

    console.log('[API] Upsert payload:', payload)

    // 5. Upsert ke students
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