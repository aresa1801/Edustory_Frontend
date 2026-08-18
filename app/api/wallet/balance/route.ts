import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    // Ambil token dari header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = getSupabase()

    // Verifikasi user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ambil student_id
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    // Cari wallet
    let { data: wallet, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('student_id', student.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Jika wallet belum ada, buat baru
    if (!wallet) {
      const { data: newWallet, error: insertError } = await supabase
        .from('wallets')
        .insert({ student_id: student.id, balance: 0 })
        .select('balance')
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      return NextResponse.json({ balance: 0 })
    }

    return NextResponse.json({ balance: wallet.balance })
  } catch (err: any) {
    console.error('[Balance API] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}