'use server'

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tutor } = await supabase
      .from('tutors')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!tutor) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    const { data: progress } = await supabase
      .from('curation_progress')
      .select('*')
      .eq('tutor_id', tutor.id)
      .single()

    const { data: psychology } = await supabase
      .from('psychology_assessments')
      .select('score')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: academic } = await supabase
      .from('academic_assessments')
      .select('score')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: microteaching } = await supabase
      .from('microteaching_assessments')
      .select('overall_score')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: handwriting } = await supabase
      .from('handwriting_assessments')
      .select('overall_score')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: interview } = await supabase
      .from('ai_interview_assessments')
      .select('overall_score')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      progress,
      psychology,
      academic,
      microteaching,
      handwriting,
      interview
    })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    )
  }
}
