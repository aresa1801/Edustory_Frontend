import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getCreditTier } from '@/lib/credit'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// === GET: Ambil data student berdasarkan user_id ===
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
        },
      }
    )

    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    console.log('[API GET] Student found:', student ? 'YES' : 'NO')

    if (error) {
      console.error('[API GET] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { student: student || null },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (err) {
    console.error('[API] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// === POST: Upsert data student ===
export async function POST(request: NextRequest) {
  console.log('[API] 📥 Received POST /api/students/onboarding')

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
        },
      }
    )

    const body = await request.json()

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

    // ⬇️ Cek apakah ini "first time onboarding" atau "edit profil"
    // Kalau student belum ada di DB → first time → gak ada cooldown check
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id, credit_score, last_profile_edit_at, onboarding_complete')
      .eq('user_id', userId)
      .maybeSingle()

    const isFinishingOnboarding = body.onboarding_complete === true
    const isEditProfile = existingStudent?.onboarding_complete === true

    // ⬇️ CEK COOLDOWN (cuma saat edit profil, bukan first-time onboarding)
    if (isEditProfile && isFinishingOnboarding && existingStudent) {
      const studentScore = Number(existingStudent.credit_score ?? 99)
      const tier = getCreditTier(studentScore)

      if (
        tier.features.profileEditLockDays > 0 &&
        existingStudent.last_profile_edit_at
      ) {
        const lastEditMs = new Date(existingStudent.last_profile_edit_at).getTime()
        const lockMs = tier.features.profileEditLockDays * 24 * 60 * 60 * 1000
        const nextEditAt = lastEditMs + lockMs

        if (Date.now() < nextEditAt) {
          return NextResponse.json(
            {
              error: 'EDIT_COOLDOWN',
              message: `Anda hanya bisa edit profil setiap ${tier.features.profileEditLockDays} hari (tier ${tier.label}).`,
              nextEditAt: new Date(nextEditAt).toISOString(),
              tierLabel: tier.label,
            },
            { status: 403 }
          )
        }
      }
    }

    // --- Buat payload ---
    const payload: Record<string, any> = { user_id: userId }

    // Step 1 – Profil Siswa
    if (body.name !== undefined) payload.name = body.name || null
    if (body.phone !== undefined) payload.phone = body.phone || null
    if (body.gender !== undefined) payload.gender = body.gender || null
    if (body.bio !== undefined) payload.bio = body.bio || null
    if (body.address !== undefined) payload.address = body.address || null
    if (body.school_name !== undefined) payload.school_name = body.school_name || null
    if (body.school_type !== undefined) payload.school_type = body.school_type || null
    if (body.school_city !== undefined) payload.school_city = body.school_city || null
    if (body.parent_name !== undefined) payload.parent_name = body.parent_name || null
    if (body.parent_phone !== undefined) payload.parent_phone = body.parent_phone || null
    if (body.parent_email !== undefined) payload.parent_email = body.parent_email || null
    if (body.parent_relation !== undefined) payload.parent_relation = body.parent_relation || null

    // Step 2 – Minat Belajar
    if (body.grade_level !== undefined) payload.grade_level = body.grade_level || null
    if (body.subjects !== undefined) payload.subjects = body.subjects
    if (body.learning_goals !== undefined) payload.learning_goals = body.learning_goals?.trim() || null

    // Step 3 – Rencana Belajar
    if (body.preferred_schedule !== undefined) payload.preferred_schedule = body.preferred_schedule || null
    if (body.budget_per_month !== undefined) payload.budget_per_month = body.budget_per_month
    if (body.sessions_per_month !== undefined) payload.sessions_per_month = body.sessions_per_month

    // Step 4 – Deposit / Pembayaran
    if (body.payment_method !== undefined) payload.payment_method = body.payment_method || null
    if (body.transfer_notes !== undefined) payload.transfer_notes = body.transfer_notes?.trim() || null
    if (body.deposit_amount !== undefined) payload.deposit_amount = body.deposit_amount

    // Status
    if (body.status !== undefined) payload.status = body.status || 'active'
    if (body.onboarding_complete !== undefined) payload.onboarding_complete = body.onboarding_complete ?? false

    // Koordinat GPS
    if (body.latitude !== undefined) payload.latitude = body.latitude
    if (body.longitude !== undefined) payload.longitude = body.longitude

    // Hapus null/undefined
    Object.keys(payload).forEach(key => {
      if (payload[key] === null || payload[key] === undefined) {
        delete payload[key]
      }
    })

    // ⬇️ SET `last_profile_edit_at` — cuma saat onboarding complete (bukan tiap step)
    if (isFinishingOnboarding) {
      const studentScore = existingStudent
        ? Number(existingStudent.credit_score ?? 99)
        : 99
      const tier = getCreditTier(studentScore)

      if (tier.features.profileEditLockDays > 0) {
        payload.last_profile_edit_at = new Date().toISOString()
      }
    }

    console.log('[API] 📦 Final payload keys:', Object.keys(payload))

    const { data, error } = await supabase
      .from('students')
      .upsert(payload, { onConflict: 'user_id' })
      .select()

    if (error) {
      console.error('[API] Upsert error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log('[API] ✅ Success')
    return NextResponse.json(
      { success: true, data: data?.[0] || null },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (err) {
    console.error('[API] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}