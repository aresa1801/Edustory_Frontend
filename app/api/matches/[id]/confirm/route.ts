// app/api/matches/[id]/confirm/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { id } = params
    const { action } = await request.json()

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cek match
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('student_id')
      .eq('id', id)
      .single()

    if (matchErr || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Verifikasi bahwa user adalah student yang bersangkutan
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (studentErr || !student || student.id !== match.student_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const newStatus = action === 'accept' ? 'matched' : 'cancelled'
    const { error: updateErr } = await supabase
      .from('matches')
      .update({ status: newStatus })
      .eq('id', id)

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API] Confirm error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}