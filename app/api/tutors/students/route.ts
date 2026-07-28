import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // pastikan ada di .env
    )

    const { data, error } = await supabase
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

    if (error) throw error

    return NextResponse.json({ students: data || [] })
  } catch (error) {
    console.error('[API] Error fetching students:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data siswa' },
      { status: 500 }
    )
  }
}