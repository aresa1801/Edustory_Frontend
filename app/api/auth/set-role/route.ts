import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('[API] 📥 Received POST request to /api/auth/set-role')

  try {
    const { userId, role, email, name } = await request.json()
    console.log('[API] 📝 Payload:', { userId, role, email, name })

    if (!userId) {
      console.error('[API] ❌ Missing userId')
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    if (role !== 'student' && role !== 'tutor') {
      console.error('[API] ❌ Invalid role:', role)
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Mapping: student → 'siswa', tutor → 'tutor'
    const dbRole = role === 'student' ? 'siswa' : role
    console.log('[API] 📝 Mapping role to dbRole:', dbRole)

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verifikasi user di auth
    console.log('[API] 🔍 Verifikasi user ID di auth...')
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(userId)
    if (authError || !authUser) {
      console.error('[API] ❌ User not found in auth:', authError?.message)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    console.log('[API] ✅ User verified:', authUser.user?.email)

    const userEmail = email || authUser.user?.email
    const userName = name || authUser.user?.user_metadata?.full_name || userEmail

    if (!userEmail) {
      console.error('[API] ❌ Email is missing')
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // 1. Upsert ke user_profiles
    console.log('[API] 💾 Upserting to user_profiles...')
    const { error: upsertError } = await adminSupabase
      .from('user_profiles')
      .upsert({
        id: userId,
        email: userEmail,
        name: userName,
        role: dbRole,
        avatar_url: authUser.user?.user_metadata?.avatar_url || null,
        updated_at: now,
      }, { onConflict: 'id' })

    if (upsertError) {
      console.error('[API] ❌ Upsert failed:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }
    console.log('[API] ✅ user_profiles upsert succeeded')

    // 2. Jika role = tutor, pastikan ada baris di tabel tutors
    if (role === 'tutor') {
      console.log('[API] 👨‍🏫 Checking tutors table for user_id:', userId)

      // Cek apakah sudah ada
      const { data: existingTutor, error: checkError } = await adminSupabase
        .from('tutors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (checkError) {
        console.error('[API] ❌ Error checking tutors:', checkError)
        return NextResponse.json({ error: checkError.message }, { status: 500 })
      }

      if (!existingTutor) {
        console.log('[API] 📝 Creating new tutor record...')
        const { error: insertError } = await adminSupabase
          .from('tutors')
          .insert({
            user_id: userId,
            specializations_sd: [],
            specializations_smp: [],
            specializations_sma: [],
            experience_years: null,
            hourly_rate: null,
            qualifications: null,
            rating: 0,
            total_reviews: 0,
            verified_grade_levels: [],
            target_grade_level: null,
            created_at: now,
            updated_at: now,
          })

        if (insertError) {
          console.error('[API] ❌ Insert tutor failed:', insertError)
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
        console.log('[API] ✅ Tutor record created')
      } else {
        console.log('[API] ℹ️ Tutor record already exists, skipping insert')
      }
    }

    console.log('[API] 🎉 Role saved successfully')
    return NextResponse.json({ success: true, role: dbRole })
  } catch (error) {
    console.error('[API] ❌ Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}