import { createClient } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ambil student_id
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
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
      return NextResponse.json({ balance: newWallet?.balance ?? 0 })
    }

    return NextResponse.json({ balance: wallet.balance })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}