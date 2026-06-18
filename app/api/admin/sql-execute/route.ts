import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get the user's session
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'storyaunty.evi@gmail.com'
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Only admins can execute SQL queries' },
        { status: 403 }
      )
    }

    // Get the query from the request
    const { query } = await request.json()
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid query' },
        { status: 400 }
      )
    }

    // Sanitize the query to prevent certain dangerous operations
    const upperQuery = query.toUpperCase().trim()
    if (
      upperQuery.includes('DROP DATABASE') ||
      upperQuery.includes('DROP SCHEMA') ||
      upperQuery.includes('TRUNCATE') && upperQuery.includes('CASCADE')
    ) {
      return NextResponse.json(
        { error: 'This operation is not allowed for safety reasons' },
        { status: 403 }
      )
    }

    // Use the service role client to execute the query directly
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Execute the query using the raw SQL API
    const startTime = Date.now()
    const { data, error } = await (serviceSupabase as any).rpc('execute_sql_query', {
      query: query.trim(),
    })

    const endTime = Date.now()

    if (error) {
      return NextResponse.json(
        { 
          error: error.message || 'Failed to execute query',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: data || [],
      rowCount: Array.isArray(data) ? data.length : 0,
      executionTime: endTime - startTime,
    })
  } catch (error) {
    console.error('[SQL Editor Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    )
  }
}

