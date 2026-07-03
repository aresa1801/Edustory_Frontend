import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  console.log('[API] 📥 Received POST request to /api/students/onboarding')

  const supabase = getSupabase()
  try {
    // ============================================================
    // 1. VALIDATE AUTHORIZATION
    // ============================================================
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.error('[API] ❌ Missing authorization header')
      return NextResponse.json(
        { error: 'Unauthorized: Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('[API] 🔑 Validating token...')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('[API] ❌ Invalid token:', authError?.message)
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      )
    }

    console.log('[API] ✅ User authenticated:', user.email)
    const userId = user.id

    // ============================================================
    // 2. VALIDATE USER EXISTS IN user_profiles
    // ============================================================
    console.log('[API] 🔍 Checking if user exists in user_profiles...')
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      console.error('[API] ❌ User not found in user_profiles:', profileError?.message)
      return NextResponse.json(
        { error: 'User profile not found. Please complete role selection first.' },
        { status: 404 }
      )
    }

    console.log('[API] ✅ User profile found:', userProfile.email, 'Role:', userProfile.role)

    // ============================================================
    // 3. VALIDATE USER ROLE IS STUDENT
    // ============================================================
    if (userProfile.role !== 'siswa' && userProfile.role !== 'student') {
      console.error('[API] ❌ User is not a student:', userProfile.role)
      return NextResponse.json(
        { error: 'User is not registered as a student' },
        { status: 403 }
      )
    }

    // ============================================================
    // 4. PARSE AND VALIDATE REQUEST BODY
    // ============================================================
    const body = await request.json()
    console.log('[API] 📦 Request body:', {
      user_id: body.user_id,
      name: body.name,
      parent_name: body.parent_name,
      has_phone: !!body.phone,
      has_school_name: !!body.school_name,
      has_parent_phone: !!body.parent_phone,
    })

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      console.error('[API] ❌ Student name is required')
      return NextResponse.json(
        { error: 'Student name is required' },
        { status: 400 }
      )
    }

    if (!body.parent_name || !body.parent_name.trim()) {
      console.error('[API] ❌ Parent name is required')
      return NextResponse.json(
        { error: 'Parent name is required' },
        { status: 400 }
      )
    }

    // Verify that user_id in body matches authenticated user
    if (body.user_id && body.user_id !== userId) {
      console.error('[API] ❌ User ID mismatch')
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 400 }
      )
    }

    // ============================================================
    // 5. PREPARE DATA FOR UPSERT
    // ============================================================
    const now = new Date().toISOString()
    const payload: Record<string, any> = {
      user_id: userId,
      // Siswa data
      name: body.name?.trim() || null,
      phone: body.phone?.trim() || null,
      gender: body.gender || null,
      bio: body.bio?.trim() || null,
      // Sekolah data
      school_name: body.school_name?.trim() || null,
      school_type: body.school_type || null,
      school_city: body.school_city?.trim() || null,
      school_address: body.school_address?.trim() || null,
      // Orang tua data
      parent_name: body.parent_name?.trim() || null,
      parent_phone: body.parent_phone?.trim() || null,
      parent_email: body.parent_email?.trim() || null,
      parent_relation: body.parent_relation || null,
      // Status
      status: body.status || 'active',
      onboarding_complete: false,
      updated_at: now,
    }

    // Remove null values to allow updates to keep existing data
    Object.keys(payload).forEach(key => {
      if (payload[key] === null || payload[key] === undefined) {
        delete payload[key]
      }
    })

    console.log('[API] 📝 Payload for upsert:', payload)

    // ============================================================
    // 6. UPSERT DATA INTO students TABLE
    // ============================================================
    console.log('[API] 💾 Upserting data into students table...')
    const { data: upsertedData, error: upsertError } = await supabase
      .from('students')
      .upsert(payload, { onConflict: 'user_id' })
      .select()

    if (upsertError) {
      console.error('[API] ❌ Upsert failed:', upsertError.message)
      return NextResponse.json(
        { error: `Failed to save student profile: ${upsertError.message}` },
        { status: 500 }
      )
    }

    console.log('[API] ✅ Upsert succeeded:', upsertedData)

    // ============================================================
    // 7. RETURN SUCCESS RESPONSE
    // ============================================================
    console.log('[API] 🎉 Student profile saved successfully')
    return NextResponse.json(
      {
        success: true,
        message: 'Student profile saved successfully',
        data: upsertedData?.[0] || { user_id: userId },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API] ❌ Unexpected error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
