import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: students, error } = await supabase
      .from('students')
      .select('id, name, grade_level, subjects, budget_per_month, sessions_per_month, preferred_schedule, address, avatar_url')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { 
        status: 500,
        headers: { 'Cache-Control': 'no-store, must-revalidate' }
      })
    }

    return NextResponse.json({ students: students || [] }, {
      headers: { 'Cache-Control': 'no-store, must-revalidate' }
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: { 'Cache-Control': 'no-store, must-revalidate' }
      }
    )
  }
}