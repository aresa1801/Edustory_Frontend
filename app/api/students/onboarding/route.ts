import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { geocodeAddress } from '@/lib/geocode'

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
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    console.log('[API GET] Student found:', student ? 'YES' : 'NO', student)

    if (error) {
      console.error('[API GET] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ student: student || null })
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
    if (body.subjects !== undefined) payload.subjects = body.subjects // array
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

    // 🔥 GEOCODING DENGAN DETAIL RESPONSE
    let geocodeResult: {
      status: string
      message: string
      lat: number | null
      lng: number | null
    } = {
      status: 'skipped',
      message: 'Tidak ada alamat',
      lat: null,
      lng: null,
    }

    if (body.address && body.address.trim().length > 5) {
      console.log('[API] 📍 Geocoding address:', body.address)
      geocodeResult.status = 'processing'
      geocodeResult.message = 'Sedang memproses...'

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Geocoding timeout (5 detik)')), 5000)
        )
        const coords = await Promise.race([
          geocodeAddress(body.address),
          timeoutPromise
        ]) as { lat: number; lng: number } | null

        if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
          payload.latitude = coords.lat
          payload.longitude = coords.lng
          geocodeResult.status = 'success'
          geocodeResult.message = 'Berhasil mendapatkan koordinat'
          geocodeResult.lat = coords.lat
          geocodeResult.lng = coords.lng
          console.log('[API] ✅ Geocode success:', coords)
        } else {
          geocodeResult.status = 'failed_not_found'
          geocodeResult.message = 'Alamat tidak ditemukan oleh Nominatim'
          console.warn('[API] ⚠️ Geocode returned null')
        }
      } catch (err: any) {
        geocodeResult.status = 'failed_error'
        geocodeResult.message = err.message || 'Error tidak diketahui'
        console.error('[API] ❌ Geocode error:', err)
      }
    } else {
      geocodeResult.message = 'Alamat kosong atau terlalu pendek (min 5 karakter)'
    }

    // Hapus null/undefined, tapi jangan hapus array kosong
    Object.keys(payload).forEach(key => {
      if (payload[key] === null || payload[key] === undefined) {
        delete payload[key]
      }
    })

    console.log('[API] 📦 Final payload:', payload)

    const { data, error } = await supabase
      .from('students')
      .upsert(payload, { onConflict: 'user_id' })
      .select()

    if (error) {
      console.error('[API] Upsert error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        geocode: geocodeResult,
      }, { status: 500 })
    }

    console.log('[API] ✅ Success:', data)
    return NextResponse.json({
      success: true,
      data: data?.[0] || null,
      geocode: geocodeResult,
    })
  } catch (err) {
    console.error('[API] Unexpected error:', err)
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Internal error',
      geocode: {
        status: 'failed_error',
        message: err instanceof Error ? err.message : 'Error tidak diketahui',
        lat: null,
        lng: null,
      },
    }, { status: 500 })
  }
}