import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import WalletClient from './WalletClient'

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: { amount?: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/auth/login')
  }

  // Wallet balance
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  let balance = 0
  if (student) {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('student_id', student.id)
      .single()
    balance = wallet?.balance || 0
  }

  // Ambil frozen
  let frozen = 0
  if (student) {
    try {
      const apiRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/students/wallet-balance?user_id=${session.user.id}`,
        { cache: 'no-store' }
      )
      const apiData = await apiRes.json()
      frozen = Number(apiData.frozen) || 0
    } catch (e) {
      console.warn('[payment] fetch frozen error:', e)
    }
  }

  // Parse amount dari query param
  const rawAmount = searchParams?.amount
  const defaultAmount =
    rawAmount && !isNaN(Number(rawAmount)) && Number(rawAmount) > 0
      ? Number(rawAmount)
      : 0

  return (
    <WalletClient
      initialToken={session.access_token}
      initialBalance={balance}
      initialFrozen={frozen}
      customerName={session.user.email?.split('@')[0] || 'Student'}
      customerEmail={session.user.email || ''}
      defaultAmount={defaultAmount}
      studentId={student?.id || ''}
    />
  )
}