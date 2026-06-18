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
    
    // Block dangerous patterns with regex to handle whitespace and comments
    const dangerousPatterns = [
      /\bDROP\s+DATABASE\b/i,
      /\bDROP\s+SCHEMA\b/i,
      /\bTRUNCATE\b/i,
      /\bALTER\s+SYSTEM\b/i,
      /\bCREATE\s+EXTENSION\b/i,
      /\bCOPY\s+.*\s+TO\s+PROGRAM\b/i,
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(upperQuery)) {
        return NextResponse.json(
          { error: 'This operation is not allowed for safety reasons' },
          { status: 403 }
        )
      }
    }

    // Use the service role client to execute the query directly
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Execute the query using raw SQL
    // Note: This currently requires an 'execute_sql' RPC function in Supabase
    // If the function doesn't exist, you need to create it manually in your Supabase dashboard
    const startTime = Date.now()
    
    // For SELECT queries, use the RPC function
    // For other queries, return an error message guiding users to the Supabase dashboard
    let data: any[] = []
    let error: any = null
    
    const upperTrimmedQuery = query.trim().toUpperCase()
    if (upperTrimmedQuery.startsWith('SELECT')) {
      // For SELECT, try to use the execute_sql RPC function
      // If this function doesn't exist in your Supabase, you need to create it:
      // 1. Go to your Supabase dashboard
      // 2. Navigate to SQL Editor
      // 3. Create a function: CREATE OR REPLACE FUNCTION execute_sql(sql text) RETURNS TABLE AS $$ ... $$
      const { data: queryData, error: queryError } = await (serviceSupabase as any).rpc('execute_sql', {
        sql: query.trim(),
      }).catch(() => {
        // If execute_sql RPC doesn't exist, return an error message
        return { data: null, error: { message: 'SQL execution function not available. Please create the execute_sql RPC function in your Supabase dashboard.' } }
      })
      
      if (queryError) {
        error = queryError
      } else {
        data = queryData || []
      }
    } else {
      // For non-SELECT queries, guide users to use the Supabase dashboard
      data = []
      error = { message: 'Only SELECT queries are supported via this editor. For INSERT, UPDATE, DELETE, or DDL operations, please use the Supabase SQL Editor.' }
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

