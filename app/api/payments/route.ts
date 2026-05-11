import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthUser(request: NextRequest) {
  const supabase = getSupabase()
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// GET /api/payments — list deposit payments for the current student
export async function GET(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('payment_deposits')
      .select(`
        id,
        match_id,
        amount,
        payment_method,
        payment_status,
        created_at,
        matches:match_id(subject, status)
      `)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}

// POST /api/payments — record a new deposit payment
export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { matchId, tutorId, amount, paymentMethod, transactionRef, qrisDynamicString, isOnboardingDeposit } =
      await request.json()

    const VALID_METHODS = [
      'qris',
      'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja',
      'bca', 'bni', 'bri', 'mandiri', 'permata', 'cimb',
    ]

    if (!amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'amount and paymentMethod are required' },
        { status: 400 }
      )
    }

    if (!isOnboardingDeposit && !tutorId) {
      return NextResponse.json(
        { error: 'tutorId is required for session payments' },
        { status: 400 }
      )
    }

    if (!VALID_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `paymentMethod must be one of: ${VALID_METHODS.join(', ')}` },
        { status: 400 }
      )
    }

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('payment_deposits')
      .insert([
        {
          student_id: student.id,
          tutor_id: tutorId || null,
          match_id: matchId || null,
          amount,
          payment_method: paymentMethod,
          payment_status: isOnboardingDeposit ? 'paid' : 'pending',
          payment_type: isOnboardingDeposit ? 'onboarding_deposit' : 'session',
          paid_at: isOnboardingDeposit ? new Date().toISOString() : null,
          transaction_ref: transactionRef || null,
          qris_dynamic_string: paymentMethod === 'qris' ? (qrisDynamicString || null) : null,
        },
      ])
      .select()

    if (error) {
      // Table may not exist yet; return a graceful response
      if (error.code === '42P01') {
        return NextResponse.json(
          { warning: 'payment_deposits table not yet created. Run migration 003.' },
          { status: 200 }
        )
      }
      throw error
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
}
