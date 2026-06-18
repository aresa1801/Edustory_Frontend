import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Verifies OTP code sent to user's email
 * POST /api/auth/verify-otp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, token, type = 'signup' } = body

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and token are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify the OTP with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: type as 'signup' | 'email',
    })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    })
  } catch (error) {
    console.error('[API] OTP verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
