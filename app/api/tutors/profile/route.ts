import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Fetch tutor data
    const { data: tutorData, error: tutorErr } = await supabase
      .from('tutors')
      .select('id, full_name, phone, bio, experience_years, hourly_rate, qualifications, specializations, approval_status, verified')
      .eq('user_id', userId)
      .maybeSingle()

    if (tutorErr && tutorErr.code !== 'PGRST116') {
      console.error('[API] Tutor fetch error:', tutorErr)
      return NextResponse.json({ error: tutorErr.message }, { status: 500 })
    }

    // Fetch email from user_profiles
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle()

    return NextResponse.json({
      tutor: tutorData || null,
      email: profileData?.email || null,
    })
  } catch (err) {
    console.error('[API] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  console.log('[API] Received POST /api/tutors/profile')
  try {
    const supabase = getSupabase()
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

    // --- Buat payload hanya dengan field yang ada di body ---
    const payload: Record<string, any> = {
      user_id: userId,
    }

    // Field yang boleh di-update
    const fields = [
      'full_name', 'phone', 'bio',
      'experience_years', 'hourly_rate', 'qualifications',
      'specializations', 'approval_status', 'verified',
      'rating', 'total_reviews', 'verified_grade_levels', 'target_grade_level',
      'specializations_sd', 'specializations_smp', 'specializations_sma'
    ]

    fields.forEach(field => {
      if (body[field] !== undefined) {
        payload[field] = body[field] ?? null
      }
    })

    // Hapus null/undefined (tapi hati-hati jangan hapus array kosong)
    Object.keys(payload).forEach(key => {
      if (payload[key] === null || payload[key] === undefined) {
        delete payload[key]
      }
    })

    console.log('[API] Upsert payload:', payload)

    const { data, error } = await supabase
      .from('tutors')
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