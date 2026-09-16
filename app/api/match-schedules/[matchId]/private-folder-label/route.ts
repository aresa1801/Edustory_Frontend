import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { matchId } = params
    const body = await req.json()
    const { label, user_id, role } = body

    if (!label || !user_id || !role) {
      return NextResponse.json(
        { error: 'label, user_id, role wajib diisi' },
        { status: 400 }
      )
    }

    if (!['tutor', 'student'].includes(role)) {
      return NextResponse.json({ error: 'role tidak valid' }, { status: 400 })
    }

    const trimmed = label.trim()
    if (!trimmed || trimmed.length > 50) {
      return NextResponse.json(
        { error: 'Nama folder wajib diisi (maks 50 karakter)' },
        { status: 400 }
      )
    }

    // Validasi user
    const table = role === 'tutor' ? 'tutors' : 'students'
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: `${role} tidak ditemukan` },
        { status: 404 }
      )
    }

    // Update kolom sesuai role
    const column =
      role === 'tutor'
        ? 'tutor_private_folder_label'
        : 'student_private_folder_label'

    const { error: updateErr } = await supabaseAdmin
      .from('match_schedules')
      .update({ [column]: trimmed })
      .eq('match_id', matchId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, label: trimmed })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}