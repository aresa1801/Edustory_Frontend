import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { code } = await request.json()

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error

      return NextResponse.json(data)
    } catch (error) {
      return NextResponse.json(
        { error: 'Auth callback failed' },
        { status: 400 }
      )
    }
  }

  return NextResponse.json(
    { error: 'No code provided' },
    { status: 400 }
  )
}
