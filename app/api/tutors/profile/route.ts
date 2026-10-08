import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getCreditTier } from '@/lib/credit'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    }
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

    // Fetch tutor data (+ credit_score + last_profile_edit_at)
    const { data: tutorData, error: tutorErr } = await supabase
      .from('tutors')
      .select(`
        id,
        full_name,
        phone,
        bio,
        experience_years,
        hourly_rate,
        qualifications,
        approval_status,
        verified,
        verified_grade_levels,
        specializations_sd,
        specializations_smp,
        specializations_sma,
        avatar_url,
        latitude,
        longitude,
        credit_score,
        last_profile_edit_at
      `)
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

    // ============================================================
    // ⬇️ BARU: Ambil data tutor existing (buat cek tier & cooldown)
    // ============================================================
    const { data: existingTutor } = await supabase
      .from('tutors')
      .select('id, credit_score, last_profile_edit_at')
      .eq('user_id', userId)
      .maybeSingle()

    const tutorScore = Number(existingTutor?.credit_score ?? 99)
    const tier = getCreditTier(tutorScore)

    // ============================================================
    // ⬇️ BARU: CEK 0 — Akun ditahan (tier Bahaya/Blacklist)
    // ============================================================
    if (tier.features.accountHeld) {
      return NextResponse.json(
        {
          error: 'ACCOUNT_HELD',
          message: `Akun Anda sedang ditahan karena credit score rendah (${tutorScore}, tier ${tier.label}). Tidak bisa mengubah profil.`,
          tier: tier.id,
          tierLabel: tier.label,
          score: tutorScore,
        },
        { status: 403 }
      )
    }

    // ============================================================
    // ⬇️ CEK 1: RATE LIMIT
    // Kalau tier punya maxSessionRate dan user pasang rate lebih tinggi → block
    // ============================================================
    const newRate = body.hourly_rate !== undefined ? Number(body.hourly_rate) : null
    if (
      newRate !== null &&
      tier.features.maxSessionRate !== null &&
      newRate > tier.features.maxSessionRate
    ) {
      return NextResponse.json(
        {
          error: 'RATE_LIMIT',
          message: `Tarif maksimal Rp ${tier.features.maxSessionRate.toLocaleString('id-ID')}/jam untuk tier ${tier.label}.`,
          maxSessionRate: tier.features.maxSessionRate,
          tierLabel: tier.label,
          yourRate: newRate,
        },
        { status: 403 }
      )
    }

    // ============================================================
    // ⬇️ CEK 2: EDIT COOLDOWN
    // Kalau tier punya profileEditLockDays dan user pernah edit sebelumnya
    // ============================================================
    if (
      existingTutor?.last_profile_edit_at &&
      tier.features.profileEditLockDays > 0
    ) {
      const lastEditMs = new Date(existingTutor.last_profile_edit_at).getTime()
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

    // --- Buat payload ---
    const payload: Record<string, any> = {
      user_id: userId,
    }

    const fields = [
      'full_name', 'phone', 'bio',
      'experience_years', 'hourly_rate', 'qualifications',
      'approval_status', 'verified',
      'rating', 'total_reviews',
      'verified_grade_levels',
      'specializations_sd',
      'specializations_smp',
      'specializations_sma',
      'latitude',
      'longitude'
    ]

    fields.forEach(field => {
      if (body[field] !== undefined) {
        payload[field] = body[field] ?? (Array.isArray(body[field]) ? [] : null)
      }
    })

    // Hapus null/undefined
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

    // ============================================================
    // ⬇️ BARU: Update last_profile_edit_at (kalau tier punya lock days)
    // ============================================================
    if (tier.features.profileEditLockDays > 0) {
      const { error: tsErr } = await supabase
        .from('tutors')
        .update({ last_profile_edit_at: new Date().toISOString() })
        .eq('user_id', userId)

      if (tsErr) {
        console.error('[API] Update last_profile_edit_at error:', tsErr)
      }
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