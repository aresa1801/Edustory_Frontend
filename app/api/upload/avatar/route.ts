import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const role = formData.get('role') as string || 'tutor' // default tutor

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 })
    }

    console.log('[Upload] Uploading avatar for user:', userId, 'role:', role)

    // Konversi File ke Buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileExt = 'jpg'
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    // Upload ke Supabase Storage
    const { error: uploadError, data } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('[Upload] Upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Dapatkan public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(fileName)

    const avatarUrl = urlData.publicUrl

    // 🔥 Update tabel berdasarkan role
    let updateError = null
    if (role === 'student') {
      const { error } = await supabaseAdmin
        .from('students')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId)
      updateError = error
    } else {
      // default: tutor
      const { error } = await supabaseAdmin
        .from('tutors')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId)
      updateError = error
    }

    if (updateError) {
      console.error('[Upload] Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log('[Upload] ✅ Success for user:', userId, 'role:', role)
    return NextResponse.json({ success: true, url: avatarUrl })

  } catch (error) {
    console.error('[Upload] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}