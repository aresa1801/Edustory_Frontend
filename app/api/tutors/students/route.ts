import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'

export async function GET() {
  noStore()
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, grade_level, subjects, budget_per_month, sessions_per_month, preferred_schedule, address, avatar_url, latitude, longitude') // 🔥 tambahkan latitude & longitude
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ students: students || [] })
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}