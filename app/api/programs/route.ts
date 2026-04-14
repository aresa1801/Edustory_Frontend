import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'

    let query = supabase.from('programs').select('*')

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('programs')
      .insert([
        {
          name: body.name,
          description: body.description,
          price: body.price,
          duration_months: body.duration_months,
          features: body.features || [],
          status: 'active',
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url)
    const programId = searchParams.get('id')
    const body = await request.json()

    if (!programId) {
      return NextResponse.json({ error: 'Program ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('programs')
      .update(body)
      .eq('id', programId)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(request.url)
    const programId = searchParams.get('id')

    if (!programId) {
      return NextResponse.json({ error: 'Program ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', programId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Program deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
