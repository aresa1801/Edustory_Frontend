import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { session } } = await supabaseAuth.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, cache: 'no-store' }),
        },
      }
    )

    // ⬇️ TAMBAH suspended_until di select
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('id, suspended_until')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({
      student_id: student.id,
      suspended_until: student.suspended_until ?? null,   // ⬅️ BARU
    })
  } catch (err) {
    console.error('[students/me] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}