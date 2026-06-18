import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Resends OTP code to user's email
 * POST /api/auth/resend-otp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, type = 'signup' } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Resend OTP
    const { error } = await supabase.auth.resend({
      type: type as 'signup' | 'email_change',
      email,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to resend verification code' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    })
  } catch (error) {
    console.error('[API] OTP resend error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
