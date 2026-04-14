import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { action } = await request.json() // 'confirm' or 'reject'
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('tutor_id')
      .eq('id', params.matchId)
      .single()

    if (matchError) throw matchError

    // Verify tutor ownership
    const { data: tutor } = await supabase
      .from('tutors')
      .select('id')
      .eq('id', match.tutor_id)
      .eq('user_id', user.id)
      .single()

    if (!tutor) {
      return NextResponse.json(
        { error: 'Not authorized to update this match' },
        { status: 403 }
      )
    }

    const updateData = {
      tutor_confirmed_at: new Date().toISOString(),
      status: action === 'confirm' ? 'matched' : 'cancelled',
    }

    const { data, error } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', params.matchId)
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error confirming match:', error)
    return NextResponse.json(
      { error: 'Failed to confirm match' },
      { status: 500 }
    )
  }
}
