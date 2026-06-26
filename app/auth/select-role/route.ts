import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, userName, role } = await request.json()

    // Validasi input
    if (!userId || !userEmail || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, userEmail, role' },
        { status: 400 }
      )
    }

    // Gunakan service_role key untuk bypass RLS
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ Tambahkan di Vercel Env
      {
        cookies: {
          get() { return '' },
          set() {},
          remove() {},
        },
      }
    )

    // 1. Upsert ke user_profiles
    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        role: role === 'student' ? 'siswa' : 'tutor',
        name: userName || userEmail,
        email: userEmail,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (upsertError) {
      console.error('[API] Upsert error:', upsertError)
      return NextResponse.json(
        { error: `Gagal menyimpan profile: ${upsertError.message}` },
        { status: 500 }
      )
    }

    // 2. Buat entri di students (jika role student)
    if (role === 'student') {
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (!existingStudent) {
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            user_id: userId,
            status: 'active',
            onboarding_complete: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (studentError) {
          console.error('[API] Student insert error:', studentError)
          // Tidak throw, biarkan tetap sukses
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Role saved successfully' })

  } catch (error) {
    console.error('[API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}