import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/auth/role-utils'

export async function POST(request: NextRequest) {
  try {
    // Ensure SUPABASE_SERVICE_ROLE_KEY is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: SQL execution not available' },
        { status: 500 }
      )
    }

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

    // Check if user is admin using the utility function
    if (!isAdminEmail(user.email)) {
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

    // Sanitize the query — block dangerous operations
    const upperQuery = query.toUpperCase().trim()
    const dangerousPatterns = [
      'DROP DATABASE',
      'DROP SCHEMA',
      'ALTER SYSTEM',
      'CREATE EXTENSION',
      'COPY TO PROGRAM',
    ]

    for (const pattern of dangerousPatterns) {
      if (upperQuery.includes(pattern)) {
        return NextResponse.json(
          { error: `This operation is not allowed for safety reasons: ${pattern}` },
          { status: 403 }
        )
      }
    }

    // TRUNCATE should also be blocked unless specifically allowed
    if (upperQuery.startsWith('TRUNCATE')) {
      return NextResponse.json(
        { error: 'TRUNCATE operations are not allowed for safety reasons' },
        { status: 403 }
      )
    }

    // Use the service role client to execute the query directly
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Execute the query using raw SQL
    const startTime = Date.now()
    
    // For SELECT queries, use regular query API
    // For other queries, we need to use the sql function if available
    let data: any[] = []
    let error: any = null
    
    const upperTrimmedQuery = query.trim().toUpperCase()
    if (upperTrimmedQuery.startsWith('SELECT')) {
      // For SELECT, we can use the generic query approach
      const { data: queryData, error: queryError } = await (serviceSupabase as any).rpc('execute_sql', {
        sql: query.trim(),
      }).catch(() => {
        // If execute_sql RPC doesn't exist, try a different approach
        return { data: null, error: { message: 'SQL execution not available. Please use Supabase dashboard.' } }
      })
      
      if (queryError) {
        error = queryError
      } else {
        data = queryData || []
      }
    } else {
      // For non-SELECT queries, log a warning
      data = []
      error = { message: 'Only SELECT queries are currently supported via this editor. Please use the Supabase dashboard for INSERT, UPDATE, DELETE operations.' }
    }

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

