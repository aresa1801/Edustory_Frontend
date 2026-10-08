import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('[API] 📥 Received POST request to /api/auth/set-role')

  try {
    const body = await request.json().catch(() => ({}))
    const { role, email, name } = body
    let { userId } = body
    console.log('[API] 📝 Payload role:', role)

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

    // SECURITY: identitas HARUS berasal dari bearer token yang diverifikasi
    // server — bukan dari `userId` di body (cegah IDOR / ganti peran orang lain).
    const token = request.headers
      .get('authorization')
      ?.replace(/^Bearer\s+/i, '')
      .trim()
    if (!token) {
      console.error('[API] ❌ Missing bearer token')
      return NextResponse.json({ error: 'Sesi tidak ditemukan. Silakan login ulang.' }, { status: 401 })
    }

    const {
      data: { user: caller },
      error: callerErr,
    } = await adminSupabase.auth.getUser(token)
    if (callerErr || !caller) {
      console.error('[API] ❌ Invalid token:', callerErr?.message)
      return NextResponse.json({ error: 'Sesi tidak valid. Silakan login ulang.' }, { status: 401 })
    }

    // Non-admin hanya boleh mengatur perannya sendiri.
    if (userId && userId !== caller.id) {
      const { data: callerProfile } = await adminSupabase
        .from('user_profiles')
        .select('role')
        .eq('id', caller.id)
        .maybeSingle()
      if (callerProfile?.role !== 'admin') {
        console.error('[API] ❌ Forbidden: caller mencoba mengubah user lain')
        return NextResponse.json(
          { error: 'Tidak boleh mengubah peran pengguna lain' },
          { status: 403 }
        )
      }
      // admin boleh menetapkan peran user lain, pakai userId dari body
    } else {
      // default: peran user yang sedang login
      userId = caller.id
    }

    // Verifikasi user di auth
    console.log('[API] 🔍 Verifikasi user ID di auth...')
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(userId)
    if (authError || !authUser) {
      console.error('[API] ❌ User not found in auth:', authError?.message)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    console.log('[API] ✅ User verified:', authUser.user?.email)

    const userEmail = authUser.user?.email || email
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