import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('[API] 📥 GET /api/tutors/students - Fetching all students')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: students, error } = await supabase
      .from('students')
      .select(`
        id,
        name,
        grade_level,
        subjects,
        budget_per_month,
        sessions_per_month,
        preferred_schedule,
        address,
        avatar_url
      `)
      .eq('status', 'active')
      .eq('onboarding_complete', true)
      .not('budget_per_month', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API] ❌ Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[API] ✅ Success: ${students?.length || 0} students found`)
    return NextResponse.json({ students: students || [] })
  } catch (err) {
    console.error('[API] ❌ Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}