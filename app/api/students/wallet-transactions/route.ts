import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    // 1. Cari student ID dari user_id
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!student) {
      return NextResponse.json({ transactions: [] })
    }

    // 2. Ambil transaksi — coba beberapa nama kolom
    //    (student_id, user_id) biar kompatibel dengan schema apapun
    let transactions: any[] = []

    // Coba student_id dulu
    const { data: byStudent, error: err1 } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!err1 && byStudent && byStudent.length > 0) {
      transactions = byStudent
    } else {
      // Fallback: coba user_id
      const { data: byUser, error: err2 } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!err2 && byUser) {
        transactions = byUser
      } else if (err1 && err2) {
        console.error('[wallet-transactions] both queries failed:', err1, err2)
        // Return empty instead of error — biar UI tetap jalan
        return NextResponse.json({ transactions: [] })
      }
    }

    return NextResponse.json({ transactions })
  } catch (err) {
    console.error('[wallet-transactions] unexpected:', err)
    return NextResponse.json({ transactions: [] })
  }
}