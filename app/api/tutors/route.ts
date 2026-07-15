import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    // Validasi user_id wajib ada
    if (!payload.user_id) {
      return NextResponse.json(
        { error: 'user_id wajib diisi' },
        { status: 400 }
      )
    }

    // Buat Supabase client (pastikan menggunakan await jika createClient async)
    const supabase = await createClient()

    // Validasi user melalui user_profiles (lebih sederhana, tidak perlu auth.admin)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', payload.user_id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      )
    }

    // Hapus field yang tidak boleh di-update
    const { user_id, id, created_at, updated_at, ...updateData } = payload

    // Upsert ke tabel tutors
    const { data, error } = await supabase
      .from('tutors')
      .upsert(
        {
          user_id: payload.user_id,
          ...updateData,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[Tutor API] Upsert error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[Tutor API] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}