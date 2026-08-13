// app/api/matches/[id]/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const start = Date.now()
  console.log(`[API] /matches/${params.id} START`)

  try {
    // 1. Cek environment variables
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    console.log(`[API] URL exists: ${!!url}, KEY exists: ${!!key}`)

    if (!url || !key) {
      console.error('[API] Missing environment variables')
      return NextResponse.json(
        { error: 'Server misconfiguration: missing env vars' },
        { status: 500 }
      )
    }

    // 2. Buat Supabase client
    const supabase = createClient(url, key)
    console.log(`[API] Supabase client created`)

    // 3. Query dengan timeout internal (10 detik)
    const queryPromise = supabase
      .from('matches')
      .select('matched_subjects, student_schedule, tutor_full_name, status')
      .eq('id', params.id)
      .maybeSingle()

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout after 10s')), 10000)
    })

    const result = await Promise.race([queryPromise, timeoutPromise]) as any
    const duration = Date.now() - start
    console.log(`[API] Query completed in ${duration}ms`)

    // 4. Handle result
    if (result.error) {
      console.error(`[API] Supabase error:`, result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    const match = result.data
    if (!match) {
      console.log(`[API] Match not found for id: ${params.id}`)
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    console.log(`[API] Match found:`, match)
    return NextResponse.json(match)
  } catch (err: any) {
    const duration = Date.now() - start
    console.error(`[API] Exception after ${duration}ms:`, err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}