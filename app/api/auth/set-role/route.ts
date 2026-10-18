import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'

export async function POST(request: NextRequest) {

  try {
    const { userId, role, email, name } = await request.json()

    if (!userId) {
      console.error('[API] ❌ Missing userId')
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Only the signed-in user may set their own role.
    const { user: sessionUser, response: authResponse } = await requireUser(request, userId)
    if (authResponse) return authResponse
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (role !== 'student' && role !== 'tutor') {
      console.error('[API] ❌ Invalid role:', role)
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Mapping: student → 'siswa', tutor → 'tutor'
    const dbRole = role === 'student' ? 'siswa' : role

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verifikasi user di auth
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(userId)
    if (authError || !authUser) {
      console.error('[API] ❌ User not found in auth:', authError?.message)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userEmail = email || authUser.user?.email
    const userName = name || authUser.user?.user_metadata?.full_name || userEmail

    if (!userEmail) {
      console.error('[API] ❌ Email is missing')
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Role is permanent once chosen (prevents privilege changes after onboarding).
    const { data: existingProfile } = await adminSupabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile?.role && existingProfile.role !== dbRole) {
      return NextResponse.json(
        { error: 'Role sudah ditetapkan dan tidak dapat diubah' },
        { status: 409 }
      )
    }

    // 1. Upsert ke user_profiles
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

    // 2. Jika role = tutor, pastikan ada baris di tabel tutors
    if (role === 'tutor') {

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
      } else {
      }
    }

    return NextResponse.json({ success: true, role: dbRole })
  } catch (error) {
    console.error('[API] ❌ Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
