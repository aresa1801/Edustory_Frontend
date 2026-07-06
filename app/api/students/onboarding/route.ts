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

    // Validasi user_id
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !user) {
      console.error('[API] Invalid user_id:', userError)
      return NextResponse.json({ error: 'Invalid user_id' }, { status: 400 })
    }

    // --- Buat payload hanya dengan user_id ---
    const payload: Record<string, any> = {
      user_id: userId,
    }

    // Step 1 – Profil Siswa (hanya tambahkan jika ada di body)
    if (body.name !== undefined) payload.name = body.name || null
    if (body.phone !== undefined) payload.phone = body.phone || null
    if (body.gender !== undefined) payload.gender = body.gender || null
    if (body.bio !== undefined) payload.bio = body.bio || null
    if (body.school_name !== undefined) payload.school_name = body.school_name || null
    if (body.school_type !== undefined) payload.school_type = body.school_type || null
    if (body.school_city !== undefined) payload.school_city = body.school_city || null
    if (body.school_address !== undefined) payload.school_address = body.school_address || null
    if (body.parent_name !== undefined) payload.parent_name = body.parent_name || null
    if (body.parent_phone !== undefined) payload.parent_phone = body.parent_phone || null
    if (body.parent_email !== undefined) payload.parent_email = body.parent_email || null
    if (body.parent_relation !== undefined) payload.parent_relation = body.parent_relation || null

    // Step 2 – Minat Belajar
    if (body.grade_level !== undefined) payload.grade_level = body.grade_level || null
    if (body.subjects !== undefined) payload.subjects = body.subjects // array, bisa []
    if (body.learning_goals !== undefined) payload.learning_goals = body.learning_goals?.trim() || null

    // Step 3 – Rencana Belajar
    if (body.preferred_schedule !== undefined) payload.preferred_schedule = body.preferred_schedule || null
    if (body.budget_per_month !== undefined) payload.budget_per_month = body.budget_per_month
    if (body.sessions_per_month !== undefined) payload.sessions_per_month = body.sessions_per_month

    // Status
    if (body.status !== undefined) payload.status = body.status || 'active'
    if (body.onboarding_complete !== undefined) payload.onboarding_complete = body.onboarding_complete ?? false

    // Hapus null/undefined (tapi hati-hati jangan hapus subjects jika [] karena [] bukan null)
    Object.keys(payload).forEach(key => {
      if (payload[key] === null || payload[key] === undefined) {
        delete payload[key]
      }
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